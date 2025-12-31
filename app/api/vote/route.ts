import * as Ably from 'ably';
import { getRoom, vote } from '@/lib/room-state';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { roomCode, playerId, votedPlayerId } = await request.json();

    if (!roomCode || !playerId || !votedPlayerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    if (room.gameState !== 'voting') {
      return NextResponse.json(
        { error: 'Not in voting phase' },
        { status: 400 }
      );
    }

    const voter = room.players.find((p) => p.id === playerId);
    if (!voter || !voter.isAlive) {
      return NextResponse.json(
        { error: 'You cannot vote' },
        { status: 403 }
      );
    }

    // Submit vote using shared state module
    const result = vote(roomCode, playerId, votedPlayerId);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to submit vote' },
        { status: 500 }
      );
    }

    const { room: updatedRoom, isGameOver } = result;

    // Publish to room-specific channel
    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get(`game-room:${roomCode}`);

    await channel.publish('roomUpdated', updatedRoom);

    if (isGameOver) {
      await channel.publish('gameOver', updatedRoom);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting vote:', error);
    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    );
  }
}
