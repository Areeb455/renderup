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

    // DeepAI Image Super Resolution - free tier, no credit card
    const FormData = (await import('node:buffer')).Blob;
    
    const { default: fetch2 } = await import('node-fetch');
    
    // Build multipart form manually
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const CRLF = '\r\n';
    
    const header = Buffer.from(
      `--${boundary}${CRLF}Content-Disposition: form-data; name="image"; filename="render.png"${CRLF}Content-Type: image/png${CRLF}${CRLF}`
    );
    const footer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
    const body = Buffer.concat([header, imageBuffer, footer]);

    const r = await fetch('https://api.deepai.org/api/torch-srgan', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length.toString(),
      },
      body
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(r.status).json({ error: errText });
    }

    const data = await r.json();
    
    if (!data.output_url) {
      return res.status(500).json({ error: data.err || 'No output from DeepAI' });
    }

    return res.status(200).json({ output: data.output_url });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
