import * as Ably from 'ably';

// Note: In production, use a database instead of in-memory storage
const rooms = new Map();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { roomCode, playerName, customization } = req.body;

    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get('game-room');

    const room = rooms.get(roomCode);

    if (!room) {
      await channel.publish('error', 'Room not found');
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.gameState !== 'lobby') {
      await channel.publish('error', 'Game already in progress');
      return res.status(400).json({ error: 'Game already in progress' });
    }

    if (room.players.length >= 10) {
      await channel.publish('error', 'Room is full');
      return res.status(400).json({ error: 'Room is full' });
    }

    const player = {
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: playerName,
      customization,
      isHost: false,
      isAlive: true,
      isImposter: false,
    };

    room.players.push(player);

    // Publish success response
    await channel.publish('roomJoined', {
      playerId: player.id,
      room
    });

    // Notify all players in the room
    await channel.publish('roomUpdated', room);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error joining room:', error);

    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get('game-room');

    await channel.publish('error', 'Failed to join room');

    res.status(500).json({ error: 'Failed to join room' });
  }
}