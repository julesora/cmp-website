from pathlib import Path
from shutil import copy2

import cmp
import chess_engine

root = Path(__file__).resolve().parent.parent
out = root / "public" / "runtime"
out.mkdir(parents=True, exist_ok=True)
for name in ("pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm",
             "python_stdlib.zip", "pyodide-lock.json"):
    copy2(root / "node_modules" / "pyodide" / name, out / name)
for module in (cmp, chess_engine):
    copy2(module.__file__, out / Path(module.__file__).name)
copy2(root / "server" / "workbench.py", out / "workbench.py")
