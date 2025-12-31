import * as Ably from 'ably';
import { getRoom, addPlayer } from '@/lib/room-state';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { roomCode, playerName, customization } = await request.json();

    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get(`game-room:${roomCode}`);

    const room = getRoom(roomCode);

    if (!room) {
      await channel.publish('error', 'Room not found');
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    if (room.gameState !== 'lobby') {
      await channel.publish('error', 'Game already in progress');
      return NextResponse.json(
        { error: 'Game already in progress' },
        { status: 400 }
      );
    }

    if (room.players.length >= 10) {
      await channel.publish('error', 'Room is full');
      return NextResponse.json(
        { error: 'Room is full' },
        { status: 400 }
      );
    }

    // Generate unique player ID
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Add player using shared state module
    const updatedRoom = addPlayer(roomCode, {
      id: playerId,
      name: playerName,
      customization,
    });

    if (!updatedRoom) {
      await channel.publish('error', 'Failed to join room');
      return NextResponse.json(
        { error: 'Failed to join room' },
        { status: 500 }
      );
    }

    // Publish success response
    await channel.publish('roomJoined', {
      playerId,
      room: updatedRoom
    });

    // Notify all players in the room
    await channel.publish('roomUpdated', updatedRoom);

    // Return the data in HTTP response
    return NextResponse.json({
      success: true,
      playerId,
      room: updatedRoom
    });
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json(
      { error: 'Failed to join room' },
      { status: 500 }
    );
  }
}
