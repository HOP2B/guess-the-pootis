export interface Player {
  id: string;
  name: string;
  customization: {
    skin: string;
    face: string;
    hat: string;
  };
  isHost: boolean;
  isImposter?: boolean;
  isAlive: boolean;
  hasSpoken?: boolean;
}

export interface GameRoom {
  roomCode: string;
  players: Player[];
  hostId: string;
  gameState: 'lobby' | 'playing' | 'meeting' | 'voting' | 'gameOver';
  currentTurn: number;
  secretWord?: string;
  roundCount: number;
  votes: Record<string, string>; // playerId -> votedForPlayerId (or 'skip')
  winner?: 'imposters' | 'crew';
  gameHistory: string[];
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isMeeting?: boolean;
}

export const SKINS = [
  'Skin_black',
  'Skin_brown',
  'Skin_green',
  'Skin_peach',
  'Skin_white',
];

export const FACES = ['Face_1', 'Face_2', 'Face_3', 'Face_4', 'Face_5'];

export const HATS = ['Hat_1', 'Hat_2', 'Hat_3', 'Hat_4', 'Hat_5'];

export const SECRET_WORDS = [
  'sandwich', 'dispenser', 'sentry', 'medic', 'intel', 'payload',
  'rocket', 'capture', 'fortress', 'mercenary', 'teleporter', 'spy',
  'sniper', 'heavy', 'scout', 'engineer', 'pyro', 'demoman',
  'backstab', 'critical', 'headshot', 'ubercharge', 'respawn', 'domination'
];
