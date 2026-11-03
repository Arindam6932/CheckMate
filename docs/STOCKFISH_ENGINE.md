# Stockfish computer opponent

CHECKMATE uses the Stockfish 19 Lite single-threaded WebAssembly engine for local computer games.

## How it works

- The browser loads `public/stockfish/stockfish-19-lite-single.js` as a dedicated Web Worker.
- The matching WebAssembly file is copied from the installed `stockfish` npm package during `npm install` by `scripts/copy-stockfish.mjs`.
- UCI commands are sent directly to the worker. Board FEN positions remain in the browser and are not sent to CHECKMATE servers.
- Difficulty levels 1–9 progressively increase Stockfish's Skill Level, search depth, and thinking time.
- Level 10 is labelled Grandmaster and uses Stockfish's maximum Skill Level with a deeper, timed search. This is an engine-strength setting, not a promise of a particular human Elo rating; hardware and search time affect results.
- The single-threaded engine avoids SharedArrayBuffer and cross-origin isolation requirements.

## Development and deployment

Run `npm install` to install Stockfish and copy its JS/WASM runtime into `public/stockfish`. The normal Vite build then includes those assets. If the engine files are missing, rerun `npm install`.

## Third-party licence

Stockfish.js is distributed under GNU GPL v3.0. The upstream package and source are available at https://github.com/nmrugg/stockfish.js and https://www.npmjs.com/package/stockfish. Keep the upstream licence and source notices with any distributed build that includes the engine.
