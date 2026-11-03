# CHECKMATE ♞

**The game, reimagined.** A chess platform for competitive play, learning, community, and analysis.

## Current build

### Application foundation
- React + TypeScript + Vite.
- Graphite/jade dark theme and matching light appearance.
- Interactive local chessboard powered by `chess.js`.
- Local computer opponent with three lightweight alpha-beta search levels (not Stockfish).
- Legal move highlighting, selectable pawn promotion, move history, undo, restart, and board flip.
- Five selectable time controls with active player clocks and increment support.
- Ten board palettes and ten independently selectable piece appearances, including marble.
- Persistent light/dark/system appearance, board and piece preferences, sound preference, and reduced-motion control at `/settings`.
- Interactive mate-in-one tactics trainer with hints and a locally saved solved count at `/puzzles`.
- Opening explorer with ten replayable opening lines and fundamentals lessons at `/learn`.
- Community tournament creation and player registration at `/tournaments` (pairings and automated rounds are not yet implemented).
- Responsive navigation and mobile layout.

### Account foundation
- Firebase email/password registration and sign-in.
- Email verification email on registration.
- Google sign-in.
- Password reset email.
- Firebase-managed sessions.
- Owner-restricted Firestore player profile documents.
- Account screen at `/auth`.
- Dedicated setup guide: [docs/AUTHENTICATION_SETUP.md](docs/AUTHENTICATION_SETUP.md).
- Social model and limitations: [docs/SOCIAL.md](docs/SOCIAL.md).

### Real-time multiplayer MVP
- Socket.IO server with Firebase Admin ID-token verification.
- Time-control matchmaking and private invitation codes.
- Server-authoritative chess move validation, FEN/PGN snapshots, clocks, increments, and timeout decisions.
- Draw offers, draw acceptance, resignation, private invite codes, and a 60-second reconnect grace period.
- Verified-email gate for online play.
- Opt-in, two-player-only WebRTC voice/video calls; media is off until the player starts a call, and no recording is implemented.
- Completed games are saved to Firestore; only the two participants can read each record.
- Friend requests, friendships, conversations, and messages are protected by Firestore membership rules.
- Dedicated setup and protocol guide: [docs/REALTIME_SERVER.md](docs/REALTIME_SERVER.md).

Authentication and realtime server code are wired but remain unavailable until a **separate CHECKMATE Firebase project** and server-side credentials are configured. No AgriSence credentials or databases are used. The multiplayer MVP currently stores active games and queues in server memory; it is not yet horizontally scalable or durable.

## Run locally

```bash
npm install
cp .env.example .env
# Add the CHECKMATE Firebase Web App values to .env
npm run dev
```

Run the frontend and realtime server together:

```bash
npm run dev:all
```

## Production build

```bash
npm run build
npm run preview
```

GitHub Actions runs the TypeScript/Vite production build on pushes and pull requests to `main`.

## Roadmap

1. Foundation, CI, and independent authentication.
2. Player profiles, settings, onboarding, and account security.
3. Complete local chess experience, clocks, promotion, and board customization.
4. Real-time multiplayer game sessions and matchmaking.
5. Friends, messaging, and private player-to-player voice/video.
6. Ratings, game history, leaderboards, and tournaments.
7. Puzzles, learning academy, and opening explorer.
8. Stockfish analysis and post-game review.
9. Fair-play systems, moderation, accessibility, and production hardening.

## Security and product principles

- CHECKMATE uses its **own Firebase project, credentials, and user data**. AgriSence production credentials and databases must never be reused.
- Client-side Firebase configuration is not a security boundary; Firestore rules enforce profile ownership.
- Rated live games will not permit engine assistance.
- In-game calls are limited to the two active players; spectators cannot join private calls.
- Audio/video are off by default, permissions are explicit, and recording is off by default.
- The core experience launches free; premium functionality can be added later.
