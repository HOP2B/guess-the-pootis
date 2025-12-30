import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function defaultSocketUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

export const getSocket = (): Socket => {
  if (!socket) {
    const url = defaultSocketUrl();
    console.log('Creating socket connection to:', url);
    socket = io(url, {
      autoConnect: false,
      transports: ['polling', 'websocket'], // Try polling first, fallback to websocket
      upgrade: true,
    });
    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  }
  return socket;
};

export const connectSocket = () => {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};
