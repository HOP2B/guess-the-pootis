import { create } from 'zustand';
import { Player, GameRoom, ChatMessage } from './types';

interface GameState {
  // Player state
  playerId: string | null;
  playerName: string;
  playerCustomization: {
    skin: string;
    face: string;
    hat: string;
  };
  
  // Room state
  currentRoom: GameRoom | null;
  chatMessages: ChatMessage[];
  
  // UI state
  currentView: 'menu' | 'lobby' | 'game';
  
  // Actions
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setPlayerCustomization: (customization: Partial<GameState['playerCustomization']>) => void;
  setCurrentRoom: (room: GameRoom | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  setCurrentView: (view: GameState['currentView']) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Initial state
  playerId: null,
  playerName: '',
  playerCustomization: {
    skin: 'Skin_peach',
    face: 'Face_1',
    hat: 'Hat_1',
  },
  currentRoom: null,
  chatMessages: [],
  currentView: 'menu',
  
  // Actions
  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setPlayerCustomization: (customization) =>
    set((state) => ({
      playerCustomization: { ...state.playerCustomization, ...customization },
    })),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  setCurrentView: (view) => set({ currentView: view }),
  resetGame: () =>
    set({
      currentRoom: null,
      chatMessages: [],
      currentView: 'menu',
    }),
}));
