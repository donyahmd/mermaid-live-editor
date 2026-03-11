<script lang="ts">
  import { Button } from '$/components/ui/button';
  import * as Dialog from '$/components/ui/dialog';
  import { Input } from '$/components/ui/input';
  import { aiConfigStore, defaultSystemPrompt, updateAIConfig } from '$/util/aiConfig';

  let { open = $bindable(false) }: { open: boolean } = $props();

  let apiEndpoint = $state('');
  let apiKey = $state('');
  let model = $state('');
  let systemPrompt = $state('');

  $effect(() => {
    if (open) {
      apiEndpoint = $aiConfigStore.apiEndpoint;
      apiKey = $aiConfigStore.apiKey;
      model = $aiConfigStore.model;
      systemPrompt = $aiConfigStore.systemPrompt;
    }
  });

  const handleSave = () => {
    updateAIConfig({
      apiEndpoint: apiEndpoint.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      systemPrompt: systemPrompt.trim() || defaultSystemPrompt
    });
    open = false;
  };

  const handleResetPrompt = () => {
    systemPrompt = defaultSystemPrompt;
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>AI Configuration</Dialog.Title>
      <Dialog.Description>
        Configure your OpenAI-compatible API endpoint for AI-powered diagram generation.
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-4 py-2">
      <div class="flex flex-col gap-1.5">
        <label for="ai-endpoint" class="text-sm font-medium text-foreground">API Endpoint</label>
        <Input
          id="ai-endpoint"
          type="url"
          bind:value={apiEndpoint}
          placeholder="https://api.openai.com/v1" />
        <p class="text-xs text-muted-foreground">
          Base URL for OpenAI-compatible API (e.g., https://api.openai.com/v1)
        </p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="ai-apikey" class="text-sm font-medium text-foreground">API Key</label>
        <Input
          id="ai-apikey"
          type="password"
          bind:value={apiKey}
          placeholder="sk-..." />
        <p class="text-xs text-muted-foreground">Your API key (stored locally in browser)</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="ai-model" class="text-sm font-medium text-foreground">Model</label>
        <Input id="ai-model" type="text" bind:value={model} placeholder="gpt-4o" />
        <p class="text-xs text-muted-foreground">
          Model name (e.g., gpt-4o, gpt-4o-mini, claude-3-sonnet, etc.)
        </p>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <label for="ai-system-prompt" class="text-sm font-medium text-foreground"
            >System Prompt</label>
          <button
            onclick={handleResetPrompt}
            class="text-xs text-muted-foreground hover:text-foreground">
            Reset to default
          </button>
        </div>
        <textarea
          id="ai-system-prompt"
          bind:value={systemPrompt}
          rows="8"
          class="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:ring-0 focus:outline-none"></textarea>
        <p class="text-xs text-muted-foreground">
          System prompt sent to the AI. Pre-configured for Mermaid v11.12.0.
        </p>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button variant="accent" onclick={handleSave}>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
