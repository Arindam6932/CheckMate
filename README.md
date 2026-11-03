# CHECKMATE ♞

**The game, reimagined.** A chess platform for competitive play, learning, community, and analysis.

## Current build — Phase 1

- Responsive React + TypeScript + Vite application.
- Premium dark interface with a light appearance toggle.
- Interactive local chessboard powered by `chess.js`.
- Legal move highlighting, move history, undo, restart, and board flip.
- Navigation entry points for play, puzzles, learning, watch, community, and tournaments.
- Responsive mobile layout and reduced-motion support.

The navigation and account menu currently contain clearly labelled future-phase entry points. Online matchmaking, accounts, chat, and engine analysis are **not** live yet.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Roadmap

1. Foundation and independent authentication.
2. Player profiles, settings, and onboarding.
3. Multiplayer game sessions and matchmaking.
4. Friends, messaging, and private player-to-player voice/video.
5. Ratings, game history, leaderboards, and tournaments.
6. Puzzles, learning academy, and opening explorer.
7. Stockfish analysis and post-game review.
8. Fair-play systems, moderation, accessibility, and production hardening.

## Security and product principles

- CHECKMATE will use its **own Firebase project, credentials, and user data**. AgriSence production credentials and databases must never be reused.
- Authentication will be adapted from the AgriSence implementation only when its source files are available for review.
- Rated live games will not permit engine assistance.
- In-game calls are limited to the two active players; spectators cannot join private calls.
- Audio/video are off by default, permissions are explicit, and recording is off by default.
- The core experience launches free; premium functionality can be added later without blocking the initial product.
