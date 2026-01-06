import * as Ably from 'ably';
import { removePlayer } from '@/lib/room-state';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { roomCode, playerId } = await request.json();

    if (!roomCode || !playerId) {
      return NextResponse.json(
        { error: 'Missing roomCode or playerId' },
        { status: 400 }
      );
    }

    // Remove player using shared state module
    const updatedRoom = removePlayer(roomCode, playerId);

    // Check if imposter left and crew should win
    if (updatedRoom) {
      const imposterLeft = updatedRoom.players.some(p => p.isImposter === true && p.id === playerId);
      if (imposterLeft) {
        updatedRoom.gameState = 'gameOver';
        updatedRoom.winner = 'crew';
      }
    }

    // Publish to room-specific channel (if room still exists)
    if (updatedRoom) {
      const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
      const channel = ably.channels.get(`game-room:${roomCode}`);
      await channel.publish('roomUpdated', updatedRoom);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error leaving room:', error);
    return NextResponse.json(
      { error: 'Failed to leave room' },
      { status: 500 }
    );
  }
}
