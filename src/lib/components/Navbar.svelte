<script lang="ts" module>
  import { logEvent, logMermaidChartClick } from '$lib/util/stats';
  import { version } from 'mermaid/package.json';

  void logEvent('version', {
    mermaidVersion: version
  });
</script>

<script lang="ts">
  import { Button } from '$/components/ui/button';
  import { authStore } from '$/stores/auth';
  import MainMenu from '$/components/MainMenu.svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { Snippet } from 'svelte';
  import MermaidIcon from '~icons/custom/mermaid';

  interface Props {
    mobileToggle?: Snippet;
    children: Snippet;
  }

  let { children, mobileToggle }: Props = $props();

  const logout = async () => {
    authStore.logout();
    await goto(`${base}/login`, { replaceState: true });
  };
</script>

<nav class="z-50 flex p-4 sm:p-6">
  <div class="flex flex-1 items-center gap-2">
    <MainMenu />
    <MermaidIcon class="size-6" />
    <a href="/" class="whitespace-nowrap text-accent">
      {#if !mobileToggle}
        Mermaid
      {/if}
      Live Editor
    </a>
  </div>
  <div
    id="menu"
    class="hidden flex-nowrap items-center justify-between gap-3 overflow-hidden md:flex">
    {@render children()}
    {#if $authStore.isAuthenticated && $authStore.isWhitelisted}
      <div class="flex items-center gap-3 border-l border-border pl-3">
        <span class="max-w-[200px] truncate text-xs text-muted-foreground">
          {$authStore.user?.email}
        </span>
        <Button variant="outline" size="sm" onclick={logout}>Logout</Button>
      </div>
    {:else if $authStore.isAuthenticated && !$authStore.isWhitelisted}
      <div class="flex items-center gap-3 border-l border-border pl-3">
        <span class="max-w-[200px] truncate text-xs text-destructive">
          Access Denied
        </span>
        <Button variant="outline" size="sm" onclick={logout}>Logout</Button>
      </div>
    {/if}
  </div>
  {@render mobileToggle?.()}
</nav>
