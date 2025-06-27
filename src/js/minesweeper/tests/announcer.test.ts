import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Announcer } from '../announcer';
import * as utils from '../utils';
import * as dom from '../dom';

vi.mock('../utils');
vi.mock('../dom');

describe('Announcer', () => {
  const mockFormatTime = vi.fn();

  // Create a mock HTMLElement
  let mockElement = { innerText: '' } as HTMLElement;
  let announcer: Announcer;

  beforeEach(async () => {
    // Reset mocks
    mockElement = { innerText: '' } as HTMLElement;
    mockFormatTime.mockReset();

    vi.mocked(utils.formatTime).mockImplementation(mockFormatTime);
    vi.mocked(dom.getById).mockReturnValue(mockElement);
    // Reset instance
    announcer = new Announcer();
  });

  describe('announceGameReady', () => {
    it('should announce beginner difficulty', () => {
      announcer.announceGameReady('beginner', 6, 4);
      expect(mockElement.innerText).toContain('beginner difficulty selected');
      expect(mockElement.innerText).toContain('6 by 6 grid with 4 mines');
    });

    it('should announce intermediate difficulty', () => {
      const announcer = new Announcer();
      announcer.announceGameReady('intermediate', 9, 10);

      expect(mockElement.innerText).toContain('intermediate difficulty selected');
      expect(mockElement.innerText).toContain('9 by 9 grid with 10 mines');
    });
  });

  it('should announce difficulty change with new settings', () => {
    announcer.announceDiffChanged('expert', 14, 35);
    expect(mockElement.innerText).toBe(`Difficulty changed to expert. 14 by 14 grid with 35 mines.`);
  });

  it('should announce game reset', () => {
    announcer.announceGameReset();
    expect(mockElement.innerText).toBe('New game started. Board reset. Good luck!');
  });

  describe('announceCellFlagged', () => {
    it('should announce cell flagged with position and remaining flags', () => {
      announcer.announceCellFlagged(2, 3, 5);
      expect(mockElement.innerText).toBe('Cell flagged at row 2, column 3. 5 flag(s) remaining.');
    });

    it('should handle single flag remaining', () => {
      announcer.announceCellFlagged(0, 0, 1);
      expect(mockElement.innerText).toBe('Cell flagged at row 0, column 0. 1 flag(s) remaining.');
    });

    it('should handle zero flags remaining', () => {
      announcer.announceCellFlagged(5, 7, 0);
      expect(mockElement.innerText).toBe('Cell flagged at row 5, column 7. 0 flag(s) remaining.');
    });

    it('should handle negative flags remaining (overspending)', () => {
      announcer.announceCellFlagged(6, 5, -1);
      expect(mockElement.innerText).toBe("Cell flagged at row 6, column 5. You've placed too many, remove -1 flag(s).");
    });
  });

  it('should announce game lost', () => {
    announcer.announceGameLost();
    expect(mockElement.innerText).toBe('Mine exploded, game over! Press smiley button to start new game.');
  });

  it('should announce game won', () => {
    announcer.announceGameWon();
    expect(mockElement.innerText).toBe('Congratulations, you won! Press smiley button to start new game.');
  });

  describe('announceCellUnflagged', () => {
    it('should announce cell unflagged with position and remaining flags', () => {
      announcer.announceCellUnflagged(1, 4, 8);
      expect(mockElement.innerText).toBe('Flag removed at row 1, column 4. 8 flag(s) remaining.');
    });

    it('should handle different positions', () => {
      announcer.announceCellUnflagged(10, 15, 3);
      expect(mockElement.innerText).toBe('Flag removed at row 10, column 15. 3 flag(s) remaining.');
    });

    it('should handle negative flags remaining (overspending)', () => {
      announcer.announceCellUnflagged(6, 5, -1);
      expect(mockElement.innerText).toBe("Flag removed at row 6, column 5. You've placed too many, remove -1 flag(s).");
    });
  });

  describe('announceCellRevealed', () => {
    it('should announce empty cell revelation with area clearing message', () => {
      announcer.announceCellRevealed(2, 3, 0);
      expect(mockElement.innerText).toBe('Empty cell revealed at row 2, column 3. Area cleared automatically.');
    });

    it('should announce cell with single adjacent mine', () => {
      announcer.announceCellRevealed(1, 1, 1);
      expect(mockElement.innerText).toBe('Cell revealed at row 1, column 1. 1 adjacent mine.');
    });

    it('should announce cell with multiple adjacent mines', () => {
      announcer.announceCellRevealed(4, 6, 3);
      expect(mockElement.innerText).toBe('Cell revealed at row 4, column 6. 3 adjacent mines.');
    });
  });

  describe('announceTimeElapsed', () => {
    it('should announce elapsed time', () => {
      mockFormatTime.mockReturnValue('30 seconds');
      announcer.announceTimeElapsed(30);
      expect(mockFormatTime).toHaveBeenCalledWith(30);
      expect(mockElement.innerText).toBe('30 seconds elapsed.');
    });

    it('should pass correct time values to formatTime', () => {
      const testTimes = [0, 30, 60, 90, 120, 300];

      testTimes.forEach((time) => {
        announcer.announceTimeElapsed(time);
        expect(mockFormatTime).toHaveBeenCalledWith(time);
      });

      expect(mockFormatTime).toHaveBeenCalledTimes(testTimes.length);
    });
  });

  it('should update the same element for multiple announcements', () => {
    announcer.announceGameReady('intermediate', 9, 10);
    const firstMessage = mockElement.innerText;

    announcer.announceGameReset();
    const secondMessage = mockElement.innerText;

    expect(firstMessage).not.toBe(secondMessage);
    expect(mockElement.innerText).toBe('New game started. Board reset. Good luck!');
  });
});
