jest.mock('../db/connect', () => ({ getDb: jest.fn() }));
jest.mock('../db/queries');

const { getDb } = require('../db/connect');
const queries = require('../db/queries');
const readService = require('../services/readService');

describe('readService', () => {
  beforeEach(() => {
    getDb.mockReturnValue({});
    jest.clearAllMocks();
  });

  describe('getPhoto', () => {
    it('should return error when photo is not found', async () => {
      queries.findPhotoById.mockResolvedValue(null);
      const result = await readService.getPhoto('nonexistentid');
      expect(result.error).toMatch(/not found/i);
    });

    it('should return photo when found', async () => {
      const mockPhoto = { _id: 'photo123', title: 'Sunset', url: 'http://example.com/photo.jpg' };
      queries.findPhotoById.mockResolvedValue(mockPhoto);
      const result = await readService.getPhoto('photo123');
      expect(result.photo).toEqual(mockPhoto);
    });
  });

  describe('search', () => {
    it('should return empty results for empty query', async () => {
      const result = await readService.search('');
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return empty results for whitespace-only query', async () => {
      const result = await readService.search('   ');
      expect(result.items).toHaveLength(0);
    });

    it('should search photos with valid query', async () => {
      queries.searchPhotos.mockResolvedValue({ items: [{ title: 'Sunset' }], total: 1 });
      const result = await readService.search('sunset');
      expect(result.total).toBe(1);
    });
  });

  describe('getUserProfile', () => {
    it('should return error when user is not found', async () => {
      queries.findUserProfile.mockResolvedValue(null);
      queries.findUserStats.mockResolvedValue(null);
      const result = await readService.getUserProfile('unknownuser');
      expect(result.error).toMatch(/not found/i);
    });

    it('should return profile and stats when user exists', async () => {
      const mockProfile = { _id: 'u1', username: 'testuser' };
      const mockStats = { totalPhotos: 5, points: 100 };
      queries.findUserProfile.mockResolvedValue(mockProfile);
      queries.findUserStats.mockResolvedValue(mockStats);

      const result = await readService.getUserProfile('u1');
      expect(result.profile).toEqual(mockProfile);
      expect(result.stats).toEqual(mockStats);
    });
  });

  describe('getPhotos', () => {
    it('should return photos with default pagination', async () => {
      queries.findPhotos.mockResolvedValue({ items: [], total: 0 });
      const result = await readService.getPhotos();
      expect(queries.findPhotos).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: 0, limit: 20 })
      );
    });

    it('should apply correct skip for page 2', async () => {
      queries.findPhotos.mockResolvedValue({ items: [], total: 0 });
      await readService.getPhotos({ page: 2, limit: 10 });
      expect(queries.findPhotos).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: 10, limit: 10 })
      );
    });
  });
});
