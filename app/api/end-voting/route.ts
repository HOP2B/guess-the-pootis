import * as Ably from 'ably';
import { getRoom, endVotingPhase } from '@/lib/room-state';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { roomCode } = await request.json();

    if (!roomCode) {
      return NextResponse.json(
        { error: 'Missing roomCode' },
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

    // Force end voting phase
    const result = endVotingPhase(roomCode);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to end voting phase' },
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
    console.error('Error ending voting phase:', error);
    return NextResponse.json(
      { error: 'Failed to end voting phase' },
      { status: 500 }
    );
  }
}