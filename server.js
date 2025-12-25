const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const socketPort = 3001;

// Game server state
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getRandomWord() {
  const words = [
  'pogo', 'zeppelin', 'glitch', 'cactus', 'marble', 'pickle', 'vortex', 'lantern', 'mushroom',
  'tornado', 'whistle', 'banjo', 'bubble', 'quartz', 'sprocket', 'jelly', 'accordion', 'satellite',
  'toaster', 'igloo', 'blizzard', 'crystal', 'zeppelin', 'accordion', 'goblin', 'yo-yo', 'pickle',
  'slingshot', 'tulip', 'wiggle', 'cobweb', 'parrot', 'drumstick', 'zeppelin', 'monkey', 'zeppelin',
  'tapestry', 'flamingo', 'meerkat', 'octopus', 'zeppelin', 'zeppelin', 'pogo', 'zeppelin'
];

  return words[Math.floor(Math.random() * words.length)];
}

function selectImposter(players) {
  const randomIndex = Math.floor(Math.random() * players.length);
  return randomIndex;
}

// --- LLM helper (GROQ-compatible) ---
const GROQ_API_URL = process.env.GROQ_API_URL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function callLLMForStatement({ role, players, secretWord }) {
  // If no GROQ key/url configured, return null to let heuristics run
  if (!GROQ_API_URL || !GROQ_API_KEY) return null;

  try {
    const prompt = `You are a short-form social-deduction gamer. Produce a single short sentence (<= 30 words) appropriate for the role. If role is crewmate, you may hint about the secret word without stating it exactly. If role is imposter, be evasive and subtly deflect suspicion.\nRole: ${role}\nPlayers: ${players.join(', ')}${secretWord && role === 'crewmate' ? `\nSecret word (do NOT say it verbatim): ${secretWord}` : ''}\nRespond with a single sentence only.`;

    const resp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({ prompt, max_tokens: 60, temperature: 0.8 }),
    const { createServer } = require('http');
    const { parse } = require('url');
    const next = require('next');
    const { Server } = require('socket.io');

    const dev = process.env.NODE_ENV !== 'production';
    const hostname = 'localhost';
    const port = 3000;
    const socketPort = 3001;

    // Game server state
    const rooms = new Map();

    function generateRoomCode() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    }

    function getRandomWord() {
      const words = [
        'sandwich', 'dispenser', 'sentry', 'medic', 'intel', 'payload',
        'rocket', 'capture', 'fortress', 'mercenary', 'teleporter', 'spy',
        'sniper', 'heavy', 'scout', 'engineer', 'pyro', 'demoman',
        'backstab', 'critical', 'headshot', 'ubercharge', 'respawn', 'domination'
      ];
      return words[Math.floor(Math.random() * words.length)];
    }

    function selectImposter(players) {
      const randomIndex = Math.floor(Math.random() * players.length);
      return randomIndex;
    }

    // Initialize Next.js
    const app = next({ dev, hostname, port });
    const handle = app.getRequestHandler();

    app.prepare().then(() => {
      // Create HTTP server for Next.js
      const httpServer = createServer(async (req, res) => {
        try {
          const parsedUrl = parse(req.url, true);
          await handle(req, res, parsedUrl);
        } catch (err) {
          console.error('Error occurred handling', req.url, err);
          res.statusCode = 500;
          res.end('internal server error');
        }
      });

      httpServer.listen(port, (err) => {
        if (err) throw err;
        console.log(`> Next.js ready on http://${hostname}:${port}`);
      });

      // Create separate HTTP server for Socket.io
      const socketServer = createServer();
      const io = new Server(socketServer, {
        cors: {
          origin: `http://${hostname}:${port}`,
          methods: ['GET', 'POST'],
        },
      });

      io.on('connection', (socket) => {
        console.log('Player connected:', socket.id);

        socket.on('createRoom', ({ playerName, customization }) => {
          const roomCode = generateRoomCode();
          const player = {
            id: socket.id,
            name: playerName,
            customization,
            isHost: true,
            isAlive: true,
            isImposter: false,
          };

          const room = {
            roomCode,
            players: [player],
            hostId: socket.id,
            gameState: 'lobby',
            currentTurn: 0,
            secretWord: null,
            roundCount: 0,
            votes: {},
            winner: null,
            gameHistory: [],
          };

          rooms.set(roomCode, room);
          socket.join(roomCode);
          socket.emit('roomCreated', { roomCode, playerId: socket.id, room });
        });

        socket.on('joinRoom', ({ roomCode, playerName, customization }) => {
          const room = rooms.get(roomCode);

          if (!room) {
            socket.emit('error', 'Room not found');
            return;
          }

          if (room.gameState !== 'lobby') {
            socket.emit('error', 'Game already in progress');
            return;
          }

          if (room.players.length >= 10) {
            socket.emit('error', 'Room is full');
            return;
          }

          const player = {
            id: socket.id,
            name: playerName,
            customization,
            isHost: false,
            isAlive: true,
            isImposter: false,
          };

          room.players.push(player);
          socket.join(roomCode);
          socket.emit('roomJoined', { playerId: socket.id, room });
          io.to(roomCode).emit('roomUpdated', room);
        });

        socket.on('startGame', ({ roomCode }) => {
          const room = rooms.get(roomCode);

          if (!room || room.hostId !== socket.id) {
            socket.emit('error', 'Not authorized');
            return;
          }

          if (room.players.length < 3) {
            socket.emit('error', 'Need at least 3 players');
            return;
          }

          // Select imposter
          const imposterIndex = selectImposter(room.players);
          room.players.forEach((player, idx) => {
            player.isImposter = idx === imposterIndex;
            player.isAlive = true;
            player.hasSpoken = false;
          });

          room.secretWord = getRandomWord();
          room.gameState = 'playing';
          room.currentTurn = 0;
          room.roundCount = 1;
          room.votes = {};
          room.gameHistory = [];

          io.to(roomCode).emit('gameStarted', room);
          io.to(roomCode).emit('roomUpdated', room);
        });

        socket.on('submitStatement', ({ roomCode, statement }) => {
          const room = rooms.get(roomCode);

          if (!room) return;

          const playerIndex = room.players.findIndex((p) => p.id === socket.id);
          if (playerIndex === -1 || playerIndex !== room.currentTurn) return;

          const player = room.players[playerIndex];
          player.hasSpoken = true;

          // Broadcast chat message
          const message = {
            playerId: socket.id,
            playerName: player.name,
            message: statement,
            timestamp: Date.now(),
            isMeeting: false,
          };
          io.to(roomCode).emit('chatMessage', message);

          // Move to next turn
          let nextTurn = (room.currentTurn + 1) % room.players.length;
      
          // Skip dead players
          let attempts = 0;
          while (!room.players[nextTurn].isAlive && attempts < room.players.length) {
            nextTurn = (nextTurn + 1) % room.players.length;
            attempts++;
          }

          room.currentTurn = nextTurn;

          // Check if it's time for a meeting (every 3 rounds)
          if (room.roundCount % 3 === 0 && nextTurn === 0) {
            room.gameState = 'meeting';
            setTimeout(() => {
              room.gameState = 'voting';
              room.votes = {};
              io.to(roomCode).emit('roomUpdated', room);
            }, 15000); // 15 seconds for discussion
          } else {
            if (nextTurn === 0) {
              room.roundCount++;
            }
          }

          io.to(roomCode).emit('roomUpdated', room);
        });

        socket.on('vote', ({ roomCode, votedPlayerId }) => {
          const room = rooms.get(roomCode);

          if (!room || room.gameState !== 'voting') return;

          const voter = room.players.find((p) => p.id === socket.id);
          if (!voter || !voter.isAlive) return;

          room.votes[socket.id] = votedPlayerId;

          // Check if all alive players have voted
          const alivePlayers = room.players.filter((p) => p.isAlive);
          const votedCount = Object.keys(room.votes).length;

          if (votedCount === alivePlayers.length) {
            // Count votes
            const voteCounts = {};
            Object.values(room.votes).forEach((vote) => {
              if (vote !== 'skip') {
                voteCounts[vote] = (voteCounts[vote] || 0) + 1;
              }
            });

            // Find player with most votes
            let maxVotes = 0;
            let eliminatedPlayerId = null;
            Object.entries(voteCounts).forEach(([playerId, count]) => {
              if (count > maxVotes) {
                maxVotes = count;
                eliminatedPlayerId = playerId;
              }
            });

            if (eliminatedPlayerId) {
              const eliminatedPlayer = room.players.find((p) => p.id === eliminatedPlayerId);
              if (eliminatedPlayer) {
                eliminatedPlayer.isAlive = false;

                // Check win conditions
                if (eliminatedPlayer.isImposter) {
                  room.gameState = 'gameOver';
                  room.winner = 'crew';
                  io.to(roomCode).emit('gameOver', room);
                  return;
                }

                // Check if only imposter is left
                const aliveNonImposters = room.players.filter((p) => p.isAlive && !p.isImposter);
                if (aliveNonImposters.length === 0) {
                  room.gameState = 'gameOver';
                  room.winner = 'imposters';
                  io.to(roomCode).emit('gameOver', room);
                  return;
                }
              }
            }

            // Continue game
            room.gameState = 'playing';
            room.votes = {};
        
            // Find next alive player
            let nextTurn = 0;
            while (!room.players[nextTurn].isAlive) {
              nextTurn = (nextTurn + 1) % room.players.length;
            }
            room.currentTurn = nextTurn;
            room.roundCount++;
          }

          io.to(roomCode).emit('roomUpdated', room);
        });

        socket.on('guessWord', ({ roomCode, guess }) => {
          const room = rooms.get(roomCode);

          if (!room) return;

          const guesser = room.players.find((p) => p.id === socket.id);
          if (!guesser || !guesser.isImposter || !guesser.isAlive) return;

          if (guess.toLowerCase() === room.secretWord?.toLowerCase()) {
            room.gameState = 'gameOver';
            room.winner = 'imposters';
            io.to(roomCode).emit('gameOver', room);
          } else {
            // Wrong guess - imposter is revealed and loses
            guesser.isAlive = false;
            room.gameState = 'gameOver';
            room.winner = 'crew';
            io.to(roomCode).emit('gameOver', room);
          }
        });

        socket.on('leaveRoom', ({ roomCode }) => {
          const room = rooms.get(roomCode);
          if (!room) return;

          const playerIndex = room.players.findIndex((p) => p.id === socket.id);
          if (playerIndex === -1) return;

          room.players.splice(playerIndex, 1);

          if (room.players.length === 0) {
            rooms.delete(roomCode);
          } else {
            // If host left, assign new host
            if (room.hostId === socket.id && room.players.length > 0) {
              room.hostId = room.players[0].id;
              room.players[0].isHost = true;
            }
            io.to(roomCode).emit('roomUpdated', room);
          }

          socket.leave(roomCode);
        });

        socket.on('disconnect', () => {
          console.log('Player disconnected:', socket.id);
      
          // Remove player from all rooms
          rooms.forEach((room, roomCode) => {
            const playerIndex = room.players.findIndex((p) => p.id === socket.id);
            if (playerIndex !== -1) {
              room.players.splice(playerIndex, 1);

              if (room.players.length === 0) {
                rooms.delete(roomCode);
              } else {
                if (room.hostId === socket.id && room.players.length > 0) {
                  room.hostId = room.players[0].id;
                  room.players[0].isHost = true;
                }
                io.to(roomCode).emit('roomUpdated', room);
              }
            }
          });
        });
      });

      socketServer.listen(socketPort, () => {
        console.log(`> Socket.io server ready on http://${hostname}:${socketPort}`);
      });
    });
      }
    });

    socket.on('submitStatement', ({ roomCode, statement }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      handlePlayerStatement(room, socket.id, statement).catch((err) => console.error(err));
    });

    socket.on('vote', ({ roomCode, votedPlayerId }) => {
      const room = rooms.get(roomCode);

      if (!room || room.gameState !== 'voting') return;

      const voter = room.players.find((p) => p.id === socket.id);
      if (!voter || !voter.isAlive) return;

      room.votes[socket.id] = votedPlayerId;

      // Check if all alive players have voted
      const alivePlayers = room.players.filter((p) => p.isAlive);
      const votedCount = Object.keys(room.votes).length;

      if (votedCount === alivePlayers.length) {
        // Count votes
        const voteCounts = {};
        Object.values(room.votes).forEach((vote) => {
          if (vote !== 'skip') {
            voteCounts[vote] = (voteCounts[vote] || 0) + 1;
          }
        });

        // Find player with most votes
        let maxVotes = 0;
        let eliminatedPlayerId = null;
        Object.entries(voteCounts).forEach(([playerId, count]) => {
          if (count > maxVotes) {
            maxVotes = count;
            eliminatedPlayerId = playerId;
          }
        });

        if (eliminatedPlayerId) {
          const eliminatedPlayer = room.players.find((p) => p.id === eliminatedPlayerId);
          if (eliminatedPlayer) {
            eliminatedPlayer.isAlive = false;

            // Check win conditions
            if (eliminatedPlayer.isImposter) {
              room.gameState = 'gameOver';
              room.winner = 'crew';
              io.to(roomCode).emit('gameOver', room);
              return;
            }

            // Check if only imposter is left
            const aliveNonImposters = room.players.filter((p) => p.isAlive && !p.isImposter);
            if (aliveNonImposters.length === 0) {
              room.gameState = 'gameOver';
              room.winner = 'imposters';
              io.to(roomCode).emit('gameOver', room);
              return;
            }
          }
        }

        // Continue game
        room.gameState = 'playing';
        room.votes = {};
        
        // Find next alive player
        let nextTurn = 0;
        while (!room.players[nextTurn].isAlive) {
          nextTurn = (nextTurn + 1) % room.players.length;
        }
        room.currentTurn = nextTurn;
        room.roundCount++;
      }

      io.to(roomCode).emit('roomUpdated', room);
    });

    socket.on('guessWord', ({ roomCode, guess }) => {
      const room = rooms.get(roomCode);

      if (!room) return;

      const guesser = room.players.find((p) => p.id === socket.id);
      if (!guesser || !guesser.isImposter || !guesser.isAlive) return;

      if (guess.toLowerCase() === room.secretWord?.toLowerCase()) {
        room.gameState = 'gameOver';
        room.winner = 'imposters';
        io.to(roomCode).emit('gameOver', room);
      } else {
        // Wrong guess - imposter is revealed and loses
        guesser.isAlive = false;
        room.gameState = 'gameOver';
        room.winner = 'crew';
        io.to(roomCode).emit('gameOver', room);
      }
    });

    socket.on('leaveRoom', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex === -1) return;

      room.players.splice(playerIndex, 1);

      if (room.players.length === 0) {
        rooms.delete(roomCode);
      } else {
        // If host left, assign new host
        if (room.hostId === socket.id && room.players.length > 0) {
          room.hostId = room.players[0].id;
          room.players[0].isHost = true;
        }
        io.to(roomCode).emit('roomUpdated', room);
      }

      socket.leave(roomCode);
    });

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      
      // Remove player from all rooms
      rooms.forEach((room, roomCode) => {
        const playerIndex = room.players.findIndex((p) => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);

          if (room.players.length === 0) {
            rooms.delete(roomCode);
          } else {
            if (room.hostId === socket.id && room.players.length > 0) {
              room.hostId = room.players[0].id;
              room.players[0].isHost = true;
            }
            io.to(roomCode).emit('roomUpdated', room);
          }
        }
      });
    });
  });

  socketServer.listen(socketPort, () => {
    console.log(`> Socket.io server ready on http://${hostname}:${socketPort}`);
  });
});
