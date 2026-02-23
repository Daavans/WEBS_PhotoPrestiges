const axios = require('axios');
const config = require('../config');

async function analyseWithImagga(imageUrl) {
  if (!config.imaggaApiKey || !config.imaggaApiSecret) return null;

  try {
    const auth = Buffer.from(`${config.imaggaApiKey}:${config.imaggaApiSecret}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}` };
    const encodedUrl = encodeURIComponent(imageUrl);

    const [tagsRes, colorsRes] = await Promise.all([
      axios.get(`https://api.imagga.com/v2/tags?image_url=${encodedUrl}`, { headers }),
      axios.get(`https://api.imagga.com/v2/colors?image_url=${encodedUrl}`, { headers }),
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
    console.warn('Imagga analysis failed:', err.message);
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

module.exports = { analyseImage, isFlagged };
