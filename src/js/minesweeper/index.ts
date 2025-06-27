import { initBoard, updateBoard, attachMines, findUnrevealed } from './board';
import { getById } from './dom';
import { create2dArray, debounce, getDifficulty, hasVisualAccessibilityOn, isDifficulty } from './utils';
import { Announcer } from './announcer';

import type { CellValue, Difficulty } from './types';

const SMILEY_FACES = {
  regular: 'smiley.png',
  victory: 'smiley-victory.png',
  lost: 'smiley-lost.png',
} as const;

// Map of difficulty, where first key is the size of grid in NxN pixels
// And second is the number of the mines
const DIFFICULTY_CONFIG: Record<Difficulty, [number, number]> = {
  beginner: [6, 4],
  intermediate: [9, 9],
  expert: [14, 35],
};

const BREAKPOINTS = {
  hideIntermediate: 320,
  hideExpert: 480,
};

const TIMER_UPDATE_INTERVAL = 1000;
const TIME_ANNOUNCEMENT_INTERVAL = 30;

/**
 * Shows confetti animation for game victory
 */
const showConfetti = async () => {
  // Split import into a separate chunk
  const { showConfetti: showConfettiLazy } = await import('../confetti');
  showConfettiLazy(2, 1600, 1800);
};

/**
 * Initialized event listeners, handles game logic
 * @example
 * const mineSweeper = new MineSweeper();
 * mineSweeper.initGame();
 */
export class MineSweeper {
  // Timer
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Game settings
  private minesCount: number;
  private size: number;
  private currentDifficulty: Difficulty;

  // State
  private flagPositions: boolean[][];
  private board: CellValue[][];
  private remainingFlags: number;
  private gameEnded = false;
  private gameStarted = false;
  private firstClick = true;

  // DOM references
  private buttons: HTMLButtonElement[];
  private readonly flagCounterEl = getById('flag-count');
  private readonly timerEl = getById('timer');
  private readonly boardEl = getById('game-board');
  private readonly smileyImgEl = getById<HTMLImageElement>('smiley-img');
  private readonly resetBtnEl = getById('smiley-btn');
  private readonly announcer = new Announcer();

  constructor() {
    this.currentDifficulty = getDifficulty();
    const [size, mines] = DIFFICULTY_CONFIG[this.currentDifficulty];

    // Initial size of flags is equal to the total amount of mines
    this.remainingFlags = mines;
    this.size = size;
    this.minesCount = mines;

    this.buttons = this.getDifficultyButtons();
    this.flagPositions = create2dArray(false, size);
    this.board = initBoard(size);
  }

  /**
   * Sets up click and resize event listeners for the game UI.
   */
  private setupEventListeners() {
    this.resetBtnEl.addEventListener('click', this.onResetClick.bind(this));
    // Debounced resize handler to avoid performance issues
    const debouncedResize = debounce(this.onResize.bind(this), 200);
    window.addEventListener('resize', debouncedResize);
  }

  /**
   * Handles the reset button click to restart the game.
   */
  private onResetClick() {
    this.announcer.announceGameReset();
    this.resetGame();
  }

  /**
   * Initializes the board and UI elements for a new game session.
   */
  public initGame() {
    this.initButtons();
    this.setupEventListeners();
    this.renderFlagCount(this.minesCount);
    this.renderCells(this.size);
    this.setBoardElAria(this.size);
    // Announce for screen readers
    this.announcer.announceGameReady(this.currentDifficulty, this.size, this.minesCount);
  }

  /**
   * Updates the displayed remaining flag count.
   * @param count - Number of flags remaining.
   */
  private renderFlagCount(count: number) {
    this.flagCounterEl.innerText = String(count);
  }

  /**
   * Resets the game state, board, and UI.
   */
  private resetGame() {
    this.renderFlagCount(this.minesCount);
    this.renderCells(this.size);
    this.board = initBoard(this.size);
    this.flagPositions = create2dArray(false, this.size);
    this.gameEnded = false;
    this.smileyImgEl.setAttribute('src', SMILEY_FACES.regular);
    this.remainingFlags = this.minesCount;
    this.renderFlagCount(this.minesCount);
    this.gameStarted = false;
    this.firstClick = true;
    this.resetTimer();
  }

  /**
   * Changes difficulty based on screen width.
   */
  private onResize() {
    const width = window.innerWidth;
    if (this.currentDifficulty !== 'beginner' && width <= BREAKPOINTS.hideIntermediate) {
      this.changeDifficulty('beginner');
      return;
    }
    if (this.currentDifficulty === 'expert' && width <= BREAKPOINTS.hideExpert) {
      this.changeDifficulty('intermediate');
    }
  }

  /**
   * Converts a 1D cell index to row and column coordinates.
   * @param index - The index in a flat array.
   * @returns Row and column of the cell.
   */
  private getRowColByIndex(index: number) {
    return { row: Math.floor(index / this.size), col: index % this.size };
  }

  /**
   * Converts row and column to a 1D array index.
   * @param row - Cell row index.
   * @param col - Cell column index.
   * @returns Flat index of the cell.
   */
  private getIndexByRowCol(row: number, col: number) {
    return row * this.size + col;
  }

  /**
   * Updates difficulty button styles and ARIA attributes.
   */
  private updateDifficultyButtons() {
    for (const button of this.buttons) {
      if (button.classList.contains('active')) {
        button.classList.remove('active');
        button.removeAttribute('aria-pressed');
      }
      if (button.dataset.difficulty === this.currentDifficulty) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
      }
    }
  }

  /**
   * Changes the current game difficulty and resets the game.
   * @param difficulty - The new difficulty level.
   */
  private changeDifficulty(difficulty: Difficulty) {
    if (difficulty !== this.currentDifficulty) {
      // Store new values
      this.currentDifficulty = difficulty;
      localStorage.setItem('difficulty', difficulty);
      const [size, mines] = DIFFICULTY_CONFIG[difficulty];
      this.size = size;
      this.minesCount = mines;

      this.updateDifficultyButtons();
      this.announcer.announceDiffChanged(difficulty, this.size, this.minesCount);
      this.setBoardElAria(size);
      this.resetGame();
    }
  }

  /**
   * Gets a list of difficulty buttons
   * @returns List of initialized HTML buttons.
   */
  private getDifficultyButtons() {
    const buttons = document.querySelectorAll('button[data-difficulty]');
    const buttonList: HTMLButtonElement[] = [];
    for (const button of buttons) {
      if (
        // Actual button element
        button instanceof HTMLButtonElement &&
        // Has difficulty property
        typeof button.dataset.difficulty === 'string' &&
        // And property is valid
        isDifficulty(button.dataset.difficulty)
      ) {
        buttonList.push(button);
      }
    }
    return buttonList;
  }

  /**
   * Attaches event listeners to difficulty buttons and applies styles
   */
  private initButtons() {
    for (const button of this.buttons) {
      const buttonDiff = button.dataset.difficulty;
      // Theoretically, dataset may be changed at this point
      // Also we make TS happy
      if (!buttonDiff || !isDifficulty(buttonDiff)) continue;
      if (buttonDiff === this.currentDifficulty) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
      }
      button.addEventListener('click', this.changeDifficulty.bind(this, buttonDiff));
    }
  }

  /**
   * Sets ARIA attributes for the board element.
   * @param size - Size of the board (NxN).
   */
  private setBoardElAria(size: number) {
    this.boardEl.setAttribute('aria-rowcount', String(size));
    this.boardEl.setAttribute('aria-colcount', String(size));
  }

  /**
   * Clears all cells and resets ARIA attributes.
   */
  private resetCells() {
    // Clear preexisting attributes / mutations
    const count = this.boardEl.childElementCount;
    for (let i = 0; i < count; i++) {
      const child = this.boardEl.children[i];
      const { row, col } = this.getRowColByIndex(i);

      child.className = 'cell';
      // Make only the first cell clickable by default
      child.setAttribute('tabIndex', i === 0 ? '0' : '-1');
      child.setAttribute('aria-label', 'Unrevealed cell');
      child.setAttribute('aria-rowindex', String(row + 1));
      child.setAttribute('aria-colindex', String(col + 1));
    }
    for (const child of this.boardEl.children) {
      // Remove any child nodes - e.g. images
      while (child.firstChild) {
        child.removeChild(child.firstChild);
      }
    }
  }

  /**
   * Removes excess cells from the board DOM.
   * @param delta - Number of cells to remove.
   */
  private removeCells(delta: number) {
    for (let i = 0; i < Math.abs(delta); i++) {
      // Not realistically possible, but better to have this guard
      if (!this.boardEl.lastChild) break;
      this.boardEl.removeChild(this.boardEl.lastChild);
    }
  }

  /**
   * Adds new cells to the board DOM.
   * @param startIndex - Start index for new cells.
   * @param endIndex - End index for new cells.
   */
  private addCells(startIndex: number, endIndex: number) {
    for (let i = startIndex; i < endIndex; i++) {
      const { row, col } = this.getRowColByIndex(i);

      const cell = document.createElement('button');
      cell.className = 'cell';
      // Make only first cell clickable by default
      cell.setAttribute('tabIndex', i === 0 ? '0' : '-1');
      cell.setAttribute('aria-label', 'Unrevealed cell');
      cell.setAttribute('aria-atomic', 'true');
      cell.setAttribute('aria-live', 'off');
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-rowindex', String(row + 1));
      cell.setAttribute('aria-colindex', String(col + 1));
      // Cells are reused between modes
      // So instead of directly passing row and column
      // We bind them by index and compute row/col
      cell.addEventListener('click', this.revealCell.bind(this, i));
      cell.addEventListener('keydown', (e) => this.onCellKeyDown(e, i));
      cell.addEventListener('contextmenu', (e) => {
        // Prevent context menu from showing
        e.preventDefault();
        this.toggleFlag(row, col);
      });
      this.boardEl.appendChild(cell);
    }
  }

  /**
   * Renders the board grid based on current size.
   * @param size - The dimension of the square board.
   */
  private renderCells(size: number) {
    this.boardEl.style.gridTemplateColumns = `repeat(${size}, max-content)`;

    const totalCells = size ** 2;
    const delta = totalCells - this.boardEl.childElementCount;

    this.resetCells();
    if (delta <= 0) {
      // Already present nodes - just remove access
      this.removeCells(delta);
    } else {
      this.addCells(totalCells - delta, totalCells);
    }
  }

  /**
   * Moves keyboard focus to a specific cell.
   * @param row - Target row index.
   * @param col - Target column index.
   */
  private moveFocus(row: number, col: number) {
    // Is within boundaries
    if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
      const targetIndex = this.getIndexByRowCol(row, col);
      const targetCell = this.boardEl.children[targetIndex];
      if (targetCell instanceof HTMLElement) {
        targetCell.focus();
        const targetValue = this.board[row][col];
        if (targetValue === 'E' || targetValue === 'M') {
          // Use query selector since keyboard navigation may be interrupted by mouse
          // This way we guarantee that only one element in the grid has tabIndex of 0
          const prevEl = this.boardEl.querySelector('[tabindex="0"]');
          prevEl?.setAttribute('tabIndex', '-1');
          targetCell.setAttribute('tabIndex', '0');
        }
      }
    }
  }

  /**
   * Handles key navigation and actions on a cell.
   * @param e - Keyboard event.
   * @param index - Flat index of the cell.
   */
  private onCellKeyDown(e: KeyboardEvent, index: number) {
    if (!this.gameEnded) {
      const { row, col } = this.getRowColByIndex(index);
      switch (e.key) {
        case 'ArrowUp': {
          this.moveFocus(row - 1, col);
          break;
        }
        case 'ArrowDown': {
          this.moveFocus(row + 1, col);
          break;
        }
        case 'ArrowLeft': {
          this.moveFocus(row, col - 1);
          break;
        }
        case 'ArrowRight': {
          this.moveFocus(row, col + 1);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          this.revealCell(index);
          break;
        }
        // SpaceBar
        case ' ': {
          e.preventDefault();
          this.toggleFlag(row, col);
          break;
        }
      }
    }
  }

  /**
   * Toggles a flag on a given cell.
   * @param row - Cell row index.
   * @param col - Cell column index.
   */
  private toggleFlag(row: number, col: number) {
    if (!this.gameEnded) {
      if (!this.gameStarted) {
        this.startGame();
      }
      const index = this.getIndexByRowCol(row, col);
      const target = this.boardEl.children[index];

      const cell = this.board[row][col];

      // Allow to place flags only on empty cells or mines
      if (cell === 'E' || cell === 'M') {
        const hadFlag = this.flagPositions[row][col];
        this.flagPositions[row][col] = !hadFlag;
        if (hadFlag) {
          while (target.firstChild) {
            target.removeChild(target.firstChild);
          }
          target.classList.remove('flag');
          target.setAttribute('aria-label', 'Unrevealed cell');
          this.remainingFlags++;
          this.announcer.announceCellUnflagged(row + 1, col + 1, this.remainingFlags);
        }
        if (!hadFlag) {
          const imageEl = document.createElement('img');
          imageEl.setAttribute('src', '/flag.png');
          imageEl.setAttribute('width', '20px');
          imageEl.setAttribute('height', '20px');
          target.appendChild(imageEl);
          target.classList.add('flag');
          target.setAttribute('aria-label', 'Marked as flag. Press spacebar to unmark');
          this.remainingFlags--;
          this.announcer.announceCellFlagged(row + 1, col + 1, this.remainingFlags);
        }
      }
      this.renderFlagCount(this.remainingFlags);
    }
  }

  /**
   * Renders a mine icon inside the given cell element.
   * @param value - Cell value indicating mine type.
   * @param target - DOM element to render into.
   */
  private renderMineCell(value: CellValue, target: Element) {
    const imageEl = document.createElement('img');
    imageEl.setAttribute('src', value === 'RM' ? '/collision.png' : '/bomb.png');
    imageEl.setAttribute('width', '20px');
    imageEl.setAttribute('height', '20px');
    imageEl.setAttribute('aria-hidden', 'true');
    target.appendChild(imageEl);
    if (value === 'RM') {
      target.setAttribute('aria-label', 'Exploded mine. Go back and start a new game or change difficulty');
      target.classList.add('collision');
    }
    if (value === 'M') {
      target.setAttribute('aria-label', 'Mine');
      target.classList.add('mine');
    }
  }

  /**
   * Updates a single cell in the UI based on its value.
   * @param row - Cell row index.
   * @param col - Cell column index.
   * @param value - Value to render in the cell.
   */
  private renderCellUpdate(row: number, col: number, value: CellValue) {
    const index = row * this.size + col;
    const target = this.boardEl.children[index];
    target.classList.add('revealed');
    target.setAttribute('tabIndex', '-1');
    if (value === 'RE') {
      target.setAttribute('aria-label', 'Revealed empty cell');
    }
    if (value === 'RM' || value === 'M') {
      this.renderMineCell(value, target);
      return;
    }
    if (value !== 'RE') {
      target.classList.add(`cell-${value}`);
      target.innerHTML = value;
      target.setAttribute('aria-label', `Cell revealed, ${value} adjacent mine(s)`);
    }
  }

  /**
   * Reveals all mines, optionally as flags, after game ends.
   * @param asFlags - Whether to render mines as flags.
   */
  private revealMines(asFlags: boolean) {
    const boardSize = this.board.length;
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const val = this.board[row][col];
        if (!this.flagPositions[row][col] && (val === 'M' || val === 'RM')) {
          if (asFlags) {
            this.toggleFlag(row, col);
          } else {
            this.renderCellUpdate(row, col, val);
          }
        }
      }
    }
  }

  /**
   * Ends the game and updates UI and announcements.
   * @param victory - Whether the game was won.
   */
  private endGame(victory: boolean) {
    this.gameEnded = true;
    this.smileyImgEl.setAttribute('src', victory ? SMILEY_FACES.victory : SMILEY_FACES.lost);
    this.clearTabIndexFromCells();
    if (
      victory &&
      // No need to show confetti for users prefering reduced motion
      !hasVisualAccessibilityOn()
    ) {
      showConfetti();
    }
    if (victory) this.announcer.announceGameWon();
    if (!victory) this.announcer.announceGameLost();
  }

  /**
   * Clears keyboard focus from all cells.
   */
  private clearTabIndexFromCells() {
    for (const child of this.boardEl.children) {
      if (child.getAttribute('tabIndex') === '0') {
        child.setAttribute('tabIndex', '-1');
      }
    }
  }

  /**
   * Starts the game timer and announces elapsed time periodically.
   */
  private startGame() {
    this.gameStarted = true;
    let time = 0;
    this.timerInterval = setInterval(() => {
      if (this.gameEnded && this.timerInterval !== null) {
        clearInterval(this.timerInterval);
        return;
      }
      time++;
      this.timerEl.innerText = String(time).padStart(2, '0');
      // Only announce time every 30 seconds to avoid spam
      if (time % TIME_ANNOUNCEMENT_INTERVAL === 0 && time > 0) {
        this.announcer.announceTimeElapsed(time);
      }
    }, TIMER_UPDATE_INTERVAL);
  }

  /**
   * Resets and clears the game timer.
   */
  private resetTimer() {
    if (this.timerInterval !== null) clearInterval(this.timerInterval);
    this.timerEl.innerText = '00';
  }

  /**
   * Announces cell reveal and focuses next cell.
   * @param row - Row of the revealed cell.
   * @param col - Column of the revealed cell.
   */
  private continueGameAfterReveal(row: number, col: number) {
    // Find closest unrevealed element
    const closestUnrevealed = findUnrevealed(this.board, [row, col]);
    if (closestUnrevealed) {
      const unrevealedIndex = this.getIndexByRowCol(closestUnrevealed[0], closestUnrevealed[1]);
      this.boardEl.children[unrevealedIndex].setAttribute('tabIndex', '0');
    }

    // Reveal change
    const clickedOn = this.board[row][col];
    this.announcer.announceCellRevealed(
      // Increment by one to announce correct position
      row + 1,
      col + 1,
      // Pass 0 if the cell is empty
      clickedOn !== 'RE' ? parseInt(clickedOn, 10) : 0,
    );
  }

  /**
   * Handles cell reveal logic, including mine logic and game progression.
   * @param index - Flat index of the clicked cell.
   */
  private revealCell(index: number) {
    if (!this.gameEnded) {
      if (!this.gameStarted) this.startGame();
      const { row, col } = this.getRowColByIndex(index);

      if (this.firstClick) {
        this.board = attachMines(this.board, this.minesCount, [row, col]);
        this.firstClick = false;
      }

      // Clicked on flag
      if (this.flagPositions[row][col]) return;

      // Clicked on bomb
      if (this.board[row][col] === 'M') {
        this.board[row][col] = 'RM';
        this.endGame(false);
        this.revealMines(false);
        return;
      }
      // Keep copy to check on changed nodes
      const updated = updateBoard(this.board, [row, col]);
      let hasUnopened = false;
      for (let row = 0; row < this.size; row++) {
        for (let col = 0; col < this.size; col++) {
          if (updated[row][col] === 'E') {
            hasUnopened = true;
          }
          if (updated[row][col] !== this.board[row][col]) {
            // In case marked empty cell
            if (this.flagPositions[row][col]) this.toggleFlag(row, col);
            this.renderCellUpdate(row, col, updated[row][col]);
          }
        }
      }
      this.board = updated;
      // Continue game
      if (hasUnopened) {
        this.continueGameAfterReveal(row, col);
        // Finished game
      } else {
        this.revealMines(true);
        this.endGame(true);
      }
    }
  }
}
