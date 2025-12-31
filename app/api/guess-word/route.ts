import * as Ably from 'ably';
import { getRoom, guessWord } from '@/lib/room-state';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { roomCode, playerId, guess } = await request.json();

    if (!roomCode || !playerId || !guess) {
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

    const guesser = room.players.find((p) => p.id === playerId);
    if (!guesser || !guesser.isImposter || !guesser.isAlive) {
      return NextResponse.json(
        { error: 'Only alive imposters can guess' },
        { status: 403 }
      );
    }

    // Submit guess using shared state module
    const result = guessWord(roomCode, playerId, guess);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to submit guess' },
        { status: 500 }
      );
    }

    const { room: updatedRoom } = result;

    // Publish to room-specific channel
    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get(`game-room:${roomCode}`);

    await channel.publish('gameOver', updatedRoom);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error guessing word:', error);
    return NextResponse.json(
      { error: 'Failed to submit guess' },
      { status: 500 }
    );
  }
}
