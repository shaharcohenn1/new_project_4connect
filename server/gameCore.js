const ROWS = 6;
const COLS = 7;

function toMatrix(board) {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid.push(board.slice(r * COLS, r * COLS + COLS).split(''));
  }
  return grid;
}

function toString(grid) {
  return grid.map(r => r.join('')).join('');
}

function drop(boardStr, col, color) {
  if (col < 0 || col >= COLS) return null;

  const disk = color === 'red' ? 'R' : 'Y';
  const grid = toMatrix(boardStr);

  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r][col] === '.') {
      grid[r][col] = disk;
      return { board: toString(grid), row: r, col };
    }
  }
  return null;
}

function checkDir(grid, r, c, dr, dc) {
  const disk = grid[r][c];
  if (disk === '.') return false;

  let count = 1;

  let rr = r + dr, cc = c + dc;
  while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && grid[rr][cc] === disk) {
    count++; rr += dr; cc += dc;
  }

  rr = r - dr; cc = c - dc;
  while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && grid[rr][cc] === disk) {
    count++; rr -= dr; cc -= dc;
  }

  return count >= 4;
}

function checkWin(boardStr, row, col) {
  const grid = toMatrix(boardStr);
  return (
    checkDir(grid, row, col, 0, 1) ||
    checkDir(grid, row, col, 1, 0) ||
    checkDir(grid, row, col, 1, 1) ||
    checkDir(grid, row, col, 1, -1)
  );
}

function boardFull(board) {
  return !board.includes('.');
}

module.exports = {
  ROWS,
  COLS,
  drop,
  checkWin,
  boardFull
};