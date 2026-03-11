<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CloseIcon from '~icons/material-symbols/close-rounded';
  import SendIcon from '~icons/material-symbols/send-rounded';

  interface Props {
    show: boolean;
    input: string;
    onClose: () => void;
    onHeightChange?: (height: number) => void;
    onSend: (message: string) => void;
    isLoading?: boolean;
  }

  let { show, input = $bindable(), onClose, onHeightChange, onSend, isLoading = false }: Props = $props();

  let textarea = $state<HTMLTextAreaElement>();
  let container = $state<HTMLDivElement>();

  $effect(() => {
    if (!container || !onHeightChange) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target instanceof HTMLElement) {
          onHeightChange(entry.target.offsetHeight);
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  });

  function resizeTextarea() {
    if (!textarea) return;
    const computed = globalThis.getComputedStyle(textarea);
    const lineHeight =
      Number.parseFloat(computed.lineHeight) || Number.parseFloat(computed.fontSize) * 1.5 || 0;
    const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
    const minHeight = lineHeight + paddingTop + paddingBottom;
    const maxLines = 8;
    const maxHeight = lineHeight * maxLines + paddingTop + paddingBottom;

    textarea.style.height = 'auto';
    const nextHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  $effect(() => {
    if (input !== undefined) {
      resizeTextarea();
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (show && e.key === 'Escape') {
      onClose();
    }
  }

  function handleOutsideClick(e: MouseEvent) {
    if (show && container && e.target instanceof Node && !container.contains(e.target)) {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onmousedown={handleOutsideClick} />

{#if show}
  <div
    bind:this={container}
    class={cn(
      'button-container-for-animation relative z-50 mr-6 flex w-auto flex-col gap-2 rounded-xl border-2 border-border bg-background p-2 shadow-xl dark:border-border-dark dark:bg-secondary',
      !input.trim() && 'rainbow-border'
    )}
    role="dialog"
    aria-modal="true"
    tabindex="-1">
    <div class="relative flex min-h-2 items-start gap-1 px-1">
      <textarea
        bind:this={textarea}
        bind:value={input}
        onkeydown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) {
              onSend(input.trim());
            }
          }
        }}
        placeholder="Describe what to add or change"
        rows="1"
        disabled={isLoading}
        class="focus font-recursive min-h-0 flex-1 resize-none border-none bg-transparent px-1 text-sm font-normal text-foreground placeholder:text-muted-foreground focus:ring-0 focus:outline-none disabled:opacity-50 dark:text-foreground dark:placeholder:text-muted-foreground"
        style="height: 20px; overflow-y: hidden;"></textarea>
      <button onclick={onClose} class="text-muted-foreground hover:text-foreground">
        <CloseIcon class="size-4" />
      </button>
    </div>

    <div class="flex items-center justify-between">
      {#if isLoading}
        <span class="font-recursive text-xs font-normal text-muted-foreground">Generating...</span>
      {:else}
        <span class="font-recursive text-xs font-normal text-muted-foreground">AI inline edit</span>
      {/if}
      <button
        class="font-recursive flex h-6 w-6 items-center justify-center rounded-sm bg-accent p-1 text-white hover:bg-accent/90 active:bg-accent/80 disabled:opacity-50 dark:bg-accent dark:hover:bg-accent/90 dark:active:bg-accent/80"
        onclick={() => { if (input.trim()) onSend(input.trim()); }}
        disabled={!input.trim() || isLoading}>
        <SendIcon class="size-3.5" />
      </button>
    </div>
  </div>
{/if}

<style>
  @property --gradient-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }

  @keyframes gradient-angle-shift {
    0% {
      --gradient-angle: 0deg;
    }
    100% {
      --gradient-angle: 360deg;
    }
  }

  .button-container-for-animation {
    border-radius: 12px;
  }

  .button-container-for-animation::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 14px;
    padding: 2px;
    background: conic-gradient(
      from var(--gradient-angle, 0deg),
      color-mix(in srgb, var(--color-accent) 0%, transparent) 0%,
      color-mix(in srgb, var(--color-accent) 0%, transparent) 12%,
      color-mix(in srgb, var(--color-accent) 12%, transparent) 18%,
      color-mix(in srgb, var(--color-accent) 42%, transparent) 24%,
      color-mix(in srgb, var(--color-accent) 77%, transparent) 32%,
      rgba(93, 85, 212, 0.923) 41%,
      rgba(93, 85, 212, 0.5) 52%,
      color-mix(in srgb, var(--color-accent) 58%, transparent) 72%,
      color-mix(in srgb, var(--color-accent) 56%, transparent) 82%,
      color-mix(in srgb, var(--color-accent) 36%, transparent) 87%,
      color-mix(in srgb, var(--color-accent) 19%, transparent) 92%,
      color-mix(in srgb, var(--color-accent) 10%, transparent) 96%,
      color-mix(in srgb, var(--color-accent) 3%, transparent) 98%,
      color-mix(in srgb, var(--color-accent) 0%, transparent) 100%
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: exclude;
    pointer-events: none;
    z-index: 0;
    opacity: 0;
    transition: opacity 0.3s ease-out;
  }

  .button-container-for-animation.rainbow-border::before {
    opacity: 1;
    animation: gradient-angle-shift 2s linear infinite;
  }
</style>
