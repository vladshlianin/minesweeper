import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MineSweeper } from '../index';
import { showConfetti } from '../../confetti';

vi.mock('../../confetti');

vi.mock('../announcer', () => ({
  Announcer: vi.fn().mockImplementation(() => ({
    announceGameReady: vi.fn(),
    announceGameReset: vi.fn(),
    announceDiffChanged: vi.fn(),
    announceGameWon: vi.fn(),
    announceGameLost: vi.fn(),
    announceCellRevealed: vi.fn(),
    announceCellFlagged: vi.fn(),
    announceCellUnflagged: vi.fn(),
    announceTimeElapsed: vi.fn(),
  })),
}));

describe('MineSweeper', () => {
  let mineSweeper: MineSweeper;
  vi.spyOn(window, 'addEventListener');

  let difficultyButtons: HTMLButtonElement[] = [];

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  const mockMatchMedia = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({ matches })),
    });
  };

  const getCell = (row: number, col: number) => {
    const children = document.getElementById('game-board')?.children;
    if (!children) throw new Error('Board has no children');
    const cell = children[row].children[col];
    if (!(cell instanceof HTMLElement)) throw new Error('Error on getting cell');
    return cell;
  };

  beforeEach(() => {
    // Add all required nodes to the document
    document.body.innerHTML = `
      <div>
        <button data-difficulty="beginner"></button>
        <button data-difficulty="intermediate"></button>
        <button data-difficulty="expert"></button>
        <div id="flag-count"></div>
        <div id="timer">00</div>
        <div id="game-board"></div>
        <img id="smiley-img"></img>
        <button id="smiley-btn"></button>
      </div>
    `;

    // Recreate buttons on each test iteration
    difficultyButtons = [];
    const diffNodes = document.querySelectorAll('button[data-difficulty]');
    for (const diffNode of diffNodes) {
      difficultyButtons.push(diffNode as HTMLButtonElement);
    }

    mockMatchMedia(true);
    mineSweeper = new MineSweeper();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // describe('MineSweeper', () => {
  describe('Initialization', () => {
    it('should not set up event listeners in constructor', () => {
      const resetButton = document.getElementById('smiley-btn') as HTMLElement;
      const spy = vi.spyOn(resetButton, 'addEventListener');
      // Event listeners should not be called during construction
      expect(spy).not.toHaveBeenCalled();
      expect(window.addEventListener).not.toHaveBeenCalled();
    });

    it('should set up event listeners only after initGame is called', () => {
      const resetButton = document.getElementById('smiley-btn') as HTMLElement;
      const spy = vi.spyOn(resetButton, 'addEventListener');
      mineSweeper.initGame();

      expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('initializes game with correct default state', () => {
      mineSweeper.initGame();

      const gameBoard = document.getElementById('game-board');
      expect(document.getElementById('flag-count')?.innerText).toBe('4');
      expect(gameBoard?.childElementCount).toBe(6); // 6x6 beginner
      expect(gameBoard?.children[0].childElementCount).toBe(6); // 6x6 beginner
    });

    it('sets up board with correct ARIA attributes', () => {
      mineSweeper.initGame();
      const board = document.getElementById('game-board');

      expect(board?.getAttribute('aria-rowcount')).toBe('6');
      expect(board?.getAttribute('aria-colcount')).toBe('6');
    });

    it('initializes cells with proper accessibility attributes', () => {
      mineSweeper.initGame();
      const firstCell = getCell(0, 0);
      const secondCell = getCell(0, 1);

      expect(firstCell?.getAttribute('tabIndex')).toBe('0'); // First cell focusable
      expect(secondCell?.getAttribute('tabIndex')).toBe('-1'); // Others not focusable
      expect(firstCell?.getAttribute('aria-label')).toBe('Unrevealed cell');
      expect(firstCell?.getAttribute('role')).toBe('gridcell');
      expect(firstCell?.getAttribute('aria-rowindex')).toBe('1');
      expect(firstCell?.getAttribute('aria-colindex')).toBe('1');
    });

    it('announces game ready state', () => {
      mineSweeper.initGame();
      expect(mineSweeper['announcer'].announceGameReady).toHaveBeenCalledWith('beginner', 6, 4);
    });

    it('sets up event listeners', () => {
      mineSweeper.initGame();
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('does not setup event listener if button has invalid dataset', () => {
      // const buttons = [buttonWithoutDataset, buttonInvalidDataset];
      const diffNodes = document.querySelectorAll('button[data-difficulty]') as NodeListOf<HTMLElement>;
      delete diffNodes[0].dataset.difficulty;
      diffNodes[1].dataset.difficulty = 'Invalid';
      // Case insensitive
      diffNodes[2].dataset.difficulty = 'Expert';

      const spies = difficultyButtons.map((button) => vi.spyOn(button, 'addEventListener'));

      mineSweeper.initGame();
      for (const spy of spies) {
        expect(spy).not.toHaveBeenCalled();
      }
    });

    it('activates correct difficulty button initially', () => {
      mineSweeper.initGame();
      const beginnerBtn = difficultyButtons.find((btn) => btn.dataset.difficulty === 'beginner');

      expect(beginnerBtn?.classList.contains('active')).toBe(true);
      expect(beginnerBtn?.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('Flag Management', () => {
    it('toggles flag with right click and updates counter', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      const contextEvent = new MouseEvent('contextmenu');
      cell?.dispatchEvent(contextEvent);

      expect(document.getElementById('flag-count')?.innerText).toBe('3');
      expect(cell?.getAttribute('aria-label')).toBe('Marked as flag. Press spacebar to unmark');
    });

    it('removes flag when toggled again and restores aria-label', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      // Add flag
      cell?.dispatchEvent(new MouseEvent('contextmenu'));
      expect(document.getElementById('flag-count')?.innerText).toBe('3');
      // Remove flag
      cell?.dispatchEvent(new MouseEvent('contextmenu'));

      expect(document.getElementById('flag-count')?.innerText).toBe('4');
      expect(cell?.getAttribute('aria-label')).toBe('Unrevealed cell');
    });

    it('announces flag placement and removal', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      // Flag cell
      cell?.dispatchEvent(new MouseEvent('contextmenu'));
      expect(mineSweeper['announcer'].announceCellFlagged).toHaveBeenCalledWith(1, 1, 3);

      // Unflag cell
      cell?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
      expect(mineSweeper['announcer'].announceCellUnflagged).toHaveBeenCalledWith(1, 1, 4);
    });

    it('prevents context menu on right click', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);
      const preventDefault = vi.fn();

      const contextEvent = new MouseEvent('contextmenu');
      Object.defineProperty(contextEvent, 'preventDefault', { value: preventDefault });
      cell?.dispatchEvent(contextEvent);

      expect(preventDefault).toHaveBeenCalled();
    });

    it('ignores clicks on flagged cells', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);
      // Flag the cell first
      cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
      // Try to reveal it
      cell.click();
      expect(cell?.classList.contains('revealed')).toBe(false);
    });

    it('removes flag from empty cell on flood fill', () => {
      mineSweeper.initGame();
      mineSweeper['firstClick'] = false;
      mineSweeper['size'] = 3;
      mineSweeper['board'] = [
        ['E', 'E', 'E'],
        ['1', '1', '1'],
        ['1', 'M', '1'],
      ];
      mineSweeper['flagPositions'] = [
        [false, false, false],
        [false, false, false],
        [false, false, false],
      ];
      const flagCell = getCell(0, 0);
      flagCell.dispatchEvent(new MouseEvent('contextmenu'));

      const clickCell = getCell(0, 1);
      clickCell.click();
      expect(flagCell.classList.contains('revealed')).toBe(true);
    });
  });

  describe('Timer', () => {
    it('starts timer on first cell reveal', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      cell?.click();
      vi.advanceTimersByTime(2000);

      expect(document.getElementById('timer')?.innerText).toBe('02');
    });

    it('announces time elapsed every 30 seconds', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      cell.click(); // Start game
      vi.advanceTimersByTime(30000);

      expect(mineSweeper['announcer'].announceTimeElapsed).toHaveBeenCalledWith(30);
    });

    it('stops timer when game ends', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      cell.click(); // Start game
      vi.advanceTimersByTime(1000);
      mineSweeper['gameEnded'] = true;
      vi.advanceTimersByTime(2000);

      expect(document.getElementById('timer')?.innerText).toBe('01'); // Should stop at 1
    });
  });

  describe('Keyboard navigation', () => {
    it('toggles flag with spacebar and prevents default', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);
      const keyEvent = new KeyboardEvent('keydown', { key: ' ' });
      cell?.dispatchEvent(keyEvent);
      expect(cell?.getAttribute('aria-label')).toBe('Marked as flag. Press spacebar to unmark');
    });

    it('moves focus with arrow keys', () => {
      mineSweeper.initGame();
      const firstCell = getCell(0, 0);
      const rightCell = getCell(0, 1);
      const downCell = getCell(1, 0); // Next row

      vi.spyOn(rightCell, 'focus');
      vi.spyOn(downCell, 'focus');

      firstCell?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(rightCell.focus).toHaveBeenCalled();

      firstCell?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(downCell.focus).toHaveBeenCalled();
    });

    it('moves focus from cell on flood fill', () => {
      mineSweeper.initGame();
      mineSweeper['firstClick'] = false;
      mineSweeper['size'] = 4;
      mineSweeper['board'] = [
        ['1', '1', '1', 'E'],
        ['1', 'M', '2', '1'],
        ['1', '2', 'M', '1'],
        ['E', '1', '1', '1'],
      ];
      // Force rerender
      mineSweeper['renderCells'](4);
      const clickCell = getCell(3, 0);
      clickCell.click();
      expect(clickCell.getAttribute('tabIndex')).toBe('-1');
      const unrevealedCell = getCell(2, 2);
      expect(unrevealedCell.getAttribute('tabIndex')).toBe('0');
    });

    it('respects board boundaries in navigation', () => {
      mineSweeper.initGame();
      const topLeftCell = getCell(0, 0);
      const bottomRightCell = getCell(5, 5); // 6x6 - 1

      // Try to move beyond boundaries
      topLeftCell?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      topLeftCell?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

      bottomRightCell?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      bottomRightCell?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

      // Should not throw errors and maintain focus behavior
      expect(() => {
        topLeftCell?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      }).not.toThrow();
    });

    it('reveals cell with Enter key', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);
      const preventDefault = vi.fn();

      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(keyEvent, 'preventDefault', { value: preventDefault });
      cell.dispatchEvent(keyEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(cell?.classList.contains('revealed')).toBe(true);
    });

    it('updates tabindex correctly during navigation', () => {
      mineSweeper.initGame();
      const firstCell = getCell(0, 0);
      const secondCell = getCell(0, 1);
      const thirdCell = getCell(0, 2);
      mineSweeper['board'][0][1] = 'E';
      // Focus on first cell to make navigation possible
      firstCell.focus();

      // Navigate to target
      firstCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(secondCell.getAttribute('tabIndex')).toBe('0');

      // Now check if unrevealed mine can be focused
      mineSweeper['board'][0][2] = 'M';

      // Navigate to target
      secondCell.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(thirdCell.getAttribute('tabIndex')).toBe('0');
    });

    it('ignores keyboard events when game ended', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);
      mineSweeper['gameEnded'] = true;
      vi.spyOn(cell, 'focus');
      cell?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(cell.focus).not.toHaveBeenCalled();
    });

    it('handles keyboard mine explosion', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);
      const preventDefault = vi.fn();

      mineSweeper['firstClick'] = false;
      mineSweeper['board'][0][0] = 'M';

      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(keyEvent, 'preventDefault', { value: preventDefault });
      cell?.dispatchEvent(keyEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(mineSweeper['gameEnded']).toBe(true);
      expect(cell?.classList.contains('collision')).toBe(true);
    });

    it('clears all cell focus when mine explodes', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);
      const otherCell = getCell(0, 1);

      otherCell.setAttribute('tabIndex', '0');
      mineSweeper['firstClick'] = false;
      mineSweeper['board'][0][0] = 'M';

      cell?.click();

      expect(otherCell.getAttribute('tabIndex')).toBe('-1');
    });
  });

  describe('Difficulty management', () => {
    it('should handle window resize and change difficulty', () => {
      mineSweeper['currentDifficulty'] = 'expert';

      // Resize once again
      Object.defineProperty(window, 'innerWidth', { value: 450 });
      mineSweeper['onResize']();
      expect(mineSweeper['currentDifficulty']).toBe('intermediate');

      // Resize once again
      Object.defineProperty(window, 'innerWidth', { value: 300 });
      mineSweeper['onResize']();
      expect(mineSweeper['currentDifficulty']).toBe('beginner');
    });

    it('changes difficulty and updates board dimensions', () => {
      mineSweeper.initGame();
      const intermediateBtn = difficultyButtons.find((btn) => btn.dataset.difficulty === 'intermediate');

      intermediateBtn?.click();

      const boardEl = document.getElementById('game-board');
      expect(boardEl?.childElementCount).toBe(9); // 9x9 intermediate
      expect(boardEl?.children[0].childElementCount).toBe(9); // 9x9 intermediate
      expect(document.getElementById('flag-count')?.innerText).toBe('9');
      expect(document.getElementById('game-board')?.getAttribute('aria-rowcount')).toBe('9');
      expect(document.getElementById('game-board')?.getAttribute('aria-colcount')).toBe('9');
    });

    it('updates button states when difficulty changes', () => {
      mineSweeper.initGame();
      const beginnerBtn = difficultyButtons.find((btn) => btn.dataset.difficulty === 'beginner');
      const intermediateBtn = difficultyButtons.find((btn) => btn.dataset.difficulty === 'intermediate');

      intermediateBtn?.click();

      expect(beginnerBtn?.classList.contains('active')).toBe(false);
      expect(beginnerBtn?.getAttribute('aria-pressed')).toBeNull();
      expect(intermediateBtn?.classList.contains('active')).toBe(true);
      expect(intermediateBtn?.getAttribute('aria-pressed')).toBe('true');
    });

    it('announces difficulty change', () => {
      mineSweeper.initGame();
      const expertBtn = difficultyButtons.find((btn) => btn.dataset.difficulty === 'expert');
      expertBtn?.click();
      expect(mineSweeper['announcer'].announceDiffChanged).toHaveBeenCalledWith('expert', 14, 35);
    });

    it('stores difficulty preference in localStorage', () => {
      mineSweeper.initGame();
      const expertBtn = difficultyButtons.find((btn) => btn.dataset.difficulty === 'expert');

      expertBtn?.click();

      expect(localStorageMock.setItem).toHaveBeenCalledWith('difficulty', 'expert');
    });

    it('handles difficulty changes on resize', () => {
      mineSweeper.initGame();
      // Start with intermediate
      const intermediateBtn = difficultyButtons.find((btn) => btn.dataset.difficulty === 'intermediate');
      intermediateBtn?.click();

      // Simulate narrow screen
      Object.defineProperty(window, 'innerWidth', { value: 300, configurable: true });
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(300); // Account for debounce

      const boardEl = document.getElementById('game-board');
      expect(boardEl?.childElementCount).toBe(6); // Should be beginner
      expect(boardEl?.children[0].childElementCount).toBe(6); // Should be beginner
    });

    it('ignores same difficulty selection', () => {
      mineSweeper.initGame();
      const beginnerBtn = difficultyButtons.find((btn) => btn.dataset.difficulty === 'beginner')!;
      beginnerBtn.click(); // Click same difficulty

      expect(mineSweeper['announcer'].announceDiffChanged).not.toHaveBeenCalled();
    });
  });

  describe('Game States', () => {
    it('announces cell reveal', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      cell.click();

      expect(mineSweeper['announcer'].announceCellRevealed).toHaveBeenCalledWith(1, 1, expect.any(Number));
    });

    it('prevents all interactions after game ends', () => {
      mineSweeper.initGame();
      mineSweeper['gameEnded'] = true;
      const cell = getCell(0, 0);

      cell.click();
      expect(cell.classList.contains('revealed')).toBe(false);
      cell.dispatchEvent(new MouseEvent('contextmenu'));
      expect(cell.classList.contains('flag')).toBe(false);
    });

    it('clears all cell tabindex when game ends', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);
      cell.setAttribute('tabIndex', '0');

      mineSweeper['endGame'](true);

      expect(cell.getAttribute('tabIndex')).toBe('-1');
    });

    it('updates smiley face on game end', () => {
      mineSweeper.initGame();

      mineSweeper['endGame'](true);
      expect(document.getElementById('smiley-img')?.getAttribute('src')).toBe('/minesweeper/smiley-victory.png');

      mineSweeper['endGame'](false);
      expect(document.getElementById('smiley-img')?.getAttribute('src')).toBe('/minesweeper/smiley-lost.png');
    });

    it('announces game victory and defeat', () => {
      mineSweeper.initGame();

      mineSweeper['endGame'](true);
      expect(mineSweeper['announcer'].announceGameWon).toHaveBeenCalled();

      mineSweeper['endGame'](false);
      expect(mineSweeper['announcer'].announceGameLost).toHaveBeenCalled();
    });

    it('shows confetti if accessibility settings allow', async () => {
      mockMatchMedia(false);
      mineSweeper.initGame();
      const mocked = vi.mocked(showConfetti);
      mineSweeper['endGame'](true);
      await vi.dynamicImportSettled();
      expect(mocked).toBeCalled();
    });

    it('resets game state when reset button clicked', () => {
      mineSweeper.initGame();
      const resetBtn = document.getElementById('smiley-btn');
      const cell = getCell(0, 0);

      // Make changes
      cell.click();
      vi.advanceTimersByTime(1000);

      // Reset
      resetBtn?.click();

      expect(document.getElementById('timer')?.innerText).toBe('00');
      expect(document.getElementById('flag-count')?.innerText).toBe('4');
      expect(document.getElementById('smiley-img')?.getAttribute('src')).toBe('/minesweeper/smiley.png');
      expect(mineSweeper['announcer'].announceGameReset).toHaveBeenCalled();
    });
  });

  describe('Win condition', () => {
    it('finished game on last empty cell', () => {
      mineSweeper.initGame();

      mineSweeper['firstClick'] = false;
      mineSweeper['size'] = 3;
      mineSweeper['board'] = [
        ['1', 'M', '1'],
        ['1', '1', '1'],
        ['E', 'E', 'E'],
      ];
      mineSweeper['flagPositions'] = [
        [false, true, false],
        [false, false, false],
        [false, false, false],
      ];
      mineSweeper['minesCount'] = 0;
      const cell = getCell(2, 1);
      cell.click();
      expect(mineSweeper['gameEnded']).toBe(true);
    });

    it('marks unrevealed mines as flags on win', () => {
      mineSweeper.initGame();

      mineSweeper['firstClick'] = false;
      mineSweeper['size'] = 3;
      mineSweeper['board'] = [
        ['1', 'M', '1'],
        ['1', '1', '1'],
        ['E', 'E', 'E'],
      ];
      mineSweeper['flagPositions'] = [
        [false, false, true],
        [false, false, false],
        [false, false, false],
      ];
      mineSweeper['minesCount'] = 1;
      const cell = getCell(2, 1);
      cell.click();
      expect(mineSweeper['gameEnded']).toBe(true);
      expect(getCell(0, 1).classList.contains('flag')).toBe(true);
    });
  });

  describe('Mine Reveal & Lose Condition', () => {
    it('reveals exploded mine and ends game on mine click', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      // Force first click to generate mines, then place mine at clicked position
      mineSweeper['firstClick'] = false;
      mineSweeper['board'][0][0] = 'M';

      cell?.click();

      expect(mineSweeper['board'][0][0]).toBe('RM'); // Mine becomes exploded mine
      expect(mineSweeper['gameEnded']).toBe(true);
      expect(cell?.classList.contains('collision')).toBe(true);
    });

    it('reveals all remaining mines when game is lost', () => {
      mineSweeper.initGame();
      const firstCell = getCell(0, 0);
      const secondCell = getCell(0, 1);

      // Setup board with mines
      mineSweeper['firstClick'] = false;
      mineSweeper['board'][0][0] = 'M'; // Mine to be clicked
      mineSweeper['board'][0][1] = 'M'; // Mine to be revealed

      firstCell?.click();

      expect(secondCell?.classList.contains('mine')).toBe(true);
    });

    it('does not reveal flagged mines when game is lost', () => {
      mineSweeper.initGame();
      const firstCell = getCell(0, 0);
      const flaggedCell = getCell(0, 1);

      // Setup board and flag a mine
      mineSweeper['firstClick'] = false;
      mineSweeper['board'][0][0] = 'M'; // Mine to be clicked
      mineSweeper['board'][0][1] = 'M'; // Flagged mine
      flaggedCell?.dispatchEvent(new MouseEvent('contextmenu'));

      firstCell?.click();

      expect(flaggedCell?.classList.contains('flag')).toBe(true);
      expect(flaggedCell?.classList.contains('mine')).toBe(false);
    });

    it('updates smiley image on mine explosion', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      mineSweeper['firstClick'] = false;
      mineSweeper['board'][0][0] = 'M';

      cell?.click();

      expect(document.getElementById('smiley-img')?.getAttribute('src')).toBe('/minesweeper/smiley-lost.png');
    });

    it('announces game lost when mine is clicked', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      mineSweeper['firstClick'] = false;
      mineSweeper['board'][0][0] = 'M';

      cell?.click();

      expect(mineSweeper['announcer'].announceGameLost).toHaveBeenCalled();
    });

    it('stops timer when mine is exploded', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      // Start game first
      mineSweeper['gameStarted'] = true;
      mineSweeper['firstClick'] = false;
      mineSweeper['board'][0][0] = 'M';

      cell?.click();
      vi.advanceTimersByTime(1000);

      // Timer should not continue after game end
      expect(mineSweeper['gameEnded']).toBe(true);
    });

    it('prevents further cell interactions after mine explosion', () => {
      mineSweeper.initGame();
      const firstCell = getCell(0, 0);
      const otherCell = getCell(0, 2);

      mineSweeper['firstClick'] = false;
      mineSweeper['board'][0][0] = 'M';

      firstCell?.click(); // Explode mine
      otherCell?.click(); // Try to click another cell

      expect(otherCell?.classList.contains('revealed')).toBe(false);
    });

    it('prevents flagging after mine explosion', () => {
      mineSweeper.initGame();
      const firstCell = getCell(0, 0);
      const otherCell = getCell(0, 2);

      mineSweeper['firstClick'] = false;
      mineSweeper['board'][0][0] = 'M';

      firstCell?.click(); // Explode mine
      otherCell?.dispatchEvent(new MouseEvent('contextmenu'));

      expect(otherCell?.classList.contains('flag')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('updates aria-label for revealed cells with mine count', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      // Mock a cell with adjacent mines
      mineSweeper['board'][0][0] = '2';
      mineSweeper['renderCellUpdate'](0, 0, '2');

      expect(cell?.getAttribute('aria-label')).toBe('Cell revealed, 2 adjacent mine(s)');
    });

    it('updates aria-label for revealed empty cells', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      mineSweeper['renderCellUpdate'](0, 0, 'RE');

      expect(cell?.getAttribute('aria-label')).toBe('Revealed empty cell');
    });

    it('sets appropriate aria-label for mine cells', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      mineSweeper['renderCellUpdate'](0, 0, 'M');

      expect(cell?.getAttribute('aria-label')).toBe('Mine');
      expect(cell?.querySelector('img')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('sets appropriate aria-label for exploded mine', () => {
      mineSweeper.initGame();
      const cell = getCell(0, 0);

      mineSweeper['renderCellUpdate'](0, 0, 'RM');

      expect(cell?.getAttribute('aria-label')).toBe('Exploded mine. Go back and start a new game or change difficulty');
    });

    it('maintains proper grid structure with aria attributes', () => {
      mineSweeper.initGame();
      const rows = Array.from(document.getElementById('game-board')?.children || []);

      rows.forEach((row, rowIndex) => {
        expect(row.getAttribute('role')).toBe('row');
        Array.from(row.children).forEach((cell, colIndex) => {
          expect(cell.getAttribute('aria-rowindex')).toBe(String(rowIndex + 1));
          expect(cell.getAttribute('aria-colindex')).toBe(String(colIndex + 1));
          expect(cell.getAttribute('role')).toBe('gridcell');
        });
      });
    });
  });
});
