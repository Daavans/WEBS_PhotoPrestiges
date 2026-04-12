jest.mock('../db/connect', () => ({
  getDb: jest.fn(),
}));
jest.mock('../db/queries');
jest.mock('../utils/jwt');
jest.mock('../config', () => ({
  jwt: { secret: 'test-secret', expiry: '1h', refreshExpiry: '7d' },
  bcryptRounds: 10,
}));

const bcrypt = require('bcryptjs');
const { getDb } = require('../db/connect');
const dbQueries = require('../db/queries');
const jwtUtils = require('../utils/jwt');
const authService = require('../services/authService');

describe('authService', () => {
  let mockDb;

  beforeEach(() => {
    mockDb = { collection: jest.fn() };
    getDb.mockReturnValue(mockDb);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return null when user is not found', async () => {
      dbQueries.findUserByEmail.mockResolvedValue(null);
      const result = await authService.login('notfound@example.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      dbQueries.findUserByEmail.mockResolvedValue({
        _id: { toString: () => 'uid1' },
        email: 'user@example.com',
        password_hash: await bcrypt.hash('correct-password', 1),
        role: 'user',
      });
      const result = await authService.login('user@example.com', 'wrong-password');
      expect(result).toBeNull();
    });

    it('should return tokens on successful login', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 1);
      dbQueries.findUserByEmail.mockResolvedValue({
        _id: { toString: () => 'uid1' },
        email: 'user@example.com',
        password_hash: passwordHash,
        role: 'user',
      });
      dbQueries.hashToken.mockReturnValue('hash123');
      dbQueries.createSession.mockResolvedValue();
      jwtUtils.generateAccessToken.mockReturnValue('access-token');
      jwtUtils.generateRefreshToken.mockReturnValue('refresh-token');
      jwtUtils.decodeToken.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      jwtUtils.getExpiresInSeconds.mockReturnValue(3600);

      const result = await authService.login('user@example.com', 'correct-password');
      expect(result).not.toBeNull();
      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('user@example.com');
    });
  });

  describe('validate', () => {
    it('should return valid user info from decoded token', () => {
      const decoded = { userId: 'uid1', email: 'user@example.com', role: 'admin' };
      const result = authService.validate(decoded);
      expect(result.valid).toBe(true);
      expect(result.user.id).toBe('uid1');
      expect(result.user.role).toBe('admin');
    });
  });
});
