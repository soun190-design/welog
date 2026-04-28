export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const categories = ['경제/재테크', '취향/문화', '데이트'];
  const today = new Date().toISOString().split('T')[0];
  const category = categories[parseInt(today.replace(/-/g, '')) % categories.length];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: '부부가 함께 나눌 수 있는 ' + category + ' 관련 질문을 한 개만 만들어줘. 가볍고 재미있는 톤으로, 대화를 유도하는 질문이어야 해. 질문만 딱 한 줄로 답해줘. 이모지 1개 포함.'
          }
        ]
      })
    });

    const data = await response.json();
    const question = data.content && data.content[0] && data.content[0].text;

    res.status(200).json({ question: question, category: category });
  } catch (e) {
    // API 실패시 기본 질문으로 폴백
    const fallbacks = {
      '경제/재테크': '요즘 가장 잘한 소비가 뭐야? 💰',
      '취향/문화': '최근에 본 것 중 가장 인상깊었던 건? 🎬',
      '데이트': '이번 주말에 같이 뭐 하고 싶어? 🎉',
    };
    res.status(200).json({ question: fallbacks[category], category: category });
  }
}
