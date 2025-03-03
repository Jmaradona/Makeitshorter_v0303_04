import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from 'firebase/auth';

interface UserState {
  user: User | null;
  isDarkMode: boolean;
  isOfflineMode: boolean;
  preferences: {
    style: string;
    formality: string;
    traits: string[];
    context: string;
    tone: string;
    length: string;
  };
  setUser: (user: User | null) => void;
  setPreferences: (preferences: Partial<UserState['preferences']>) => void;
  toggleDarkMode: () => void;
  toggleOfflineMode: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isDarkMode: false,
      isOfflineMode: false,
      preferences: {
        style: 'gen-z',
        formality: 'balanced',
        traits: ['Tech-savvy', 'Concise', 'Emoji-friendly 😊'],
        context: 'Tech Company',
        tone: 'professional',
        length: 'balanced'
      },
      setUser: (user) => set({ user }),
      setPreferences: (preferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...preferences }
        })),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      toggleOfflineMode: () => set((state) => ({ isOfflineMode: !state.isOfflineMode }))
    }),
    {
      name: 'user-storage'
    }
  )
);