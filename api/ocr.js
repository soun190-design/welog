export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var image = req.body && req.body.image;
  if (!image) {
    return res.status(400).json({ error: '이미지가 없습니다' });
  }

  var apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
  }

  try {
    var response = await fetch(
      'https://vision.googleapis.com/v1/images:annotate?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image },
            features: [{ type: 'TEXT_DETECTION' }],
          }],
        }),
      }
    );

    var data = await response.json();
    var annotations = data.responses &&
      data.responses[0] &&
      data.responses[0].textAnnotations;
    var text = annotations && annotations[0] && annotations[0].description;

    if (text) {
      return res.status(200).json({ text: text.trim() });
    }
    return res.status(200).json({ error: '텍스트를 인식하지 못했어요' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: '텍스트를 인식하지 못했어요' });
  }
}
