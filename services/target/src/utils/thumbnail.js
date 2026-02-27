const sharp = require('sharp');
const config = require('../config');

const THUMBNAIL_SIZE = 300;

async function validateDimensions(buffer) {
  const meta = await sharp(buffer).metadata();
  const { width, height } = meta;

  if (width < config.minWidth || height < config.minHeight) {
    return {
      valid: false,
      message: `Image too small. Minimum dimensions: ${config.minWidth}x${config.minHeight}px`,
    };
  }
  if (width > config.maxWidth || height > config.maxHeight) {
    return {
      valid: false,
      message: `Image too large. Maximum dimensions: ${config.maxWidth}x${config.maxHeight}px`,
    };
  }
  return { valid: true, width, height };
}

async function generateThumbnail(buffer, format) {
  const sharpFormat = format === 'jpg' ? 'jpeg' : format;
  const thumb = await sharp(buffer)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover', position: 'centre' })
    .toFormat(sharpFormat)
    .toBuffer();
  return thumb;
}

module.exports = { validateDimensions, generateThumbnail };
