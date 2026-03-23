export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, apiKey } = req.body;

  try {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Upload image to deep-image.ai using multipart
    const boundary = 'RenderUp' + Date.now();
    const CRLF = '\r\n';

    const part1 = Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="image"; filename="render.png"${CRLF}` +
      `Content-Type: image/png${CRLF}${CRLF}`
    );
    const part2 = Buffer.from(
      `${CRLF}--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="width"${CRLF}${CRLF}` +
      `x4` +
      `${CRLF}--${boundary}--${CRLF}`
    );

    const body = Buffer.concat([part1, imageBuffer, part2]);

    const r = await fetch('https://deep-image.ai/rest_api/process_result', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(r.status).json({ error: errText });
    }

    const data = await r.json();
    if (!data.result_url) {
      return res.status(500).json({ error: data.message || 'No output received' });
    }

    return res.status(200).json({ output: data.result_url });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
