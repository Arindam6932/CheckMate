# CHECKMATE ♞

**The game, reimagined.** A chess platform for competitive play, learning, community, and analysis.

## Current build

### Application foundation
- React + TypeScript + Vite.
- Graphite/jade dark theme and matching light appearance.
- Interactive local chessboard powered by `chess.js`.
- Legal move highlighting, move history, undo, restart, and board flip.
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

Authentication is wired but remains disabled until a **separate CHECKMATE Firebase project** is configured. No AgriSence credentials or databases are used.

## Run locally

```bash
npm install
cp .env.example .env
# Add the CHECKMATE Firebase Web App values to .env
npm run dev
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
3. Complete local chess experience, clocks, notation, and game controls.
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
