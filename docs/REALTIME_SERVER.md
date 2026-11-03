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
- `call:join`, `call:signal`, `call:leave`: private WebRTC signaling for the two active players only.
- `GET /ice-servers`: authenticated short-lived TURN credentials.
- `POST /tournaments/:id/register`: verified-email registration with an atomic capacity check.
- `DELETE /tournaments/:id/register`: withdraw before the event starts.
- `POST /tournaments/:id/close`: organizer-only registration closure.

Every socket connection must present a Firebase ID token with a verified email claim. The server verifies it with the Firebase Admin SDK. Only the two assigned player UIDs may act in a game room; spectator joining is not implemented. The server owns move validation and clock accounting, including increments and timeout outcomes. Completed games and provisional Elo updates are written atomically to Firestore; participants can read only their own game records.

Tournament registration uses Firebase Admin transactions on the realtime server. The participant subcollection is read-only to browser clients, preventing direct writes that could bypass capacity enforcement. The API verifies Firebase ID tokens and requires a verified email address.

## Current MVP limitations

- Matchmaking queues and game sessions are held in server memory. A server restart loses active sessions and queues.
- Reconnection is supported only while the same server process retains the game room.
- Private invite codes expire after ten minutes.
- The 60-second disconnect grace period pauses the clocks. If no player reconnects before it expires, the disconnected side forfeits; if both disconnect, the game is recorded as a draw in the live event.
- Active game rooms and matchmaking queues are held in server memory. A server restart loses in-progress games, even though completed records remain in Firestore.
- Production deployment should add Redis-backed Socket.IO adapters/queues, durable active-game recovery, observability, abuse throttling, and load testing before public launch.


## Private player voice/video

- The browser asks for microphone/camera permission only after a player explicitly starts a voice or video call.
- The server accepts call membership and signaling only from the two UIDs assigned to the active game. Spectators have no join or signaling event.
- Calls use WebRTC peer-to-peer media. No recording or media storage is implemented.
- STUN is used by default. For reliable production connectivity, configure a TURN service.
- Set `TURN_URL` and `TURN_SHARED_SECRET` only in the server environment. The server issues short-lived HMAC-SHA1 TURN credentials after verifying the player's Firebase ID token; do not expose the shared secret in any `VITE_*` variable.
- Browser microphone/camera access requires HTTPS in production (localhost is allowed for development). Production TURN infrastructure and network testing are required before launch.
