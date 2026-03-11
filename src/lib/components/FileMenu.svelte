<script lang="ts">
  import { Button } from '$/components/ui/button';
  import * as Dialog from '$/components/ui/dialog';
  import * as Popover from '$/components/ui/popover';
  import {
    createNewFile,
    currentFileStore,
    deleteFile,
    fileListStore,
    isFileLoadingStore,
    loadFile,
    refreshFileList,
    saveFile
  } from '$/util/fileManager';
  import { onMount } from 'svelte';
  import AddIcon from '~icons/material-symbols/add-rounded';
  import DeleteIcon from '~icons/material-symbols/delete-outline-rounded';
  import FileIcon from '~icons/material-symbols/description-outline-rounded';
  import FolderIcon from '~icons/material-symbols/folder-open-outline-rounded';
  import SaveIcon from '~icons/material-symbols/save-outline-rounded';

  let menuOpen = $state(false);
  let showNewDialog = $state(false);
  let showDeleteDialog = $state(false);
  let newFileName = $state('');
  let fileToDelete = $state('');

  onMount(() => {
    refreshFileList();
  });

  const handleSave = async () => {
    if ($currentFileStore) {
      await saveFile();
    } else {
      showNewDialog = true;
      menuOpen = false;
    }
  };

  const handleSaveAs = () => {
    showNewDialog = true;
    menuOpen = false;
  };

  const handleCreateAndSave = async () => {
    const name = newFileName.trim();
    if (!name) return;
    await createNewFile(name);
    showNewDialog = false;
    newFileName = '';
  };

  const handleLoad = async (filename: string) => {
    await loadFile(filename);
    menuOpen = false;
  };

  const handleDeleteConfirm = async () => {
    if (fileToDelete) {
      await deleteFile(fileToDelete);
      showDeleteDialog = false;
      fileToDelete = '';
    }
  };

  const promptDelete = (filename: string) => {
    fileToDelete = filename;
    showDeleteDialog = true;
  };
</script>

<Popover.Root bind:open={menuOpen}>
  <Popover.Trigger class="flex items-center gap-0">
    <Button variant="ghost" size="sm" class="gap-1.5" title="File Manager">
      <FolderIcon class="size-4" />
      {#if $currentFileStore}
        <span class="max-w-[120px] truncate text-xs">{$currentFileStore}</span>
      {:else}
        <span class="text-xs">Files</span>
      {/if}
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-72 p-0" align="end">
    <div class="flex flex-col">
      <!-- Actions -->
      <div class="flex items-center gap-1 border-b border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          class="h-8 flex-1 gap-1 text-xs"
          disabled={$isFileLoadingStore}
          onclick={handleSave}>
          <SaveIcon class="size-3.5" />
          Save{$currentFileStore ? '' : ' as...'}
        </Button>
        {#if $currentFileStore}
          <Button
            variant="ghost"
            size="sm"
            class="h-8 gap-1 text-xs"
            disabled={$isFileLoadingStore}
            onclick={handleSaveAs}>
            Save as...
          </Button>
        {/if}
        <Button
          variant="ghost"
          size="sm"
          class="h-8 gap-1 text-xs"
          disabled={$isFileLoadingStore}
          onclick={() => {
            showNewDialog = true;
            menuOpen = false;
          }}>
          <AddIcon class="size-3.5" />
          New
        </Button>
      </div>

      <!-- File list -->
      <div class="max-h-60 overflow-y-auto">
        {#if $fileListStore.length === 0}
          <div class="px-3 py-4 text-center text-xs text-muted-foreground">No saved files yet</div>
        {:else}
          {#each $fileListStore as file}
            <div
              class="group flex items-center gap-2 px-2 py-1.5 hover:bg-muted {$currentFileStore ===
              file.name
                ? 'bg-accent/10'
                : ''}">
              <button
                class="flex min-w-0 flex-1 items-center gap-2 text-left"
                onclick={() => handleLoad(file.name)}
                disabled={$isFileLoadingStore}>
                <FileIcon class="size-3.5 shrink-0 text-muted-foreground" />
                <div class="min-w-0 flex-1">
                  <div class="truncate text-xs font-medium">{file.name}</div>
                  <div class="text-[10px] text-muted-foreground">
                    {new Date(file.updatedAt).toLocaleString()}
                  </div>
                </div>
              </button>
              <button
                class="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                onclick={() => promptDelete(file.name)}
                title="Delete file">
                <DeleteIcon class="size-3.5" />
              </button>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </Popover.Content>
</Popover.Root>

<!-- New file dialog -->
<Dialog.Root bind:open={showNewDialog}>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title>Save as new file</Dialog.Title>
      <Dialog.Description>Enter a name for your diagram file.</Dialog.Description>
    </Dialog.Header>
    <div class="py-2">
      <div class="flex items-center gap-2">
        <input
          type="text"
          class="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          placeholder="my-diagram"
          bind:value={newFileName}
          onkeydown={(e) => {
            if (e.key === 'Enter') handleCreateAndSave();
          }} />
        <span class="text-sm text-muted-foreground">.mmd</span>
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="ghost" size="sm" onclick={() => (showNewDialog = false)}>Cancel</Button>
      <Button
        variant="accent"
        size="sm"
        disabled={!newFileName.trim() || $isFileLoadingStore}
        onclick={handleCreateAndSave}>
        Save
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete confirmation dialog -->
<Dialog.Root bind:open={showDeleteDialog}>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title>Delete file</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete <strong>{fileToDelete}</strong>? This cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="ghost" size="sm" onclick={() => (showDeleteDialog = false)}>Cancel</Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={$isFileLoadingStore}
        onclick={handleDeleteConfirm}>
        Delete
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
