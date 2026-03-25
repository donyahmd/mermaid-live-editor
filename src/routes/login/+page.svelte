<script lang="ts">
  import { Button } from '$/components/ui/button';
  import { authStore } from '$/stores/auth';
  import { env } from '$/util/env';
  import { notify } from '$/util/notify';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  interface GoogleCredentialResponse {
    credential?: string;
  }

  interface GoogleAccountsIdApi {
    initialize: (config: {
      callback: (response: GoogleCredentialResponse) => void;
      client_id: string;
    }) => void;
    renderButton: (
      parent: HTMLElement,
      options: {
        shape?: 'pill' | 'rectangular';
        size?: 'large' | 'medium' | 'small';
        text?: 'signin_with' | 'continue_with' | 'signup_with';
        theme?: 'filled_black' | 'filled_blue' | 'outline';
        type?: 'icon' | 'standard';
        width?: string;
      }
    ) => void;
  }

  interface GoogleGlobal {
    accounts: {
      id: GoogleAccountsIdApi;
    };
  }

  let googleButtonContainer: HTMLDivElement | null = null;
  let isInitializing = $state(true);

  const getReturnTo = (): string => {
    const returnTo = get(page).url.searchParams.get('returnTo');
    if (!returnTo) {
      return `${base}/edit`;
    }

    if (!returnTo.startsWith('/')) {
      return `${base}/edit`;
    }

    return `${base}${returnTo}`;
  };

  const handleLoginSuccess = async (credential: string) => {
    const result = await authStore.loginWithGoogleCredential(credential);

    if (!result.success) {
      notify('Gagal membaca data login Google. Silakan coba lagi.');
      return;
    }

    if (!result.whitelisted) {
      await goto(`${base}/access-denied`, { replaceState: true });
      return;
    }

    await goto(getReturnTo(), { replaceState: true });
  };

  const initializeGoogleLogin = () => {
    if (!env.googleClientId) {
      isInitializing = false;
      notify('GOOGLE_CLIENT_ID belum dikonfigurasi.');
      return;
    }

    const googleWindow = window as Window & { google?: GoogleGlobal };

    if (!googleButtonContainer || !googleWindow.google?.accounts?.id) {
      isInitializing = false;
      notify('Google Identity Services tidak tersedia.');
      return;
    }

    googleWindow.google.accounts.id.initialize({
      callback: (response: GoogleCredentialResponse) => {
        if (!response.credential) {
          notify('Credential Google tidak ditemukan.');
          return;
        }
        void handleLoginSuccess(response.credential);
      },
      client_id: env.googleClientId
    });

    googleButtonContainer.innerHTML = '';
    googleWindow.google.accounts.id.renderButton(googleButtonContainer, {
      shape: 'pill',
      size: 'large',
      text: 'signin_with',
      theme: 'outline',
      type: 'standard',
      width: '280'
    });

    isInitializing = false;
  };

  const waitForGoogleApi = (attempt = 0) => {
    const googleWindow = window as Window & { google?: GoogleGlobal };

    if (googleWindow.google?.accounts?.id) {
      initializeGoogleLogin();
      return;
    }

    if (attempt > 40) {
      isInitializing = false;
      notify('Gagal memuat Google Identity Services.');
      return;
    }

    window.setTimeout(() => {
      waitForGoogleApi(attempt + 1);
    }, 100);
  };

  onMount(async () => {
    authStore.hydrate();
    authStore.refreshWhitelist();

    const currentAuth = get(authStore);
    if (currentAuth.isAuthenticated && currentAuth.isWhitelisted) {
      await goto(getReturnTo(), { replaceState: true });
      return;
    }

    waitForGoogleApi();
  });
</script>

<svelte:head>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <title>Login - Mermaid Live Editor</title>
</svelte:head>

<div class="flex h-full items-center justify-center px-4">
  <div class="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-sm">
    <h1 class="mb-2 text-2xl font-semibold">Login diperlukan</h1>
    <p class="mb-6 text-sm text-muted-foreground">
      Silakan login menggunakan Google untuk mengakses Mermaid canvas editor.
    </p>

    <div class="flex min-h-12 items-center justify-center" bind:this={googleButtonContainer}></div>

    {#if isInitializing}
      <p class="mt-4 text-center text-xs text-muted-foreground">Menyiapkan Google Login...</p>
    {/if}

    <div class="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
      Hanya email yang terdaftar di whitelist yang bisa mengakses aplikasi.
    </div>

    <div class="mt-4">
      <Button href={`${base}/`} variant="ghost" class="w-full">Kembali ke halaman utama</Button>
    </div>
  </div>
</div>
