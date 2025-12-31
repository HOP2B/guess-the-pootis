import * as Ably from 'ably';
import { createRoom } from '@/lib/room-state';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { playerName, customization } = await request.json();

    // Generate unique player ID
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Create room using shared state module
    const room = createRoom({
      id: playerId,
      name: playerName,
      customization,
    });

    // Publish to room-specific channel
    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get(`game-room:${room.roomCode}`);

    await channel.publish('roomCreated', {
      playerId,
      room
    });

    // Return the data in HTTP response so client knows roomCode
    return NextResponse.json({
      success: true,
      playerId,
      room
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}
