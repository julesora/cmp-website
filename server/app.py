from pathlib import Path
from secrets import choice

import cmp
import chess_engine as chess
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

app = FastAPI(title="CMP workbench")


class InspectRequest(BaseModel):
    mnemonic: str = Field(max_length=4096)


class GenerateRequest(BaseModel):
    moves: int = Field(default=24, ge=1, le=256, strict=True)


def position(state, game, move="", san=""):
    ranks = []
    for rank in range(7, -1, -1):
        row, empty = "", 0
        for piece in state["board"][rank * 8:rank * 8 + 8]:
            if piece is None:
                empty += 1
            else:
                row += (str(empty) if empty else "") + piece
                empty = 0
        ranks.append(row + (str(empty) if empty else ""))
    return {
        "fen": "/".join(ranks), "turn": state["turn"], "game": game,
        "move": move, "san": san, "legal": chess.legal_moves(state),
        "result": chess.result(state),
    }


@app.post("/api/inspect")
def inspect(request: InspectRequest):
    text = request.mnemonic.strip()
    state = chess.initial_state()
    frames = [position(state, 1)]
    if not text:
        return {"valid": False, "normalized": "", "moves": [],
                "frames": frames, "outputs": {"uci": "", "san": "", "pgn": ""},
                "version": cmp.__version__}
    if len(text.split()) > 257:
        raise HTTPException(422, "Use at most 256 moves.")
    try:
        moves = cmp.parse_mnemonic(text)
        game = 1
        for move in moves:
            if not chess.legal_moves(state):
                state = chess.initial_state()
                game += 1
            san = chess.san(state, move)
            state = chess.play(state, move)
            frames.append(position(state, game, move, san))
        return {
            "valid": True, "normalized": cmp.normalize(text), "moves": moves,
            "frames": frames, "version": cmp.__version__,
            "outputs": {fmt: cmp.convert_mnemonic(text, fmt) for fmt in ("uci", "san", "pgn")},
        }
    except cmp.InvalidMnemonic as error:
        raise HTTPException(422, str(error)) from error


@app.post("/api/generate")
def generate(request: GenerateRequest):
    state = chess.initial_state()
    moves = []
    for _ in range(request.moves):
        legal = chess.legal_moves(state)
        if not legal:
            state = chess.initial_state()
            legal = chess.legal_moves(state)
        move = choice(legal)
        moves.append(move)
        state = chess.play(state, move)
    return inspect(InspectRequest(mnemonic="cmp1 " + " ".join(moves)))


dist = Path(__file__).resolve().parent.parent / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=dist, html=True), name="site")
