import * as Ably from 'ably';

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getRandomWord() {
  const words = [
    'sandwich', 'dispenser', 'sentry', 'medic', 'intel', 'payload',
    'rocket', 'capture', 'fortress', 'mercenary', 'teleporter', 'spy',
    'sniper', 'heavy', 'scout', 'engineer', 'pyro', 'demoman',
    'backstab', 'critical', 'headshot', 'ubercharge', 'respawn', 'domination'
  ];
  return words[Math.floor(Math.random() * words.length)];
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerName, customization } = req.body;

    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get('game-room');

    const roomCode = generateRoomCode();
    const player = {
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: playerName,
      customization,
      isHost: true,
      isAlive: true,
      isImposter: false,
    };

    const room = {
      roomCode,
      players: [player],
      hostId: player.id,
      gameState: 'lobby',
      currentTurn: 0,
      secretWord: null,
      roundCount: 0,
      votes: {},
      winner: null,
      gameHistory: [],
    };

    rooms.set(roomCode, room);

    // Publish success response
    await channel.publish('roomCreated', {
      playerId: player.id,
      room
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error creating room:', error);

    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get('game-room');

    await channel.publish('error', 'Failed to create room');

    res.status(500).json({ error: 'Failed to create room' });
  }
}