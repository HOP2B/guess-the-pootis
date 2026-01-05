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
  selectedWordPack: string;
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

export const WORD_PACKS = {
  'TF2 Pack': [
    'sandwich', 'dispenser', 'sentry', 'medic', 'intel', 'payload',
    'rocket', 'capture', 'fortress', 'mercenary', 'teleporter', 'spy',
    'sniper', 'heavy', 'scout', 'engineer', 'pyro', 'demoman',
    'backstab', 'critical', 'headshot', 'ubercharge', 'respawn', 'domination'
  ],
  'General Objects': [
    'computer', 'telephone', 'book', 'chair', 'table', 'window',
    'door', 'lamp', 'clock', 'mirror', 'bottle', 'cup',
    'plate', 'fork', 'spoon', 'knife', 'car', 'bicycle'
  ],
  'Animals': [
    'dog', 'cat', 'bird', 'fish', 'elephant', 'lion',
    'tiger', 'bear', 'wolf', 'fox', 'rabbit', 'mouse',
    'horse', 'cow', 'pig', 'sheep', 'duck', 'chicken'
  ],
  'Food': [
    'pizza', 'hamburger', 'pasta', 'rice', 'bread', 'cheese',
    'apple', 'banana', 'orange', 'grape', 'strawberry', 'tomato',
    'potato', 'carrot', 'lettuce', 'chicken', 'beef', 'fish'
  ],
  'Abstract Concepts': [
    'love', 'happiness', 'freedom', 'justice', 'peace', 'war',
    'time', 'space', 'dream', 'reality', 'truth', 'lie',
    'beauty', 'ugliness', 'good', 'evil', 'light', 'darkness'
  ]
};

export const SECRET_WORDS = WORD_PACKS['TF2 Pack']; // Keep for backward compatibility
