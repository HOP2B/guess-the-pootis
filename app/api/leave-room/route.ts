import * as Ably from 'ably';
import { handlePlayerLeft } from '@/lib/room-state';
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

    // Handle player leaving using the new function
    const updatedRoom = handlePlayerLeft(roomCode, playerId);

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
