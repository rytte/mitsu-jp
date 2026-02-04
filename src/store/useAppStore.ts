import { create } from 'zustand';
import { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../db/constants';

type AppState = {
  ready: boolean;
  settings: Settings;
  setReady: (ready: boolean) => void;
  setSettings: (settings: Settings) => void;
};

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  setReady: (ready) => set({ ready }),
  setSettings: (settings) => set({ settings }),
}));
