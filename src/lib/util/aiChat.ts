import { get, writable } from 'svelte/store';
import { getAIConfig } from './aiConfig';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const CHAT_STORAGE_PREFIX = 'aiChatMessages';
let currentChatScopeKey = '';

const getChatScopeKey = (): string => {
  if (typeof window === 'undefined') {
    return `${CHAT_STORAGE_PREFIX}:server`;
  }

  const signature = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `${CHAT_STORAGE_PREFIX}:${encodeURIComponent(signature)}`;
};

const loadPersistedChatMessages = (key = getChatScopeKey()): ChatMessage[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is ChatMessage =>
        typeof item === 'object' &&
        item !== null &&
        'role' in item &&
        'content' in item &&
        (item.role === 'user' || item.role === 'assistant' || item.role === 'system') &&
        typeof item.content === 'string'
    );
  } catch {
    return [];
  }
};

export const chatMessagesStore = writable<ChatMessage[]>(loadPersistedChatMessages());
export const isChatLoadingStore = writable(false);

const syncChatScopeFromLocation = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextKey = getChatScopeKey();
  if (nextKey === currentChatScopeKey) {
    return;
  }

  currentChatScopeKey = nextKey;
  chatMessagesStore.set(loadPersistedChatMessages(nextKey));
};

if (typeof window !== 'undefined') {
  currentChatScopeKey = getChatScopeKey();

  chatMessagesStore.subscribe((messages: ChatMessage[]) => {
    const key = currentChatScopeKey || getChatScopeKey();

    try {
      if (messages.length === 0) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(messages));
      }
    } catch {
      // Ignore storage errors (quota/private mode)
    }
  });

  window.addEventListener('hashchange', syncChatScopeFromLocation);
  window.addEventListener('popstate', syncChatScopeFromLocation);
}

export const clearChat = (): void => {
  syncChatScopeFromLocation();
  chatMessagesStore.set([]);
};

export const extractMermaidCode = (text: string): string | null => {
  const match = /```mermaid\n([\s\S]*?)```/.exec(text);
  return match?.[1]?.trim() ?? null;
};

export const sendMessage = async (
  userMessage: string,
  currentCode?: string,
  onCodeGenerated?: (code: string) => void
): Promise<void> => {
  syncChatScopeFromLocation();
  const config = getAIConfig();

  if (!config.apiKey) {
    chatMessagesStore.update((msgs: ChatMessage[]) => [
      ...msgs,
      { role: 'user', content: userMessage },
      {
        role: 'assistant',
        content:
          '⚠️ API key is not configured. Please open AI Settings (gear icon) and set your OpenAI-compatible API key.'
      }
    ]);
    return;
  }

  chatMessagesStore.update((msgs: ChatMessage[]) => [...msgs, { role: 'user', content: userMessage }]);
  isChatLoadingStore.set(true);

  const messages: ChatMessage[] = [{ role: 'system', content: config.systemPrompt }];

  if (currentCode?.trim()) {
    messages.push({
      role: 'system',
      content: `The user's current Mermaid diagram code is:\n\`\`\`mermaid\n${currentCode}\n\`\`\``
    });
  }

  // Include conversation history
  const history = get(chatMessagesStore);
  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add placeholder for assistant response
  chatMessagesStore.update((msgs: ChatMessage[]) => [...msgs, { role: 'assistant', content: '' }]);

  const endpoint = config.apiEndpoint.replace(/\/+$/, '');
  const url = `${endpoint}/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;
      try {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed.error?.message || parsed.message || errorBody;
      } catch {
        errorMessage = errorBody;
      }
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            chatMessagesStore.update((msgs: ChatMessage[]) => {
              const updated = [...msgs];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg?.role === 'assistant') {
                updated[updated.length - 1] = { ...lastMsg, content: fullContent };
              }
              return updated;
            });
          }
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }

    // If streaming produced no content, try non-streaming fallback
    if (!fullContent) {
      const fallbackResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false
        })
      });

      if (fallbackResponse.ok) {
        const json = await fallbackResponse.json();
        fullContent = json.choices?.[0]?.message?.content ?? '';
        chatMessagesStore.update((msgs: ChatMessage[]) => {
          const updated = [...msgs];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg?.role === 'assistant') {
            updated[updated.length - 1] = { ...lastMsg, content: fullContent };
          }
          return updated;
        });
      }
    }

    // Auto-apply mermaid code from the response
    if (fullContent && onCodeGenerated) {
      const mermaidCode = extractMermaidCode(fullContent);
      if (mermaidCode) {
        onCodeGenerated(mermaidCode);
      }
    }

    // If still empty, show error
    if (!fullContent) {
      chatMessagesStore.update((msgs: ChatMessage[]) => {
        const updated = [...msgs];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg?.role === 'assistant') {
          updated[updated.length - 1] = {
            ...lastMsg,
            content: '⚠️ Received an empty response from the API. Please check your configuration.'
          };
        }
        return updated;
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    chatMessagesStore.update((msgs: ChatMessage[]) => {
      const updated = [...msgs];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg?.role === 'assistant') {
        updated[updated.length - 1] = {
          ...lastMsg,
          content: `⚠️ Error: ${errorMessage}`
        };
      }
      return updated;
    });
  } finally {
    isChatLoadingStore.set(false);
  }
};
