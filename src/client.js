export const browserMode = import.meta.env.VITE_CMP_RUNTIME === 'browser';
let worker;
let nextId = 0;
const pending = new Map();

function reset(message) {
  for (const task of pending.values()) {
    clearTimeout(task.timeout);
    task.reject(new Error(message));
  }
  pending.clear();
  worker?.terminate();
  worker = undefined;
}

export async function run(payload) {
  if (!browserMode) {
    const response = await fetch('moves' in payload ? '/api/generate' : '/api/inspect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Use at most 256 moves and 4096 characters.');
    return result;
  }
  if (!worker) {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.fatal) { reset(data.error); return; }
      const task = pending.get(data.id);
      if (!task) return;
      clearTimeout(task.timeout);
      pending.delete(data.id);
      if (data.error) task.reject(new Error(data.error));
      else task.resolve(data.result);
    };
    worker.onerror = () => reset('CMP stopped. Try again.');
  }
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => reset('CMP timed out. Check your connection and retry.'), 60000);
    pending.set(id, { resolve, reject, timeout });
    worker.postMessage({ id, payload, base: new URL(`${import.meta.env.BASE_URL}runtime/`, location.href).href });
  });
}
