import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('node_modules/stockfish/bin');
const destination = resolve('public/stockfish');
mkdirSync(destination, { recursive: true });
for (const file of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  cpSync(resolve(source, file), resolve(destination, file));
}
console.log('Stockfish 19 lite single-threaded browser engine copied to public/stockfish.');
