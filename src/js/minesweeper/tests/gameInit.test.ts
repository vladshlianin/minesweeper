import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const importModule = () => import('../../index');

describe('Game Initialization', () => {
  const mockInitGame = vi.fn();
  const constructorCb = vi.fn();
  // Make errors silent
  vi.spyOn(console, 'error').mockImplementation(vi.fn());

  class MockAdapter {
    // This is how we keep track of initialized instances
    public static instances: MockAdapter[] = [];
    public initGame = mockInitGame;
    public static clearInstances() {
      MockAdapter.instances = [];
    }
    constructor() {
      constructorCb();
      MockAdapter.instances.push(this);
    }
  }

  beforeEach(() => {
    MockAdapter.clearInstances();
    // Mock the MineSweeper module
    vi.doMock('../index', () => {
      return { MineSweeper: MockAdapter };
    });
    // Reset mocks
    mockInitGame.mockReset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize game on DOMContentLoaded', async () => {
    await importModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    // Exactly 1 instance created
    expect(MockAdapter.instances.length).toBe(1);
    expect(MockAdapter.instances[0].initGame).toBeCalledTimes(1);
  });

  it('should not initialize game before DOM is ready', async () => {
    await importModule();
    expect(MockAdapter.instances.length).toBe(0);
  });
});
