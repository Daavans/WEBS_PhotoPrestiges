function bufferToBase64(buffer, format) {
  const mime = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function storePhoto(buffer, format) {
  const dataUrl = bufferToBase64(buffer, format);
  return { url: dataUrl, storageKey: null };
}

function storeThumbnail(buffer, format) {
  const thumbnailUrl = bufferToBase64(buffer, format);
  return { thumbnailUrl, thumbnailStorageKey: null };
}

module.exports = { storePhoto, storeThumbnail, bufferToBase64 };
