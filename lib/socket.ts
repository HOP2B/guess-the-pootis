import * as Ably from 'ably';

let client: Ably.Realtime | null = null;
let channel: Ably.RealtimeChannel | null = null;

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

export const getChannel = (): Ably.RealtimeChannel => {
  if (!channel) {
    const client = getAblyClient();
    // Use a single channel for all game events
    channel = client.channels.get('game-room');
  }
  return channel;
};

export const connectSocket = () => {
  const client = getAblyClient();
  if (client.connection.state !== 'connected') {
    client.connect();
  }
  return getChannel();
};

export const disconnectSocket = () => {
  if (client) {
    client.close();
    client = null;
    channel = null;
  }
};
