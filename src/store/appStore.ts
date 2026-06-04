import { create } from 'zustand';
import type { AppSettings } from '../types';

const STORAGE_KEY = 'poker-diary-settings';

const DEFAULT_MENU_ORDER = ['/bankroll', '/movements', '/', '/tournaments', '/reports', '/backing', '/goals', '/training', '/faq', '/equity'];

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { usdToRub: 90, eurToRub: 100, roomDisplayCurrency: {}, backerName: 'Бэккер', backerPercent: 50, backers: [{ id: 'default', name: 'Бэккер', percent: 50 }], themeMode: 'dark', locale: 'ru', menuOrder: DEFAULT_MENU_ORDER };
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface AppState {
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  settings: loadSettings(),
  setSettings: (newSettings) =>
    set((state) => {
      const updated = { ...state.settings, ...newSettings };
      saveSettings(updated);
      return { settings: updated };
    }),
}));

export { DEFAULT_MENU_ORDER };
