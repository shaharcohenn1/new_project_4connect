const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'game_user',
  password: 'GamePass!456',
  database: 'game_db',
  connectionLimit: 10
});

async function run(query, params = []) {
  const [rows] = await pool.execute(query, params);
  return rows;
}

module.exports = {

  async createGame({ code, board, turn, status }) {
    const result = await run(
      'INSERT INTO games (code, board, turn, status) VALUES (?,?,?,?)',
      [code, board, turn, status]
    );
    return result.insertId;
  },

  async getGameByCode(code) {
    const rows = await run('SELECT * FROM games WHERE code=? LIMIT 1', [code]);
    return rows[0] || null;
  },

  async insertPlayer({ gameId, pid, name, color }) {
    await run(
      'INSERT INTO players (game_id, pid, name, color) VALUES (?,?,?,?)',
      [gameId, pid, name, color]
    );
  },

  async getPlayers(gameId) {
    return run('SELECT * FROM players WHERE game_id=?', [gameId]);
  },

  async getPlayer(pid) {
    const rows = await run(
      `SELECT p.*, g.board, g.code, g.turn, g.status, g.last_move_row, g.last_move_col
       FROM players p
       JOIN games g ON p.game_id = g.id
       WHERE pid=? LIMIT 1`,
      [pid]
    );
    return rows[0] || null;
  },

  async updateGame({ gameId, board, turn, status, lastRow, lastCol }) {
    await run(
      `UPDATE games SET board=?, turn=?, status=?, last_move_row=?, last_move_col=? WHERE id=?`,
      [board, turn, status, lastRow, lastCol, gameId]
    );
  }
};