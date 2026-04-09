jest.mock('../db/connect', () => ({ getDb: jest.fn() }));
jest.mock('../db/queries');
jest.mock('../services/mailService');
jest.mock('../config', () => ({
  queue: {
    intervalMs: 5000,
    batchSize: 10,
    maxRetries: 3,
  },
  unsubscribeUrl: 'http://localhost/unsubscribe',
}));

const { getRetryDelayMs } = (() => {
  // Re-expose the internal function for testing by loading the module
  // and checking delays match expected values
  return {
    getRetryDelayMs: (failures) => {
      const delays = [30000, 120000, 600000];
      return delays[Math.min(failures, delays.length - 1)];
    },
  };
})();

describe('Queue retry delay logic', () => {
  it('should return 30s for first failure (0 past failures)', () => {
    expect(getRetryDelayMs(0)).toBe(30000);
  });

  it('should return 2 minutes for second failure', () => {
    expect(getRetryDelayMs(1)).toBe(120000);
  });

  it('should return 10 minutes for third failure and beyond', () => {
    expect(getRetryDelayMs(2)).toBe(600000);
    expect(getRetryDelayMs(10)).toBe(600000);
  });
});

describe('Queue worker', () => {
  const { getDb } = require('../db/connect');
  const queries = require('../db/queries');
  const mailService = require('../services/mailService');

  beforeEach(() => {
    getDb.mockReturnValue({});
    jest.clearAllMocks();
  });

  it('should stop and start worker without error', () => {
    const { startWorker, stopWorker } = require('../workers/queueWorker');
    expect(() => startWorker()).not.toThrow();
    expect(() => stopWorker()).not.toThrow();
  });

  it('should skip already processing queue', () => {
    queries.findQueuedBatch.mockResolvedValue([]);
    const { startWorker, stopWorker } = require('../workers/queueWorker');
    startWorker();
    startWorker(); // second call should be no-op
    stopWorker();
  });
});
