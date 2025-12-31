import * as Ably from 'ably';
import { getRoom, startGame } from '@/lib/room-state';
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

    const room = getRoom(roomCode);

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Verify host permission
    if (room.hostId !== playerId) {
      return NextResponse.json(
        { error: 'Not authorized - only host can start game' },
        { status: 403 }
      );
    }

    // Verify minimum players
    if (room.players.length < 3) {
      return NextResponse.json(
        { error: 'Need at least 3 players to start' },
        { status: 400 }
      );
    }

    // Start game using shared state module
    const updatedRoom = startGame(roomCode);

    if (!updatedRoom) {
      return NextResponse.json(
        { error: 'Failed to start game' },
        { status: 500 }
      );
    }

    // Publish to room-specific channel
    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get(`game-room:${roomCode}`);

    await channel.publish('gameStarted', updatedRoom);
    await channel.publish('roomUpdated', updatedRoom);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    );
  }
}
