const crypto = require('crypto');
const db = require('./dbStore');
const logic = require('./gameCore');

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function makePid() {
  return crypto.randomBytes(8).toString('hex');
}

function sendJson(res, obj, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(obj));
}

function normalizePath(pathname) {
  if (pathname.startsWith('/api/')) return pathname.slice(4);
  return pathname;
}

async function handleApi(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = normalizePath(url.pathname);
    const method = req.method || 'GET';

    if (method !== 'GET') return sendJson(res, { error: 'Method not allowed' }, 405);

    if (path === '/new') {
      const name = String(url.searchParams.get('name') || '').trim();
      if (!name) return sendJson(res, { error: 'שם לא חוקי' });

      const code = makeCode();
      const emptyBoard = '.'.repeat(logic.ROWS * logic.COLS);

      const gameId = await db.createGame({ code, board: emptyBoard, turn: 'red', status: 'wait' });

      const pid = makePid();
      await db.insertPlayer({ gameId, pid, name, color: 'red' });

      return sendJson(res, { pid, code, color: 'red' });
    }

    if (path === '/join') {
      const code = String(url.searchParams.get('code') || '').trim().toUpperCase();
      const name = String(url.searchParams.get('name') || '').trim();

      const game = await db.getGameByCode(code);
      if (!game) return sendJson(res, { error: 'קוד חדר לא קיים' });

      const players = await db.getPlayers(game.id);
      const redTaken = players.some(p => p.color === 'red');
      const yellowTaken = players.some(p => p.color === 'yellow');

      if (yellowTaken) return sendJson(res, { error: 'המשחק מלא' });

      const pid = makePid();
      const color = redTaken ? 'yellow' : 'red';

      await db.insertPlayer({ gameId: game.id, pid, name, color });

      if (redTaken && !yellowTaken) {
        await db.updateGame({
          gameId: game.id,
          board: game.board,
          turn: game.turn,
          status: 'playing',
          lastRow: game.last_move_row,
          lastCol: game.last_move_col
        });
      }

      return sendJson(res, { pid, color });
    }

    if (path === '/state') {
      const pid = String(url.searchParams.get('pid') || '');
      const me = await db.getPlayer(pid);
      if (!me) return sendJson(res, { error: 'שחקן לא נמצא' });

      return sendJson(res, {
        board: me.board,
        turn: me.turn,
        status: me.status,
        last_move: (Number.isInteger(me.last_move_row) && Number.isInteger(me.last_move_col))
          ? { row: me.last_move_row, col: me.last_move_col }
          : null
      });
    }

    if (path === '/move') {
      const pid = String(url.searchParams.get('pid') || '');
      const col = Number(url.searchParams.get('col'));

      const me = await db.getPlayer(pid);
      if (!me) return sendJson(res, { error: 'שחקן לא נמצא' });

      if (me.status !== 'playing') return sendJson(res, { error: 'המשחק לא פעיל' });
      if ((me.turn === 'red' && me.color !== 'red') || (me.turn === 'yellow' && me.color !== 'yellow')) {
        return sendJson(res, { error: 'לא התור שלך' });
      }

      const move = logic.drop(me.board, col, me.color);
      if (!move) return sendJson(res, { error: 'מהלך לא חוקי' });

      let status = me.status;
      if (logic.checkWin(move.board, move.row, move.col)) status = 'win';
      else if (logic.boardFull(move.board)) status = 'draw';

      const nextTurn = status === 'playing'
        ? (me.turn === 'red' ? 'yellow' : 'red')
        : me.turn;

      await db.updateGame({
        gameId: me.game_id,
        board: move.board,
        turn: nextTurn,
        status,
        lastRow: move.row,
        lastCol: move.col
      });

      return sendJson(res, {
        ok: true,
        status,
        turn: nextTurn,
        board: move.board,
        last_move: { row: move.row, col: move.col }
      });
    }

    return sendJson(res, { error: 'Not found' }, 404);
  } catch (err) {
    console.error('API ERR:', err);
    return sendJson(res, { error: 'Server error' }, 500);
  }
}

module.exports = { handleApi };
