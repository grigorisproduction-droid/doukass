/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vite/client" />

export {};

declare global {
  interface UpdateStatus {
    state: 'idle' | 'checking' | 'downloading' | 'ready' | 'none' | 'error' | 'disabled';
    version?: string;
    percent?: number;
    message?: string;
  }
  interface UpdateInfo {
    version: string;
    packaged: boolean;
    feedUrl: string;
    bundledFeedUrl: string;
    status: UpdateStatus;
  }

  interface Window {
    mwDB?: {
      kv?: {
        getSync: (key: string) => string | null;
        setSync: (key: string, value: string) => boolean;
        removeSync: (key: string) => boolean;
      };
      file?: {
        saveText: (suggestedName: string, text: string) => Promise<{ ok: boolean; canceled?: boolean; path?: string }>;
        openText: () => Promise<{ ok: boolean; canceled?: boolean; path?: string; text?: string }>;
        openReport: () => Promise<{ ok: boolean; canceled?: boolean; error?: string; path?: string; kind?: 'data' | 'html' | 'pdf-no-data'; text?: string; guess?: { mode: 'ORDER' | 'OFFER'; orderNum: string } | null }>;
      };
      report?: {
        getFolder: () => Promise<{ ok: boolean; canceled?: boolean; folder?: string | null }>;
        chooseFolder: () => Promise<{ ok: boolean; canceled?: boolean; folder?: string }>;
        clearFolder: () => Promise<{ ok: boolean }>;
        saveHtml: (filename: string, html: string, metadata?: any) => Promise<{ ok: boolean; canceled?: boolean; error?: string; path?: string; folder?: string | null }>;
        savePdf: (filename: string, html: string, metadata?: any) => Promise<{ ok: boolean; canceled?: boolean; error?: string; path?: string; folder?: string | null }>;

      };
      app?: {
        setDirty: (dirty: boolean) => void;
        closeNow: () => void;
        onSaveBeforeClose: (cb: () => void) => () => void;
      };
      update?: {
        getInfo: () => Promise<UpdateInfo>;
        setFeedUrl: (url: string) => Promise<{ ok: boolean; error?: string }>;
        check: () => Promise<UpdateStatus>;
        install: () => Promise<{ ok: boolean }>;
        onStatus: (cb: (status: UpdateStatus) => void) => () => void;
      };
    };
  }
}

export {};
