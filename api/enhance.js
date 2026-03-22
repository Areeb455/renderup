export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, apiKey } = req.body;

  try {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Using stabilityai's upscaler - actively maintained on HF
    const r = await fetch(
      'https://router.huggingface.co/hf-inference/models/caidas/swin2SR-realworld-sr-x4-64-bsrgan-psnr',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer
      }
    );

    if (!r.ok) {
      const errText = await r.text();
      // If model is loading, tell frontend to retry
      try {
        const errJson = JSON.parse(errText);
        if (errJson.estimated_time) {
          return res.status(503).json({ error: `Model loading, retry in ${Math.ceil(errJson.estimated_time)}s`, retry: true });
        }
      } catch {}
      return res.status(r.status).json({ error: errText });
    }

    const arrayBuffer = await r.arrayBuffer();
    const base64Result = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = r.headers.get('content-type') || 'image/png';

    return res.status(200).json({
      output: `data:${mimeType};base64,${base64Result}`
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
