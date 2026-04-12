jest.mock('../db/connect', () => ({ getDb: jest.fn() }));
jest.mock('../db/queries');
jest.mock('../jobs', () => ({
  getJobList: jest.fn(),
  toggleJob: jest.fn(),
  triggerJob: jest.fn(),
}));

const { getDb } = require('../db/connect');
const { findExecutionHistory, findLastExecution } = require('../db/queries');
const { getJobList, toggleJob, triggerJob } = require('../jobs');
const clockService = require('../services/clockService');

describe('clockService', () => {
  beforeEach(() => {
    getDb.mockReturnValue({});
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should return scheduler status with job counts', () => {
      getJobList.mockReturnValue([
        { id: 'cleanup-sessions', enabled: true },
        { id: 'aggregate-stats', enabled: false },
        { id: 'check-deadlines', enabled: true },
      ]);

      const result = clockService.getStatus();
      expect(result.status).toBe('ok');
      expect(result.totalJobs).toBe(3);
      expect(result.activeJobs).toBe(2);
    });
  });

  describe('toggle', () => {
    it('should return error when job is not found', () => {
      toggleJob.mockReturnValue(null);
      const result = clockService.toggle('nonexistent-job', true);
      expect(result.error).toMatch(/not found/i);
    });

    it('should toggle job successfully', () => {
      toggleJob.mockReturnValue({ id: 'cleanup-sessions', enabled: false });
      const result = clockService.toggle('cleanup-sessions', false);
      expect(result.jobId).toBe('cleanup-sessions');
      expect(result.enabled).toBe(false);
    });
  });

  describe('trigger', () => {
    it('should return error when job is not found', async () => {
      triggerJob.mockResolvedValue(null);
      const result = await clockService.trigger('unknown-job');
      expect(result.error).toMatch(/not found/i);
    });

    it('should trigger job successfully', async () => {
      triggerJob.mockResolvedValue({ id: 'cleanup-sessions' });
      const result = await clockService.trigger('cleanup-sessions');
      expect(result.triggered).toBe(true);
    });
  });

  describe('getHistory', () => {
    it('should return error for unknown job', async () => {
      getJobList.mockReturnValue([{ id: 'cleanup-sessions' }]);
      const result = await clockService.getHistory('unknown-job');
      expect(result.error).toMatch(/not found/i);
    });

    it('should return execution history', async () => {
      getJobList.mockReturnValue([{ id: 'cleanup-sessions' }]);
      findExecutionHistory.mockResolvedValue([
        { startedAt: new Date(), status: 'success', durationMs: 100 },
      ]);

      const result = await clockService.getHistory('cleanup-sessions', 10);
      expect(result.items).toHaveLength(1);
    });
  });
});
