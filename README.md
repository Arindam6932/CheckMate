# CHECKMATE ♞

**The game, reimagined.** A chess platform for competitive play, learning, community, and analysis.

## Current implementation

### Chess experience
- React + TypeScript + Vite application with a graphite/jade design system.
- Dark, light, and system appearance; persistent preferences and reduced-motion control.
- Interactive local chessboard powered by `chess.js`.
- Legal move highlighting, pawn promotion, move history, undo, restart, and board flip.
- Five local time controls with clocks and increment support.
- Local computer opponent with three lightweight alpha-beta search levels (not Stockfish).
- Ten board palettes and ten independently selectable piece styles, including marble.
- Interactive mate-in-one tactics trainer at `/puzzles`.
- Ten replayable opening lines and fundamentals lessons at `/learn`.
- Settings at `/settings`, with account-synced preferences in Firestore and custom background uploads in Firebase Storage.
- Automatic queen promotion and high-contrast board accessibility settings.

### Accounts and social
- Firebase email/password registration and sign-in, email verification, Google sign-in, and password reset.
- Private player profiles and minimal public player cards.
- Editable display name and account profile at `/profile`.
- Friend requests by shareable Player ID, friend list, and member-only one-to-one text messaging at `/community`.
- Completed online game history, interactive replay, and PGN copy at `/history`.

### Online play and competition
- Socket.IO matchmaking and private invitation codes.
- Firebase Admin ID-token verification and verified-email gate for online play.
- Server-authoritative chess move validation, FEN/PGN snapshots, clocks, increments, and timeout decisions.
- Draw offers, resignation, and a 60-second disconnect grace period.
- Opt-in two-player-only WebRTC voice/video calls; audio/video stay off until a player starts a call, and no recording is implemented.
- Completed games are persisted to Firestore; only the two participants can read each record.
- Provisional Elo ratings (K=32), player statistics, and rapid/blitz/classical leaderboards at `/leaderboard`.
- Community tournament creation and registration at `/tournaments`.

## Known MVP limitations

- Authentication, account-synced settings, and online play require a dedicated CHECKMATE Firebase project. Custom backgrounds additionally require the project's Firebase Storage bucket and deployed Storage rules. Online play requires server-side Firebase Admin credentials. AgriSence credentials and databases are never reused.
- Active online games and matchmaking queues are held in server memory; server restarts lose in-progress games.
- Tournament capacity is informational; hard caps, pairings, standings, automated rounds, and result adjudication are not implemented yet.
- The Elo model is provisional; no Glicko-2, anti-cheat review, seasonal resets, or rated/casual split yet. All online matches currently affect ratings.
- The computer opponent is a lightweight local search engine, not Stockfish. Engine analysis and post-game review are still planned.
- Spectator mode, clubs, attachments, moderation tools, admin dashboard, and premium subscriptions are not implemented yet.
- WebRTC uses STUN by default. Production calls require a TURN service, HTTPS, network testing, and monitoring.
- No production browser test or deployment has been completed in this build environment.

## Run locally

```bash
npm install
cp .env.example .env
# Add the CHECKMATE Firebase Web App values and server settings to .env
npm run dev:all
```

The Vite app runs at `http://localhost:5173`; the realtime server runs at `http://localhost:4000`. For the realtime server, configure Google Application Default Credentials or `GOOGLE_APPLICATION_CREDENTIALS` for the CHECKMATE Firebase project. See [docs/AUTHENTICATION_SETUP.md](docs/AUTHENTICATION_SETUP.md) and [docs/REALTIME_SERVER.md](docs/REALTIME_SERVER.md).

## Production build

```bash
npm run build
npm run preview
```

GitHub Actions runs the TypeScript/Vite and realtime-server type checks on pushes and pull requests to `main`.

## Architecture and security documentation

- [Authentication and Firebase setup](docs/AUTHENTICATION_SETUP.md)
- [Realtime server and private calls](docs/REALTIME_SERVER.md)
- [Social and messaging rules](docs/SOCIAL.md)
- [Provisional rating model](docs/RATINGS.md)

## Product principles

- CHECKMATE uses its **own Firebase project, credentials, and user data**. AgriSence production credentials and databases must never be reused.
- Client-side Firebase configuration is not a security boundary; Firestore rules enforce ownership and membership.
- Rated live games must not permit engine assistance.
- In-game calls are limited to the two active players; spectators cannot join private calls.
- Audio/video are off by default, permissions are explicit, and recording is off by default.
- The core experience launches free; premium functionality can be added later.


## Personalisation

- Expanded personalisation studio at `/settings`, organised into App Settings, Appearance, Gameplay, Board & Pieces, and Sound & Motion. Includes five complete style presets, dark/light/system appearance, eight accent colours plus a custom colour picker, four built-in background atmospheres plus custom image upload (JPG/PNG/WebP, up to 1.5 MB), ten board palettes, ten piece sets, custom light/dark square colours, board roundness, piece scale, white/black board orientation, move-list default visibility, coordinates, legal-move hints, last-move highlighting, compact mode, sound controls, and animation toggle/speed.

Preferences and uploaded background images are saved locally in the current browser (not synced across devices or accounts). Custom backgrounds are rendered behind supported app screens. Custom board colours, coordinates, legal-move hints, last-move highlighting, board corner radius, piece scale, animation speed, interface density, accent colour, and background style are applied across supported pages and boards. Sound controls are retained for supported sound effects as those are added.
