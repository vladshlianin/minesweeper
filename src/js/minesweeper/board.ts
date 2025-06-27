import { create2dArray } from './utils';
import type { CellValue } from './types';

// 8-directional movement deltas for getting cell neighbors
const deltas = [
  [0, 1], // Right
  [-1, 1], // Up-Right
  [-1, 0], // Up
  [-1, -1], // Up-Left
  [0, -1], // Left
  [1, -1], // Down-Left
  [1, 0], // Down,
  [1, 1], // Down-Right
];

/**
 * Create initial board state where all cells are empty
 * @param size - Amount of rows and cols in board
 * @returns 2D array of given size
 */
export const initBoard = (size: number) => {
  return create2dArray('E' as CellValue, size);
};

/**
 * Creates a new board with mines placed at random positions using Fisher-Yates shuffle algorithm.
 * Ensures the specified ignore position is never selected as a mine location.
 * The original board is not modified - a deep copy is returned.
 *
 * @param board - The original game board (2D array of CellValue)
 * @param minesCount - Number of mines to place on the board
 * @param ignorePosition - Position [row, col] that should never contain a mine (typically first clicked cell)
 * @returns New board with mines placed, original board unchanged
 *
 * @example
 * const emptyBoard = initBoard(8);
 * const boardWithMines = attachMines(emptyBoard, 10, [3, 4]);
 */
export const attachMines = (
  board: CellValue[][],
  minesCount: number,
  [ignoreRow, ignoreCol]: [number, number],
): CellValue[][] => {
  // Create deep copy to avoid mutating the input board
  const boardCopy: CellValue[][] = board.map((row) => [...row]);
  // Early return. Also return a copy anyway
  if (minesCount === 0) return boardCopy;

  const size = board.length;
  const totalCells = size ** 2;

  // Ensure we don't try to place more mines than available positions
  const maxPossibleMines = totalCells - 1; // -1 for the ignored position
  const actualMinesCount = Math.min(minesCount, maxPossibleMines);

  // Step 1: Generate array of all cell indices (0 to totalCells-1)
  const indices = Array.from({ length: totalCells }, (_, i) => i);

  // Step 2: Fisher-Yates shuffle - randomize all indices
  // Since all elements are unique, there is no need to check if i and j are equal
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Step 3: Place mines by iterating through shuffled indices
  let currentIndex = 0;
  let minesPlaced = 0;

  while (minesPlaced < actualMinesCount && currentIndex < indices.length) {
    const linearIndex = indices[currentIndex];
    currentIndex++;

    // Convert index to 2D coordinates
    const row = Math.floor(linearIndex / size);
    const col = linearIndex % size;

    // Skip the ignored position and place mine
    if (row !== ignoreRow || col !== ignoreCol) {
      boardCopy[row][col] = 'M';
      minesPlaced++;
    }
  }

  return boardCopy;
};

/**
 * Gets valid neighbor coordinates for a given cell
 * @param numRows - Total number of rows in the board
 * @param numCols - Total number of columns in the board
 * @param row - Current row position
 * @param col - Current column position
 * @returns Array of valid neighbor coordinates
 */
const getNeighbours = (numRows: number, numCols: number, row: number, col: number): [number, number][] => {
  const result: [number, number][] = [];
  for (const [deltaRow, deltaCol] of deltas) {
    const neighbourRow = row + deltaRow;
    const neighbourCol = col + deltaCol;
    if (neighbourRow >= 0 && neighbourRow < numRows && neighbourCol >= 0 && neighbourCol < numCols) {
      result.push([neighbourRow, neighbourCol]);
    }
  }
  return result;
};

/**
 * Get a new minesweeper board after a cell is clicked
 * @param board - Current board state
 * @param click - Coordinates of the clicked cell [row, col]
 * @returns New board state with revealed cells
 */
export const updateBoard = (board: CellValue[][], click: [number, number]): CellValue[][] => {
  const numRows = board.length;
  const numCols = board[0].length;

  // Create a copy to avoid mutating input
  const boardCopy: CellValue[][] = board.map((row) => [...row]);

  const markCell = (row: number, col: number) => {
    if (boardCopy[row][col] === 'E') {
      let mines = 0;
      const neighbours = getNeighbours(numRows, numCols, row, col);

      // Count adjacent mines
      for (const [neighbourRow, neighbourCol] of neighbours) {
        if (boardCopy[neighbourRow][neighbourCol] === 'M') {
          mines++;
        }
      }
      if (mines) {
        boardCopy[row][col] = String(mines) as CellValue;
      } else {
        // No mines found - flood fill to reveal connected empty cells
        boardCopy[row][col] = 'RE';
        for (const [neighbourRow, neighbourCol] of neighbours) {
          markCell(neighbourRow, neighbourCol);
        }
      }
    }
  };

  markCell(click[0], click[1]);
  return boardCopy;
};

/**
 * Finds unrevealed cell
 *
 * **IMPLEMENTATION NOTE**: This function prioritizes performance over finding
 * the absolute closest cell. It uses a simple search algorithm rather than
 * Dijkstra's algorithm, which is sufficient for tab navigation purposes.
 *
 * **BEHAVIOR**: The returned cell is **not guaranteed** to be the closest
 * unrevealed cell to the starting position. Any unrevealed cell may be returned.
 *
 * @param board - Current board state
 * @param startPositions - Starting position for the search [row, col]
 * @returns Coordinates of closest unrevealed cell or null if none found
 */
export const findUnrevealed = (board: CellValue[][], startPositions: [number, number]): [number, number] | null => {
  const numRows = board.length;
  const numCols = board[0].length;

  // Track visited cells to avoid cycles
  const visited = Array.from({ length: numRows }, () => Array(numCols).fill(false));
  // Mark starting position as visited
  visited[startPositions[0]][startPositions[1]] = true;
  // Initialize queue
  const queue = [startPositions];

  while (queue.length > 0) {
    const [currentRow, currentCol] = queue.shift()!;

    for (const [neighbourRow, neighbourCol] of getNeighbours(numRows, numCols, currentRow, currentCol)) {
      if (!visited[neighbourRow][neighbourCol]) {
        // Found unrevealed cell (empty or mine)
        if (board[neighbourRow][neighbourCol] === 'E' || board[neighbourRow][neighbourCol] === 'M') {
          return [neighbourRow, neighbourCol];
        }

        visited[neighbourRow][neighbourCol] = true;
        queue.push([neighbourRow, neighbourCol]);
      }
    }
  }
  return null;
};
