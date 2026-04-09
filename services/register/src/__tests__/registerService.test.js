jest.mock('../db/connect', () => ({ getDb: jest.fn() }));
jest.mock('../db/queries');
jest.mock('axios');
jest.mock('../config', () => ({
  bcryptRounds: 10,
  mailServiceUrl: null,
  publicBaseUrl: 'http://localhost:3002',
  port: 3002,
  serviceSecret: null,
  unsubscribeUrl: 'http://localhost/unsubscribe',
  verificationTokenExpiry: '24h',
}));

const { getDb } = require('../db/connect');
const dbQueries = require('../db/queries');
const registerService = require('../services/registerService');

describe('registerService', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = {};
    getDb.mockReturnValue(mockDb);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should return conflict when email already exists', async () => {
      dbQueries.findUserByEmailForAuth.mockResolvedValue({ _id: 'existing' });
      const result = await registerService.register({
        email: 'taken@example.com',
        password: 'password123',
      });
      expect(result.conflict).toBe('email');
    });

    it('should return conflict when username already exists', async () => {
      dbQueries.findUserByEmailForAuth.mockResolvedValue(null);
      dbQueries.findUserByUsername.mockResolvedValue({ _id: 'existing' });
      const result = await registerService.register({
        email: 'new@example.com',
        password: 'password123',
        username: 'takenuser',
      });
      expect(result.conflict).toBe('username');
    });

    it('should successfully register a new user', async () => {
      dbQueries.findUserByEmailForAuth.mockResolvedValue(null);
      dbQueries.findUserByUsername.mockResolvedValue(null);
      dbQueries.createUser.mockResolvedValue({ toString: () => 'newuserid' });
      dbQueries.createUserStats.mockResolvedValue();
      dbQueries.createEmailVerification.mockResolvedValue();

      const result = await registerService.register({
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      });
      expect(result.userId).toBeDefined();
      expect(result.message).toMatch(/verif/i);
    });
  });

  describe('parseExpiryToMs (via register)', () => {
    it('should handle registration without username', async () => {
      dbQueries.findUserByEmailForAuth.mockResolvedValue(null);
      dbQueries.createUser.mockResolvedValue({ toString: () => 'uid2' });
      dbQueries.createUserStats.mockResolvedValue();
      dbQueries.createEmailVerification.mockResolvedValue();

      const result = await registerService.register({
        email: 'nouser@example.com',
        password: 'pass123',
      });
      expect(result.userId).toBeDefined();
    });
  });
});
