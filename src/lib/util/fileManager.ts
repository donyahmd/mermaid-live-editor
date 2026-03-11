import { get, writable } from 'svelte/store';
import { inputStateStore, updateCodeStore } from './state';
import { formatJSON } from './util';

export interface MermaidFile {
  name: string;
  updatedAt: string;
}

export const fileListStore = writable<MermaidFile[]>([]);
export const currentFileStore = writable<string | null>(null);
export const isFileLoadingStore = writable(false);

const API_BASE = '/api/files';

export const refreshFileList = async (): Promise<void> => {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Failed to fetch file list');
    const files: MermaidFile[] = await res.json();
    fileListStore.set(files);
  } catch (err) {
    console.error('Failed to refresh file list:', err);
    fileListStore.set([]);
  }
};

export const saveFile = async (filename?: string): Promise<string | null> => {
  const state = get(inputStateStore);
  const name = filename ?? get(currentFileStore);
  if (!name) return null;

  isFileLoadingStore.set(true);
  try {
    const body = JSON.stringify({
      code: state.code,
      config: state.mermaid
    });
    const res = await fetch(`${API_BASE}/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    if (!res.ok) throw new Error('Failed to save file');
    currentFileStore.set(name);
    await refreshFileList();
    return name;
  } catch (err) {
    console.error('Failed to save file:', err);
    return null;
  } finally {
    isFileLoadingStore.set(false);
  }
};

export const loadFile = async (filename: string): Promise<boolean> => {
  isFileLoadingStore.set(true);
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(filename)}`);
    if (!res.ok) throw new Error('Failed to load file');
    const data: { code: string; config?: string } = await res.json();
    updateCodeStore({
      code: data.code,
      mermaid: data.config ?? formatJSON({ theme: 'default' }),
      updateDiagram: true
    });
    currentFileStore.set(filename);
    return true;
  } catch (err) {
    console.error('Failed to load file:', err);
    return false;
  } finally {
    isFileLoadingStore.set(false);
  }
};

export const deleteFile = async (filename: string): Promise<boolean> => {
  isFileLoadingStore.set(true);
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete file');
    const current = get(currentFileStore);
    if (current === filename) {
      currentFileStore.set(null);
    }
    await refreshFileList();
    return true;
  } catch (err) {
    console.error('Failed to delete file:', err);
    return false;
  } finally {
    isFileLoadingStore.set(false);
  }
};

export const createNewFile = async (filename: string): Promise<string | null> => {
  const cleanName = filename.trim().replace(/\.mmd$/, '') + '.mmd';
  return saveFile(cleanName);
};
