import type { Square } from 'chess.js';

export type EngineMove = { from: Square; to: Square; promotion?: 'q' | 'r' | 'b' | 'n' };

let engineWorker: Worker | null = null;
let engineReady: Promise<Worker> | null = null;
let resolveMove: ((move: EngineMove | null) => void) | null = null;
let rejectMove: ((error: Error) => void) | null = null;
let searchTimeout: number | null = null;

function getEngine(): Promise<Worker> {
  if (engineReady) return engineReady;

  engineReady = new Promise<Worker>((resolve, reject) => {
    const worker = new Worker('/stockfish/stockfish-19-lite-single.js');
    engineWorker = worker;
    const handshakeTimeout = window.setTimeout(() => {
      engineReady = null;
      worker.terminate();
      engineWorker = null;
      reject(new Error('Stockfish took too long to initialize.'));
    }, 30000);

    worker.onerror = () => {
      window.clearTimeout(handshakeTimeout);
      engineReady = null;
      engineWorker = null;
      worker.terminate();
      reject(new Error('Stockfish could not be loaded.'));
    };

    worker.onmessage = (event: MessageEvent<string>) => {
      const line = String(event.data).trim();
      if (line === 'uciok') {
        worker.postMessage('setoption name Threads value 1');
        worker.postMessage('isready');
      } else if (line === 'readyok') {
        window.clearTimeout(handshakeTimeout);
        resolve(worker);
      } else if (line.startsWith('bestmove ')) {
        if (searchTimeout !== null) window.clearTimeout(searchTimeout);
        searchTimeout = null;
        const uci = line.split(/\s+/)[1];
        const move = uci && uci !== '(none)' && uci.length >= 4
          ? {
              from: uci.slice(0, 2) as Square,
              to: uci.slice(2, 4) as Square,
              ...(uci.length > 4 ? { promotion: uci[4] as 'q' | 'r' | 'b' | 'n' } : {}),
            }
          : null;
        resolveMove?.(move);
        resolveMove = null;
        rejectMove = null;
      }
    };

    worker.postMessage('uci');
  });

  return engineReady;
}

/** Uses the Stockfish 19 WASM engine in a dedicated worker; positions stay in the browser. */
export async function findStockfishMove(fen: string, skillLevel = 10): Promise<EngineMove | null> {
  const worker = await getEngine();
  if (resolveMove) throw new Error('Stockfish is already calculating a move.');
  const level = Math.max(1, Math.min(10, Math.round(skillLevel)));
  const skill = Math.round((level - 1) * 20 / 9);
  const depth = 7 + (level - 1) * 2;

  return new Promise<EngineMove | null>((resolve, reject) => {
    resolveMove = resolve;
    rejectMove = reject;
    searchTimeout = window.setTimeout(() => {
      worker.postMessage('stop');
      rejectMove?.(new Error('Stockfish search timed out.'));
      resolveMove = null;
      rejectMove = null;
      searchTimeout = null;
    }, 15000);
    worker.postMessage(`setoption name Skill Level value ${skill}`);
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth} movetime ${level === 10 ? 8000 : 500 + level * 650}`);
  });
}

export function cancelStockfishSearch() {
  if (resolveMove) {
    engineWorker?.postMessage('stop');
    if (searchTimeout !== null) window.clearTimeout(searchTimeout);
    searchTimeout = null;
    rejectMove?.(new Error('Stockfish search cancelled.'));
    resolveMove = null;
    rejectMove = null;
  }
}
