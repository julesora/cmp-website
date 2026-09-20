let runtime;

async function load(base) {
  const { loadPyodide } = await import(/* @vite-ignore */ `${base}pyodide.mjs`);
  const python = await loadPyodide({ indexURL: base });
  await Promise.all(['cmp.py', 'chess_engine.py', 'workbench.py'].map(async (name) => {
    const response = await fetch(base + name);
    if (!response.ok) throw new Error('Cannot load CMP. Reload to retry.');
    python.FS.writeFile(name, await response.text());
  }));
  python.runPython(`
import json
from workbench import inspect, generate

def respond(payload):
    try:
        request = json.loads(payload)
        result = (generate(request['moves']) if 'moves' in request
                  else inspect(request['mnemonic']))
        return json.dumps({'result': result})
    except ValueError as error:
        return json.dumps({'error': str(error)})
`);
  return python;
}

self.onmessage = async ({ data: { id, payload, base } }) => {
  try {
    runtime ??= load(base).catch(() => {
      runtime = undefined;
      throw new Error('Cannot load CMP. Check your connection and retry.');
    });
    const python = await runtime;
    python.globals.set('payload', JSON.stringify(payload));
    const response = JSON.parse(python.runPython('respond(payload)'));
    self.postMessage({ id, ...response });
  } catch (error) {
    self.postMessage({ id, error: error.message, fatal: true });
  }
};
