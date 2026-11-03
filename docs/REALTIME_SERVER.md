# CHECKMATE real-time game server

The real-time MVP uses Socket.IO and validates every move on the server with `chess.js`. The browser never decides whether a move is legal.

## Local setup

1. Configure the dedicated CHECKMATE Firebase Web App in `.env`.
2. Add `FIREBASE_PROJECT_ID`, `CLIENT_ORIGIN`, and (if needed) `GOOGLE_APPLICATION_CREDENTIALS` to the root `.env` file. The server loads root `.env` using dotenv; Vite only exposes variables prefixed with `VITE_` to browser code.
3. Configure Google Application Default Credentials for the CHECKMATE Firebase project. Never commit a service-account JSON file.
4. Start both processes:

```bash
npm install
npm run dev:all
```

The Vite app runs at `http://localhost:5173`; the realtime server runs at `http://localhost:4000`. The server health endpoint is `/health`.

## Events

- `queue:join` / `queue:leave`: queue for a supported time control.
- `match:found`: private room assignment and player color.
- `private:create` / `private:join`: create and join a code-protected two-player game.
- `game:move`: submit a move; server validates turn, coordinates, and chess legality.
- `game:state`: authoritative FEN, PGN, turn, check status, and remaining clocks.
- `game:offer-draw`, `game:accept-draw`, `game:decline-draw`.
- `game:resign`.
- `game:reconnect`: rejoin an active game during a 60-second disconnect grace period.

Every socket connection must present a Firebase ID token. The server verifies it with the Firebase Admin SDK. Only the two assigned player UIDs may act in a game room; spectator joining is not implemented.

## Current MVP limitations

- Matchmaking queues and game sessions are held in server memory. A server restart loses active sessions and queues.
- Reconnection is supported only while the same server process retains the game room.
- The 60-second disconnect grace period pauses the clocks. If no player reconnects before it expires, the disconnected side forfeits; if both disconnect, the game is recorded as a draw in the live event.
- Game records are not yet persisted to Firestore.
- Production deployment should add Redis-backed Socket.IO adapters/queues, durable game storage, observability, abuse throttling, and load testing before public launch.
