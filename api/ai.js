export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });

  var body = req.body || {};
  var myCount = body.myCount || 0;
  var partnerCount = body.partnerCount || 0;
  var totalDays = body.totalDays || 1;

  var prompt = '커플 건강 앱 데이터입니다.\n' +
    '- 나의 이번 달 운동 일수: ' + myCount + '/' + totalDays + '일\n' +
    '- 파트너 운동 일수: ' + partnerCount + '/' + totalDays + '일\n\n' +
    '두 문장 이내로, 커플에게 따뜻하고 구체적인 건강 응원 메시지를 한국어로 작성해주세요. 이모지 1개 포함. 존댓말 사용.';

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    var data = await response.json();
    var text = data.content && data.content[0] && data.content[0].text;
    return res.status(200).json({ message: text || '오늘도 함께 건강하게 지내요 💑' });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ message: '오늘도 함께 건강하게 지내요 💑' });
  }
}
