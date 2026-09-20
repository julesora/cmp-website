from secrets import choice

import cmp
import chess_engine as chess


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


def inspect(mnemonic):
    if not isinstance(mnemonic, str) or len(mnemonic) > 4096:
        raise ValueError("Use at most 4096 characters.")
    text = mnemonic.strip()
    state = chess.initial_state()
    frames = [position(state, 1)]
    if not text:
        return {"valid": False, "normalized": "", "moves": [],
                "frames": frames, "outputs": {"uci": "", "san": "", "pgn": ""},
                "version": cmp.__version__}
    if len(text.split()) > 257:
        raise ValueError("Use at most 256 moves.")
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


def generate(count=24):
    if type(count) is not int or not 1 <= count <= 256:
        raise ValueError("Use 1–256 moves.")
    state = chess.initial_state()
    moves = []
    for _ in range(count):
        legal = chess.legal_moves(state)
        if not legal:
            state = chess.initial_state()
            legal = chess.legal_moves(state)
        move = choice(legal)
        moves.append(move)
        state = chess.play(state, move)
    return inspect("cmp1 " + " ".join(moves))

