import pytest
from fastapi.testclient import TestClient

from server.app import app

client = TestClient(app)


def inspect(text):
    return client.post('/api/inspect', json={'mnemonic': text})


def test_normalize_and_convert():
    data = inspect(' CMP1  E2E4 E7E5 G1F3 ').json()
    assert data['normalized'] == 'cmp1 e2e4 e7e5 g1f3'
    assert data['outputs']['san'] == '1. e4 e5 2. Nf3'
    assert data['outputs']['uci'] == 'e2e4 e7e5 g1f3'
    assert '[Result "*"]' in data['outputs']['pgn']
    assert len(data['frames']) == 4
    assert len(data['frames'][0]['legal']) == 20
    assert data['frames'][-1]['turn'] == 'b'


@pytest.mark.parametrize('text', ['cmp1', 'e2e4', 'cmp2 e2e4', 'cmp1 e2e9', 'cmp1 e2e5', 'cmp1 e2e4 d2d4'])
def test_invalid(text):
    assert inspect(text).status_code == 422


def test_empty_workspace():
    data = inspect('').json()
    assert not data['valid']
    assert len(data['frames'][0]['legal']) == 20


@pytest.mark.parametrize('text,ending,rank', [
    ('e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1', 'O-O', 'RNBQ1RK1'),
    ('e2e4 a7a6 e4e5 d7d5 e5d6', 'exd6', None),
    ('a2a4 h7h5 a4a5 h5h4 a5a6 h4h3 a6b7 h3g2 b7a8q', 'bxa8=Q', None),
])
def test_special_moves(text, ending, rank):
    data = inspect('cmp1 ' + text).json()
    assert data['frames'][-1]['san'] == ending
    if rank:
        assert data['frames'][-1]['fen'].split('/')[-1] == rank


def test_restart_after_checkmate():
    data = inspect('cmp1 f2f3 e7e5 g2g4 d8h4 e2e4').json()
    assert data['frames'][4]['result'] == '0-1'
    assert data['frames'][5]['game'] == 2
    assert data['outputs']['pgn'].count('[Event "CMP-1"]') == 2
    assert data['frames'][5]['fen'] == 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR'


def test_input_limits():
    assert inspect('x' * 4097).status_code == 422
    assert inspect('cmp1 ' + 'e2e4 ' * 257).status_code == 422
