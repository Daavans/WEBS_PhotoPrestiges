jest.mock('../db/connect', () => ({ getDb: jest.fn() }));
jest.mock('../db/queries');
jest.mock('axios');
jest.mock('../utils/thumbnail', () => ({
  validateDimensions: jest.fn(),
  generateThumbnail: jest.fn(),
}));
jest.mock('../utils/storage', () => ({
  storePhoto: jest.fn(),
  storeThumbnail: jest.fn(),
}));
jest.mock('../utils/analysis', () => ({
  analyseImage: jest.fn(),
  isFlagged: jest.fn(),
  compareImages: jest.fn(),
}));
jest.mock('../config', () => ({
  mailServiceUrl: null,
  serviceSecret: null,
  frontendUrl: 'http://localhost:3000',
  unsubscribeUrl: 'http://localhost/unsubscribe',
  storage: { uploadDir: '/tmp/uploads', thumbnailDir: '/tmp/thumbs' },
  imagga: { apiKey: null, apiSecret: null },
}));

const { validateDimensions, generateThumbnail } = require('../utils/thumbnail');
const { storePhoto, storeThumbnail } = require('../utils/storage');
const { getDb } = require('../db/connect');
const queries = require('../db/queries');
const targetService = require('../services/targetService');

describe('targetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDb.mockReturnValue({ collection: jest.fn() });
  });

  describe('uploadPhoto', () => {
    it('should return error when image dimensions are invalid', async () => {
      validateDimensions.mockResolvedValue({ valid: false, message: 'Image too small' });

      const result = await targetService.uploadPhoto({
        file: { buffer: Buffer.from('fake'), mimetype: 'image/jpeg' },
        title: 'Test',
        userId: '507f1f77bcf86cd799439011',
      });

      expect(result.error).toBe('Image too small');
    });

    it('should upload photo and return metadata on success', async () => {
      validateDimensions.mockResolvedValue({ valid: true });
      generateThumbnail.mockResolvedValue(Buffer.from('thumb'));
      storePhoto.mockReturnValue({ url: 'http://localhost/photo.jpg' });
      storeThumbnail.mockReturnValue({ thumbnailUrl: 'http://localhost/thumb.jpg' });
      queries.createPhoto.mockResolvedValue({ toString: () => 'photo123' });

      const result = await targetService.uploadPhoto({
        file: { buffer: Buffer.from('fake'), mimetype: 'image/jpeg' },
        title: 'Beach Sunset',
        description: 'A beautiful sunset',
        tags: ['sunset', 'beach'],
        userId: '507f1f77bcf86cd799439011',
        type: 'photo',
      });

      expect(result.photo).toBeDefined();
      expect(result.photo.id).toBeDefined();
      expect(result.photo.url).toBe('http://localhost/photo.jpg');
    });
  });

  describe('getFormat (via uploadPhoto)', () => {
    it('should handle png mimetype', async () => {
      validateDimensions.mockResolvedValue({ valid: true });
      generateThumbnail.mockResolvedValue(Buffer.from('thumb'));
      storePhoto.mockReturnValue({ url: 'http://localhost/photo.png' });
      storeThumbnail.mockReturnValue({ thumbnailUrl: 'http://localhost/thumb.png' });
      queries.createPhoto.mockResolvedValue({ toString: () => 'photo456' });

      const result = await targetService.uploadPhoto({
        file: { buffer: Buffer.from('fake'), mimetype: 'image/png' },
        title: 'PNG Photo',
        userId: '507f1f77bcf86cd799439011',
      });

      expect(result.photo.url).toContain('.png');
    });
  });
});
