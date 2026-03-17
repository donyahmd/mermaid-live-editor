<script lang="ts">
  import { Button } from '$/components/ui/button';
  import { authStore } from '$/stores/auth';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  const logout = async () => {
    authStore.logout();
    await goto(`${base}/login`, { replaceState: true });
  };
</script>

<svelte:head>
  <title>Access Denied - Mermaid Live Editor</title>
</svelte:head>

<div class="flex h-full items-center justify-center px-4">
  <div class="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-sm">
    <h1 class="mb-2 text-2xl font-semibold text-destructive">Access denied</h1>
    <p class="mb-2 text-sm text-muted-foreground">
      Email akun Google Anda belum terdaftar pada whitelist aplikasi ini.
    </p>
    <p class="mb-6 text-xs text-muted-foreground">
      Hubungi admin untuk menambahkan email Anda ke <code>whitelist</code>.
    </p>

    <div class="flex gap-2">
      <Button class="flex-1" variant="outline" onclick={logout}>Logout</Button>
      <Button class="flex-1" href={`${base}/login`} variant="default">Kembali ke Login</Button>
    </div>
  </div>
</div>
