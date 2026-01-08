import * as Ably from 'ably';

let client: Ably.Realtime | null = null;
const channels = new Map<string, Ably.RealtimeChannel>();
const presenceListeners = new Map<string, (presenceMessage: Ably.PresenceMessage) => void>();

function getAblyClient(): Ably.Realtime {
  if (!client) {
    throw new Error('Ably client not initialized. Call connectSocket first.');
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
export const connectSocket = (clientId: string) => {
  if (!client) {
    const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_ABLY_API_KEY is not set');
    }
    console.log('Creating Ably connection');
    client = new Ably.Realtime({
      key: apiKey,
      clientId,
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
    presenceListeners.clear();
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

/**
 * Monitor presence changes for a room and call callback when players leave
 * @param roomCode - The room code to monitor
 * @param onPlayerLeft - Callback function when a player leaves
 */
export const monitorPresence = (roomCode: string, onPlayerLeft: (playerId: string) => void): void => {
  const channel = getChannel(roomCode);
  
  // Remove existing listener if any
  const existingListener = presenceListeners.get(roomCode);
  if (existingListener) {
    channel.presence.unsubscribe('leave', existingListener);
  }
  
  // Set up new listener
  const listener = (presenceMessage: Ably.PresenceMessage) => {
    if (presenceMessage.action === 'leave' && presenceMessage.clientId) {
      console.log(`Player left room ${roomCode}:`, presenceMessage.clientId);
      onPlayerLeft(presenceMessage.clientId);
    }
  };
  
  channel.presence.subscribe('leave', listener);
  presenceListeners.set(roomCode, listener);
  
  console.log(`Started monitoring presence for room: ${roomCode}`);
};

/**
 * Stop monitoring presence for a room
 * @param roomCode - The room code to stop monitoring
 */
export const stopMonitoringPresence = (roomCode: string): void => {
  const channel = getChannel(roomCode);
  const listener = presenceListeners.get(roomCode);
  
  if (listener) {
    channel.presence.unsubscribe('leave', listener);
    presenceListeners.delete(roomCode);
    console.log(`Stopped monitoring presence for room: ${roomCode}`);
  }
};
