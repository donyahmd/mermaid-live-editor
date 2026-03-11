<script lang="ts">
  import { Button } from '$/components/ui/button';
  import {
    chatMessagesStore,
    clearChat,
    isChatLoadingStore,
    sendMessage
  } from '$/util/aiChat';
  import { aiConfigStore } from '$/util/aiConfig';
  import { stateStore, updateCode } from '$/util/state';
  import { onMount } from 'svelte';
  import CheckIcon from '~icons/material-symbols/check-rounded';
  import CloseIcon from '~icons/material-symbols/close-rounded';
  import DeleteIcon from '~icons/material-symbols/delete-outline-rounded';
  import GearIcon from '~icons/material-symbols/settings-outline-rounded';
  import SendIcon from '~icons/material-symbols/send-rounded';
  import AIConfigDialog from './AIConfigDialog.svelte';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();
  let input = $state('');
  let messagesContainer: HTMLDivElement | undefined = $state();
  let textarea: HTMLTextAreaElement | undefined = $state();
  let showConfig = $state(false);
  let autoApplied = $state(false);

  const scrollToBottom = () => {
    if (messagesContainer) {
      requestAnimationFrame(() => {
        messagesContainer!.scrollTop = messagesContainer!.scrollHeight;
      });
    }
  };

  $effect(() => {
    if ($chatMessagesStore.length > 0) {
      scrollToBottom();
    }
  });

  const handleSend = async () => {
    const message = input.trim();
    if (!message || $isChatLoadingStore) return;
    input = '';
    autoApplied = false;
    resizeTextarea();
    const currentCode = $stateStore.editorMode === 'code' ? $stateStore.code : undefined;
    await sendMessage(message, currentCode, (code) => {
      updateCode(code, { updateDiagram: true });
      autoApplied = true;
      setTimeout(() => (autoApplied = false), 3000);
    });
  };

  const handleApplyCode = (code: string) => {
    updateCode(code, { updateDiagram: true });
  };

  const handleSuggestion = (suggestion: string) => {
    input = suggestion;
    textarea?.focus();
  };

  const resizeTextarea = () => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 120;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  $effect(() => {
    if (input !== undefined) {
      resizeTextarea();
    }
  });

  onMount(() => {
    textarea?.focus();
  });

  const suggestions = [
    'Create a flowchart for a login process',
    'Generate a sequence diagram for REST API',
    'Make an ER diagram for a blog system',
    'Create a Gantt chart for a project plan'
  ];

  const renderMessageContent = (
    content: string
  ): Array<{ type: 'text' | 'mermaid'; content: string }> => {
    const parts: Array<{ type: 'text' | 'mermaid'; content: string }> = [];
    const regex = /```mermaid\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'mermaid', content: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }];
  };
</script>

<div class="flex h-full flex-col overflow-hidden bg-background">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border px-3 py-2">
    <span class="text-sm font-semibold text-foreground">AI Chat</span>
    <div class="flex items-center gap-1">
      {#if $chatMessagesStore.length > 0}
        <button
          onclick={() => clearChat()}
          class="rounded p-1 text-muted-foreground hover:text-foreground"
          title="Clear chat">
          <DeleteIcon class="size-4" />
        </button>
      {/if}
      <button
        onclick={() => (showConfig = true)}
        class="rounded p-1 text-muted-foreground hover:text-foreground"
        title="AI Settings">
        <GearIcon class="size-4" />
      </button>
      <button
        onclick={onClose}
        class="rounded p-1 text-muted-foreground hover:text-foreground"
        title="Close">
        <CloseIcon class="size-4" />
      </button>
    </div>
  </div>

  <!-- Messages -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-3">
    {#if $chatMessagesStore.length === 0}
      <!-- Empty state -->
      <div class="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div class="text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            class="mx-auto mb-2 size-10">
            <path
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
          <p class="text-sm font-medium">AI Mermaid Assistant</p>
          <p class="mt-1 text-xs">Ask me to create or modify Mermaid diagrams</p>
        </div>
        {#if !$aiConfigStore.apiKey}
          <button
            onclick={() => (showConfig = true)}
            class="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-accent hover:text-accent">
            Configure API key to get started
          </button>
        {:else}
          <div class="flex w-full flex-col gap-2">
            {#each suggestions as suggestion}
              <button
                onclick={() => handleSuggestion(suggestion)}
                class="rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground">
                {suggestion}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <!-- Messages list -->
      <div class="flex flex-col gap-3">
        {#each $chatMessagesStore as message}
          {#if message.role === 'user'}
            <div class="flex justify-end">
              <div
                class="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm text-accent-foreground">
                <p class="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          {:else if message.role === 'assistant'}
            <div class="flex justify-start">
              <div
                class="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">
                {#each renderMessageContent(message.content) as part}
                  {#if part.type === 'mermaid'}
                    <div class="my-1 flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs">
                      <CheckIcon class="size-3 text-green-600 dark:text-green-400" />
                      <span class="text-muted-foreground">Diagram applied to editor</span>
                      <button
                        onclick={() => handleApplyCode(part.content)}
                        class="ml-auto text-muted-foreground hover:text-foreground"
                        title="Re-apply this diagram">
                        Re-apply
                      </button>
                    </div>
                  {:else}
                    <p class="whitespace-pre-wrap">{part.content}</p>
                  {/if}
                {/each}
                {#if !message.content && $isChatLoadingStore}
                  <div class="flex items-center gap-1.5">
                    <div class="typing-dot"></div>
                    <div class="typing-dot delay-150"></div>
                    <div class="typing-dot delay-300"></div>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        {/each}

        {#if $isChatLoadingStore && $chatMessagesStore[$chatMessagesStore.length - 1]?.content}
          <div class="flex justify-start">
            <div class="px-3 py-1 text-xs text-muted-foreground">Generating...</div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Input area -->
  <div class="border-t border-border p-3">
    <div class="flex items-end gap-2">
      <textarea
        bind:this={textarea}
        bind:value={input}
        onkeydown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Ask about Mermaid diagrams..."
        rows="1"
        disabled={$isChatLoadingStore}
        class="min-h-[36px] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-0 focus:outline-none disabled:opacity-50"></textarea>
      <Button
        size="sm"
        variant="accent"
        class="h-9 w-9 shrink-0 p-0"
        disabled={!input.trim() || $isChatLoadingStore}
        onclick={handleSend}>
        <SendIcon class="size-4" />
      </Button>
    </div>
  </div>
</div>

<AIConfigDialog bind:open={showConfig} />

<style>
  .typing-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.4;
    animation: typing 1.4s infinite ease-in-out both;
  }

  .delay-150 {
    animation-delay: 0.15s;
  }

  .delay-300 {
    animation-delay: 0.3s;
  }

  @keyframes typing {
    0%,
    80%,
    100% {
      opacity: 0.4;
      transform: scale(0.8);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
