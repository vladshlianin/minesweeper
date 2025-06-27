import { getById } from './dom';
import { formatTime } from './utils';

import type { Difficulty } from './types';

/**
 * Manages accessibility announcements for a Minesweeper game by updating
 * the content of an ARIA live region to communicate game state changes
 * to screen readers and other assistive technologies.
 *
 * @example
 * const announcer = new Announcer();
 * announcer.announceGameReady('Beginner', 6, 4);
 * announcer.announceCellRevealed(2, 3, 4);
 */
export class Announcer {
  // The DOM element that serves as the ARIA live region for announcements
  private announceEl = getById('game-status-announce');

  /**
   * Announces that a new game is ready to play with current settings.
   * Includes instructions for basic game controls.
   * @param currentDifficulty - Selected difficulty level
   * @param size - Dimensions of the square grid
   * @param minesCount - Total number of mines in the game
   */
  public announceGameReady(currentDifficulty: Difficulty, size: number, minesCount: number) {
    const message = `Minesweeper game ready. ${currentDifficulty} difficulty selected. 
      ${size} by ${size} grid with ${minesCount} mines. 
      Use Enter or Left Click to reveal cells. Use Space or Right Click to flag mines. 
      Press the reset button to start a new game.`;
    this.announce(message);
  }

  /**
   * Announces when the difficulty level has been changed.
   * @param currentDifficulty - Selected difficulty level
   * @param size - Dimensions of the new square grid
   * @param minesCount - Total number of mines in the new configuration
   */
  public announceDiffChanged(currentDifficulty: Difficulty, size: number, minesCount: number) {
    const message = `Difficulty changed to ${currentDifficulty}. ${size} by ${size} grid with ${minesCount} mines.`;
    this.announce(message);
  }

  // Announces that the game has been reset and a new game has started.
  public announceGameReset() {
    this.announce('New game started. Board reset. Good luck!');
  }

  /**
   * Announces when a cell has been flagged
   * @param row - Row of the flagged cell
   * @param col - Column of the flagged cell
   * @param remainingFlags - The number of flags still available to place
   */
  public announceCellFlagged(row: number, col: number, remainingFlags: number) {
    const cellPosition = `row ${row}, column ${col}`;
    const remainingMessage =
      remainingFlags >= 0
        ? `${remainingFlags} flag(s) remaining`
        : `You've placed too many, remove ${remainingFlags} flag(s)`;
    this.announce(`Cell flagged at ${cellPosition}. ${remainingMessage}.`);
  }

  /**
   * Announces when a flag has been removed from a cell.
   * @param row - Row of the unflagged cell
   * @param col - Column of the unflagged cell
   * @param remainingFlags - The number of flags still available to place
   */
  public announceCellUnflagged(row: number, col: number, remainingFlags: number) {
    const cellPosition = `row ${row}, column ${col}`;
    const remainingMessage =
      remainingFlags >= 0
        ? `${remainingFlags} flag(s) remaining`
        : `You've placed too many, remove ${remainingFlags} flag(s)`;
    const message = `Flag removed at ${cellPosition}. ${remainingMessage}.`;
    this.announce(message);
  }

  /**
   * Announces when a cell has been revealed, including information about adjacent mines
   * or area clearing if empty cell is revealed
   * @param row - The row index of the revealed cell (zero-based)
   * @param col - The column index of the revealed cell (zero-based)
   * @param adjacentMines - The number of mines adjacent to the revealed cell
   */
  public announceCellRevealed(row: number, col: number, adjacentMines: number) {
    const cellPosition = `row ${row}, column ${col}`;
    if (adjacentMines === 0) {
      this.announce(`Empty cell revealed at ${cellPosition}. Area cleared automatically.`);
    } else {
      this.announce(`Cell revealed at ${cellPosition}. ${adjacentMines} adjacent mine${adjacentMines > 1 ? 's' : ''}.`);
    }
  }

  // Announces that the player has lost the game by revealing a mine.
  // Provides instructions for starting a new game.
  public announceGameLost() {
    this.announce('Mine exploded, game over! Press smiley button to start new game.');
  }

  // Announces when the player has successfully won the game.
  // Provides instructions for starting a new game.
  public announceGameWon() {
    this.announce('Congratulations, you won! Press smiley button to start new game.');
  }

  /**
   * Announces the elapsed game time using a human-readable format.
   * @param time - The elapsed time in seconds
   */
  public announceTimeElapsed(time: number) {
    this.announce(`${formatTime(time)} elapsed.`);
  }

  /**
   * Core announcement method that updates the ARIA live region content.
   * @param message - The message for assistive technologies
   */
  private announce(message: string) {
    this.announceEl.innerText = message;
  }
}
