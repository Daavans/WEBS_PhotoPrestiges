jest.mock('../config', () => ({
  jwt: {
    secret: 'test-secret-key',
    expiry: '1h',
    refreshExpiry: '7d',
  },
}));

const jwtUtils = require('../utils/jwt');

describe('JWT Utils', () => {
  describe('generateAccessToken', () => {
    it('should generate a valid access token with correct payload', () => {
      const payload = { userId: 'user123', email: 'test@example.com', role: 'user' };
      const token = jwtUtils.generateAccessToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include type=access in the token', () => {
      const token = jwtUtils.generateAccessToken({ userId: 'u1', email: 'a@b.com', role: 'user' });
      const decoded = jwtUtils.decodeToken(token);
      expect(decoded.type).toBe('access');
      expect(decoded.userId).toBe('u1');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a refresh token with type=refresh', () => {
      const token = jwtUtils.generateRefreshToken({ userId: 'user456' });
      const decoded = jwtUtils.decodeToken(token);
      expect(decoded.type).toBe('refresh');
      expect(decoded.userId).toBe('user456');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = jwtUtils.generateAccessToken({ userId: 'u1', email: 'a@b.com', role: 'user' });
      const decoded = jwtUtils.verifyToken(token);
      expect(decoded.userId).toBe('u1');
    });

    it('should throw on an invalid token', () => {
      expect(() => jwtUtils.verifyToken('invalid.token.here')).toThrow();
    });
  });

  describe('getExpiresInSeconds', () => {
    it('should convert hours to seconds', () => {
      expect(jwtUtils.getExpiresInSeconds('1h')).toBe(3600);
    });

    it('should convert days to seconds', () => {
      expect(jwtUtils.getExpiresInSeconds('7d')).toBe(604800);
    });

    it('should convert minutes to seconds', () => {
      expect(jwtUtils.getExpiresInSeconds('30m')).toBe(1800);
    });

    it('should return 86400 for unrecognized formats', () => {
      expect(jwtUtils.getExpiresInSeconds('invalid')).toBe(86400);
    });
  });
});
