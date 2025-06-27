import { MineSweeper } from './minesweeper';

const initGame = () => {
  const mineSweeper = new MineSweeper();
  mineSweeper.initGame();
};

document.addEventListener('DOMContentLoaded', initGame);
