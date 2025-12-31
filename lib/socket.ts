import * as Ably from 'ably';

let client: Ably.Realtime | null = null;
const channels = new Map<string, Ably.RealtimeChannel>();

function getAblyClient(): Ably.Realtime {
  if (!client) {
    const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_ABLY_API_KEY is not set');
    }
    console.log('Creating Ably connection');
    client = new Ably.Realtime({
      key: apiKey,
      autoConnect: false,
    });

    client.connection.on('connected', () => {
      console.log('Ably connected');
    });
    client.connection.on('failed', (error) => {
      console.error('Ably connection failed:', error);
    });
    client.connection.on('disconnected', () => {
      console.log('Ably disconnected');
    });
  }
  return client;
}

/**
 * Get a room-specific channel
 * @param roomCode - The room code to get the channel for
 */
export const getChannel = (roomCode: string): Ably.RealtimeChannel => {
  const channelName = `game-room:${roomCode}`;

  if (!channels.has(channelName)) {
    const client = getAblyClient();
    channels.set(channelName, client.channels.get(channelName));
  }

  return channels.get(channelName)!;
};

/**
 * Get the global channel (deprecated - use getChannel with roomCode)
 */
export const getGlobalChannel = (): Ably.RealtimeChannel => {
  const client = getAblyClient();
  return client.channels.get('game-room');
};

/**
 * Connect the Ably client
 */
export const connectSocket = () => {
  const client = getAblyClient();
  if (client.connection.state !== 'connected') {
    client.connect();
  }
};

/**
 * Disconnect and clean up all channels
 */
export const disconnectSocket = () => {
  if (client) {
    client.close();
    client = null;
    channels.clear();
  }
};

/**
 * Enter presence for a room
 * @param roomCode - The room code
 * @param playerData - Player data to attach to presence
 */
export const enterPresence = async (
  roomCode: string,
  playerData: { playerId: string; playerName: string }
): Promise<void> => {
  const channel = getChannel(roomCode);
  await channel.presence.enter(playerData);
  console.log('Entered presence for room:', roomCode);
};

/**
 * Leave presence for a room
 * @param roomCode - The room code
 */
export const leavePresence = async (roomCode: string): Promise<void> => {
  const channel = getChannel(roomCode);
  await channel.presence.leave();
  console.log('Left presence for room:', roomCode);
};
