jest.mock('../db/connect', () => ({ getDb: jest.fn() }));
jest.mock('../db/queries');
jest.mock('axios');
jest.mock('../config', () => ({
  mailServiceUrl: null,
  serviceSecret: null,
  frontendUrl: 'http://localhost:3000',
  unsubscribeUrl: 'http://localhost/unsubscribe',
}));

const { getDb } = require('../db/connect');
const queries = require('../db/queries');
const scoreService = require('../services/scoreService');

describe('scoreService', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = { collection: jest.fn() };
    getDb.mockReturnValue(mockDb);
    jest.clearAllMocks();
  });

  describe('recordSubmission', () => {
    it('should return error when score is out of range', async () => {
      const result = await scoreService.recordSubmission({
        submissionId: 's1',
        targetPhotoId: 't1',
        userId: 'u1',
        score: 150,
        submittedAt: new Date(),
      });
      expect(result.error).toMatch(/0 and 100/);
    });

    it('should return error for negative scores', async () => {
      const result = await scoreService.recordSubmission({
        submissionId: 's1',
        targetPhotoId: 't1',
        userId: 'u1',
        score: -5,
        submittedAt: new Date(),
      });
      expect(result.error).toBeDefined();
    });

    it('should record a valid submission', async () => {
      queries.upsertSubmissionScore.mockResolvedValue();
      const result = await scoreService.recordSubmission({
        submissionId: 's1',
        targetPhotoId: 't1',
        userId: 'u1',
        score: 75,
        submittedAt: new Date(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getLeaderboard', () => {
    it('should return formatted leaderboard with rank', async () => {
      queries.findLeaderboard.mockResolvedValue({
        items: [
          { submissionId: 's1', targetPhotoId: { toString: () => 't1' }, userId: { toString: () => 'u1' }, score: 90, submittedAt: new Date() },
          { submissionId: 's2', targetPhotoId: { toString: () => 't2' }, userId: { toString: () => 'u2' }, score: 80, submittedAt: new Date() },
        ],
        total: 2,
      });

      const result = await scoreService.getLeaderboard({ limit: 10, offset: 0 });
      expect(result.leaderboard).toHaveLength(2);
      expect(result.leaderboard[0].rank).toBe(1);
      expect(result.leaderboard[1].rank).toBe(2);
      expect(result.total).toBe(2);
    });
  });

  describe('getWinner', () => {
    it('should return error when target is not found', async () => {
      queries.findSubmissionsWithTiming.mockResolvedValue({ target: null, scores: [] });
      const result = await scoreService.getWinner('unknownId');
      expect(result.error).toMatch(/not found/i);
    });

    it('should return error when contest has not ended', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      queries.findSubmissionsWithTiming.mockResolvedValue({
        target: { endsAt: futureDate },
        scores: [],
      });
      const result = await scoreService.getWinner('t1');
      expect(result.error).toMatch(/not ended/i);
    });
  });
});
