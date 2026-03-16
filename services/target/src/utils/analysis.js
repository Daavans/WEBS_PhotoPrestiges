const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');

function getAuthHeader() {
  return `Basic ${Buffer.from(`${config.imaggaApiKey}:${config.imaggaApiSecret}`).toString('base64')}`;
}

/**
 * Upload a base64 data URL to Imagga and return the upload_id.
 * All subsequent Imagga calls use the upload_id instead of the raw base64.
 */
async function uploadToImagga(dataUrl) {
  const raw = dataUrl.startsWith('data:') ? dataUrl.split(',')[1] : dataUrl;
  const form = new FormData();
  form.append('image_base64', raw);
  const res = await axios.post('https://api.imagga.com/v2/uploads', form, {
    headers: { Authorization: getAuthHeader(), ...form.getHeaders() },
  });
  return res.data.result.upload_id;
}

async function analyseWithImagga(dataUrl) {
  if (!config.imaggaApiKey || !config.imaggaApiSecret) return null;

  try {
    const uploadId = await uploadToImagga(dataUrl);
    const headers = { Authorization: getAuthHeader() };

    const [tagsRes, colorsRes] = await Promise.all([
      axios.get(`https://api.imagga.com/v2/tags?image_upload_id=${uploadId}`, { headers }),
      axios.get(`https://api.imagga.com/v2/colors?image_upload_id=${uploadId}`, { headers }),
    ]);

    return {
      tags: tagsRes.data.result.tags.map((t) => ({
        tag: t.tag.en,
        confidence: t.confidence / 100,
        source: 'imagga',
      })),
      colors: colorsRes.data.result.colors.image_colors.map((c) => c.html_code),
    };
  } catch (err) {
    console.warn('Imagga analysis failed:', err.response?.data || err.message);
    return null;
  }
}

async function analyseWithGoogleVision(imageUrl) {
  if (!config.googleVisionApiKey) return null;

  try {
    const body = {
      requests: [
        {
          image: { source: { imageUri: imageUrl } },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'SAFE_SEARCH_DETECTION' },
          ],
        },
      ],
    };

    const res = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${config.googleVisionApiKey}`,
      body
    );

    const response = res.data.responses[0];
    return {
      labels: (response.labelAnnotations || []).map((l) => ({
        label: l.description,
        confidence: l.score,
      })),
      safeSearch: response.safeSearchAnnotation || {},
    };
  } catch (err) {
    console.warn('Google Vision analysis failed:', err.message);
    return null;
  }
}

async function analyseImage(imageUrl) {
  const [imagga, vision] = await Promise.all([
    analyseWithImagga(imageUrl),
    analyseWithGoogleVision(imageUrl),
  ]);

  return {
    imaggaTags: imagga?.tags || [],
    imaggaColors: imagga?.colors || [],
    googleLabels: vision?.labels || [],
    googleSafeSearch: vision?.safeSearch || {},
    analysedAt: new Date(),
  };
}

function isFlagged(analysis) {
  const unsafe = ['LIKELY', 'VERY_LIKELY'];
  const ss = analysis.googleSafeSearch;
  return unsafe.includes(ss.adult) || unsafe.includes(ss.violence);
}


function tagBasedSimilarity(tagsA, tagsB) {
  if (!tagsA?.length || !tagsB?.length) return 0;
  const toMap = (tags) =>
    Object.fromEntries(tags.map((t) => [t.tag.en, t.confidence / 100]));
  const mapA = toMap(tagsA);
  const mapB = toMap(tagsB);
  const common = Object.keys(mapA).filter((t) => mapB[t] != null);
  if (common.length === 0) return 0;
  const matchScore = common.reduce((s, t) => s + (mapA[t] + mapB[t]) / 2, 0);
  const totalA = Object.values(mapA).reduce((a, b) => a + b, 0);
  const totalB = Object.values(mapB).reduce((a, b) => a + b, 0);
  const maxPossible = (totalA + totalB) / 2;
  return maxPossible > 0 ? matchScore / maxPossible : 0;
}

async function compareImages(dataUrlA, dataUrlB) {
  if (!config.imaggaApiKey || !config.imaggaApiSecret) {
    throw new Error('Imagga credentials not configured');
  }

  try {
    const [idA, idB] = await Promise.all([
      uploadToImagga(dataUrlA),
      uploadToImagga(dataUrlB),
    ]);

    const headers = { Authorization: getAuthHeader() };
    const [resA, resB] = await Promise.all([
      axios.get(`https://api.imagga.com/v2/tags?image_upload_id=${idA}`, { headers }),
      axios.get(`https://api.imagga.com/v2/tags?image_upload_id=${idB}`, { headers }),
    ]);

    const tagsA = resA.data?.result?.tags;
    const tagsB = resB.data?.result?.tags;
    const score = tagBasedSimilarity(tagsA, tagsB);
    return typeof score === 'number' ? Math.round(score * 100) / 100 : null;
  } catch (err) {
    console.warn('Imagga similarity comparison failed:', err.response?.data || err.message);
    return null;
  }
}

module.exports = { analyseImage, isFlagged, compareImages };
