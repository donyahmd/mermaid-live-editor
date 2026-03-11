<script lang="ts">
  import Card from '$/components/Card/Card.svelte';
  import { Button } from '$/components/ui/button';
  import { Separator } from '$/components/ui/separator';
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
  import ChevronRightIcon from '~icons/material-symbols/chevron-right-rounded';
  import CloseIcon from '~icons/material-symbols/close-rounded';
  import CodeIcon from '~icons/material-symbols/code-rounded';
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
  let expandedBlocks = $state(new Set<string>());

  const toggleBlock = (key: string) => {
    const next = new Set(expandedBlocks);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    expandedBlocks = next;
  };

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
    content: string,
    isStreaming = false
  ): Array<{ type: 'text' | 'mermaid' | 'mermaid-streaming'; content: string }> => {
    const parts: Array<{ type: 'text' | 'mermaid' | 'mermaid-streaming'; content: string }> = [];
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
      const remaining = content.slice(lastIndex);
      // During streaming, detect an open ```mermaid block that hasn't been closed yet
      if (isStreaming) {
        const openMatch = /```mermaid\n([\s\S]*)$/.exec(remaining);
        if (openMatch) {
          if (openMatch.index > 0) {
            parts.push({ type: 'text', content: remaining.slice(0, openMatch.index) });
          }
          parts.push({ type: 'mermaid-streaming', content: openMatch[1] });
          return parts.length > 0 ? parts : [{ type: 'text', content }];
        }
      }
      parts.push({ type: 'text', content: remaining });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content }];
  };
</script>

<Card title="AI Chat" isOpen isClosable={false}>
  {#snippet actions()}
    <div class="flex items-center gap-2">
      {#if $chatMessagesStore.length > 0}
        <Button size="icon" variant="ghost" onclick={() => clearChat()} title="Clear chat">
          <DeleteIcon />
        </Button>
      {/if}
      <Button size="icon" variant="ghost" onclick={() => (showConfig = true)} title="AI Settings">
        <GearIcon />
      </Button>
      <Button size="icon" variant="ghost" onclick={onClose} title="Close">
        <CloseIcon />
      </Button>
    </div>
  {/snippet}

  <div class="flex h-full flex-col overflow-hidden">
    <div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-2" id="aiChatList">
      {#if $chatMessagesStore.length === 0}
        <div class="m-2 flex h-full flex-col items-center justify-center gap-4 text-center">
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
        <ul class="flex h-full min-w-fit flex-col gap-2">
          {#each $chatMessagesStore as message, messageIdx}
            <li class="flex flex-col gap-2">
              {#if message.role === 'user'}
                <div class="flex justify-end">
                  <div
                    class="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm text-accent-foreground">
                    <p class="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              {:else if message.role === 'assistant'}
                {@const isLastMsg = messageIdx === $chatMessagesStore.length - 1}
                {@const isThisStreaming = isLastMsg && $isChatLoadingStore}
                <div class="flex justify-start">
                  <div
                    class="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">
                    {#each renderMessageContent(message.content, isThisStreaming) as part, partIdx}
                      {#if part.type === 'mermaid' || part.type === 'mermaid-streaming'}
                        {@const blockKey = `${messageIdx}-${partIdx}`}
                        {@const isExpanded = expandedBlocks.has(blockKey)}
                        {@const streaming = part.type === 'mermaid-streaming'}
                        {@const lineCount = part.content ? part.content.split('\n').length : 0}
                        <div class="my-1 overflow-hidden rounded-md border border-border bg-background text-xs">
                          <div class="flex items-center gap-1 px-2 py-1.5">
                            <button
                              onclick={() => toggleBlock(blockKey)}
                              class="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                              title={isExpanded ? 'Collapse code' : 'Expand code'}>
                              <ChevronRightIcon
                                class="size-3.5 transition-transform duration-150 {isExpanded ? 'rotate-90' : ''}" />
                              <CodeIcon class="size-3 {streaming ? 'text-muted-foreground' : 'text-accent'}" />
                              {#if streaming}
                                <span class="text-muted-foreground">
                                  {lineCount > 0 ? `${lineCount} line${lineCount !== 1 ? 's' : ''}` : 'mermaid'}
                                </span>
                              {:else}
                                <span>{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
                              {/if}
                            </button>
                            <span class="mx-1 text-border">·</span>
                            {#if streaming}
                              <div class="flex items-center gap-1">
                                <div class="typing-dot size-1.5"></div>
                                <div class="typing-dot delay-150 size-1.5"></div>
                                <div class="typing-dot delay-300 size-1.5"></div>
                              </div>
                              <span class="text-muted-foreground">Generating...</span>
                            {:else}
                              <CheckIcon class="size-3 text-green-600 dark:text-green-400" />
                              <span class="text-muted-foreground">Applied</span>
                              <button
                                onclick={() => handleApplyCode(part.content)}
                                class="ml-auto text-muted-foreground hover:text-foreground"
                                title="Re-apply this diagram">
                                Re-apply
                              </button>
                            {/if}
                          </div>
                          {#if isExpanded}
                            <div class="border-t border-border bg-muted/40 px-2.5 py-2">
                              <pre class="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">{part.content}</pre>
                            </div>
                          {/if}
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
              <Separator />
            </li>
          {/each}

          {#if $isChatLoadingStore && $chatMessagesStore[$chatMessagesStore.length - 1]?.content}
            <li class="px-3 py-1 text-xs text-muted-foreground">Generating...</li>
          {/if}
        </ul>
      {/if}
    </div>

    <div class="border-t border-border p-2">
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
</Card>

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
