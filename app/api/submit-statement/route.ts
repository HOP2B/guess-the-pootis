import * as Ably from 'ably';
import { getRoom, submitStatement, startVoting } from '@/lib/room-state';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { roomCode, playerId, statement } = await request.json();

    if (!roomCode || !playerId) {
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

    // Verify it's the player's turn
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1 || playerIndex !== room.currentTurn) {
      return NextResponse.json(
        { error: 'Not your turn' },
        { status: 403 }
      );
    }

    const player = room.players[playerIndex];
    if (!player.isAlive) {
      return NextResponse.json(
        { error: 'You are not alive' },
        { status: 403 }
      );
    }

    // Submit statement using shared state module
    const result = submitStatement(roomCode, playerId, statement);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to submit statement' },
        { status: 500 }
      );
    }

    const { room: updatedRoom, triggerVoting } = result;

    // Publish to room-specific channel
    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channel = ably.channels.get(`game-room:${roomCode}`);

    // Broadcast chat message
    const message = {
      playerId,
      playerName: player.name,
      message: statement,
      timestamp: Date.now(),
      isMeeting: false,
    };
    await channel.publish('chatMessage', message);

    // Notify room update
    await channel.publish('roomUpdated', updatedRoom);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting statement:', error);
    return NextResponse.json(
      { error: 'Failed to submit statement' },
      { status: 500 }
    );
  }
}
