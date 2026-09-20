from pathlib import Path
from shutil import copy2

import cmp
import chess_engine

root = Path(__file__).resolve().parent.parent
runtime_dir = root / "public" / "runtime"
runtime_dir.mkdir(parents=True, exist_ok=True)
runtime_files = (
    "pyodide.mjs",
    "pyodide.asm.mjs",
    "pyodide.asm.wasm",
    "python_stdlib.zip",
    "pyodide-lock.json",
)

for name in runtime_files:
    copy2(root / "node_modules" / "pyodide" / name, runtime_dir / name)

for module in (cmp, chess_engine):
    copy2(module.__file__, runtime_dir / Path(module.__file__).name)

copy2(root / "server" / "workbench.py", runtime_dir / "workbench.py")
