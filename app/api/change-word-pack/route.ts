import * as Ably from 'ably';
import { getRoom } from '@/lib/room-state';
import { WORD_PACKS } from '@/lib/types';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { roomCode, playerId, wordPack } = await request.json();

    if (!roomCode || !playerId || !wordPack) {
      return NextResponse.json(
        { error: 'Missing roomCode, playerId, or wordPack' },
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
        { error: 'Not authorized - only host can change word pack' },
        { status: 403 }
      );
    }

    // Verify word pack exists
    if (!WORD_PACKS[wordPack as keyof typeof WORD_PACKS]) {
      return NextResponse.json(
        { error: 'Invalid word pack' },
        { status: 400 }
      );
    }

    // Update word pack
    room.selectedWordPack = wordPack;

    // Publish to room-specific channel
    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get(`game-room:${roomCode}`);

    await channel.publish('roomUpdated', room);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error changing word pack:', error);
    return NextResponse.json(
      { error: 'Failed to change word pack' },
      { status: 500 }
    );
  }
}