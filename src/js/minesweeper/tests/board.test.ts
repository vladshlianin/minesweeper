import { expect, it, describe, beforeEach } from 'vitest';
import { initBoard, attachMines, updateBoard, findUnrevealed } from '../board';

import type { CellValue } from '../types';

describe('initBoard', () => {
  it('creates board with empty cells', () => {
    const board = initBoard(3);
    expect(board).toHaveLength(3);
    expect(board[1][1]).toBe('E');
  });
});

describe('attachMines', () => {
  let board: CellValue[][];

  beforeEach(() => {
    board = initBoard(5);
  });

  it('places correct number of mines', () => {
    const result = attachMines(board, 5, [0, 0]);
    const mineCount = result.flat().filter((cell) => cell === 'M').length;
    expect(mineCount).toBe(5);
  });

  it('avoids ignored position', () => {
    const result = attachMines(board, 10, [2, 3]);
    expect(result[2][3]).toBe('E');
  });

  it('handles maximum mines (size² - 1)', () => {
    const result = attachMines(board, 24, [2, 2]); // 25 - 1
    const mineCount = result.flat().filter((cell) => cell === 'M').length;
    expect(mineCount).toBe(24);
    expect(result[2][2]).toBe('E');
  });

  it('handles zero mines', () => {
    const result = attachMines(board, 0, [0, 0]);
    expect(result.flat().every((cell) => cell === 'E')).toBe(true);
  });

  it('returns a copy', () => {
    // Make a copy to check
    const originalBoard = board.map((row) => [...row]);
    const result = attachMines(board, 0, [0, 0]);
    // Manually update field
    result[1][0] = '1';

    expect(originalBoard).toEqual(board);
  });
});

describe('updateBoard', () => {
  it('reveals cell with mine count when clicked', () => {
    const board: CellValue[][] = [
      ['E', 'M', 'E'],
      ['E', 'E', 'E'],
      ['E', 'E', 'E'],
    ];

    const result = updateBoard(board, [1, 1]);
    expect(result[1][1]).toBe('1');
  });

  it('flood fills empty areas with no adjacent mines', () => {
    const board: CellValue[][] = [
      ['E', 'E', 'E'],
      ['E', 'E', 'E'],
      ['M', 'E', 'E'],
    ];

    const result = updateBoard(board, [0, 0]);

    // Should reveal connected empty cells
    expect(result).toEqual([
      ['RE', 'RE', 'RE'],
      ['1', '1', 'RE'],
      ['M', '1', 'RE'],
    ]);
  });

  it('does not modify already revealed cells', () => {
    const board: CellValue[][] = [
      ['1', 'M', 'RE'],
      ['RE', 'RE', 'RE'],
      ['E', 'RE', 'RE'],
    ];

    const result = updateBoard(board, [1, 0]);

    // Already revealed cells should remain unchanged
    expect(result).toEqual(board);
  });

  it('handles corner cell clicks', () => {
    const board: CellValue[][] = [
      ['E', 'M'],
      ['E', 'E'],
    ];

    const result = updateBoard(board, [0, 0]);
    expect(result).toEqual([
      ['1', 'M'],
      ['E', 'E'],
    ]);
  });

  it('handles single cell board', () => {
    const board: CellValue[][] = [['E']];

    const result = updateBoard(board, [0, 0]);
    expect(result[0][0]).toBe('RE');
  });

  it('counts multiple adjacent mines correctly', () => {
    const board: CellValue[][] = [
      ['M', 'M', 'M'],
      ['M', 'E', 'M'],
      ['M', 'M', 'M'],
    ];

    const result = updateBoard(board, [1, 1]);
    expect(result[1][1]).toBe('8'); // Surrounded by 8 mines
  });

  it('does not mutate original board', () => {
    const board: CellValue[][] = [
      ['E', 'E'],
      ['E', 'E'],
    ];
    // Make a copy to check
    const originalBoard = board.map((row) => [...row]);
    updateBoard(board, [0, 0]);

    expect(board).toEqual(originalBoard);
  });

  it('returns a copy when changes were not made', () => {
    const board: CellValue[][] = [
      ['1', 'M'],
      ['E', 'E'],
    ];
    // Make a copy to check
    const originalBoard = board.map((row) => [...row]);
    const updated = updateBoard(board, [0, 0]);
    expect(updated).toEqual([
      ['1', 'M'],
      ['E', 'E'],
    ]);
    // Manually update field
    updated[1][0] = '1';

    expect(originalBoard).toEqual(board);
  });
});

describe('findUnrevealed', () => {
  it('finds adjacent unrevealed cell', () => {
    const board: CellValue[][] = [
      ['RE', 'E', 'E'],
      ['1', '2', 'E'],
      ['E', 'E', 'E'],
    ];

    const result = findUnrevealed(board, [0, 0]);
    expect(result).toEqual([0, 1]);
  });

  it('finds unrevealed mine', () => {
    const board: CellValue[][] = [
      ['RE', 'M', 'E'],
      ['1', '2', 'E'],
      ['E', 'E', 'E'],
    ];

    const result = findUnrevealed(board, [0, 0]);
    expect(result).toEqual([0, 1]); // Should find mine
  });

  it('returns null when no unrevealed cells exist', () => {
    const board: CellValue[][] = [
      ['RE', '1', '2'],
      ['1', '2', '1'],
      ['RE', 'RE', 'RE'],
    ];

    const result = findUnrevealed(board, [0, 0]);
    expect(result).toBeNull();
  });

  it('finds unrevealed cell through BFS traversal', () => {
    const board: CellValue[][] = [
      ['RE', '1', '1', 'E'],
      ['RE', '1', '1', 'E'],
      ['RE', 'RE', 'RE', 'E'],
    ];

    const result = findUnrevealed(board, [0, 0]);
    expect(result).toEqual([0, 3]);
  });

  it('handles starting from unrevealed cell', () => {
    const board: CellValue[][] = [
      ['E', '1', '1'],
      ['E', '1', '1'],
      ['E', 'RE', 'RE'],
    ];

    const result = findUnrevealed(board, [0, 0]);
    expect(result).toEqual([1, 0]); // Ignore starting position
  });

  it('handles corner starting position', () => {
    const board: CellValue[][] = [
      ['1', '1', 'E'],
      ['1', '1', 'E'],
    ];

    const result = findUnrevealed(board, [0, 0]);
    expect(result).toEqual([0, 2]);
  });

  it('handles single cell board with revealed cell', () => {
    const board: CellValue[][] = [['RE']];

    const result = findUnrevealed(board, [0, 0]);
    expect(result).toBeNull();
  });

  it('handles single cell board with unrevealed cell', () => {
    const board: CellValue[][] = [['E']];

    const result = findUnrevealed(board, [0, 0]);
    expect(result).toEqual(null);
  });

  it('finds among multiple unrevealed cells', () => {
    const board: CellValue[][] = [
      ['RE', 'RE', 'E'],
      ['RE', 'RE', 'RE'],
      ['E', 'RE', 'RE'],
    ];

    const result = findUnrevealed(board, [1, 1]);
    // Should find [0, 2] as it's closer than [2, 0]
    expect(result).toEqual([0, 2]);
  });
});
