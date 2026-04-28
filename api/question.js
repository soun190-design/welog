const FALLBACK_QUESTIONS = {
  '경제/재테크': [
    '요즘 가장 잘한 소비가 뭐야? 💰',
    '이번달 절약하고 싶은 항목이 있어? 🎯',
    '지금 가장 사고 싶은 것과 그 이유는? 🛍️',
    '우리 함께 모으고 싶은 목돈이 있어? 💵',
    '돈을 쓸 때 가장 아깝지 않은 소비는 뭐야? 😊',
    '재테크 중에 가장 관심 있는 방법은? 📈',
    '5년 후 우리의 재정 목표는 뭘까? 🏦',
    '가장 후회했던 소비는 뭐야? 😅',
    '요즘 물가 중 가장 부담스러운 게 뭐야? 🤔',
    '지금 당장 투자할 수 있다면 어디에 할 거야? 💡',
  ],
  '취향/문화': [
    '최근에 본 것 중 가장 인상깊었던 건? 🎬',
    '요즘 꽂혀있는 음악이나 아티스트가 있어? 🎵',
    '같이 읽고 싶은 책이 있어? 📚',
    '다시 보고 싶은 영화나 드라마가 있어? 🍿',
    '가보고 싶은 전시나 공연이 있어? 🎨',
    '요즘 빠져있는 유튜브 채널이나 콘텐츠는? 📱',
    '평생 한 가지 음식만 먹어야 한다면 뭐 먹을 거야? 🍜',
    '우리 둘이 같이 배워보고 싶은 게 있어? 🌱',
    '가장 좋아하는 계절과 그 이유는? 🍂',
    '인생에서 가장 인상 깊었던 여행지는? ✈️',
    '요즘 가장 재미있게 하는 취미는? 🎮',
    '새로 도전해보고 싶은 음식이나 요리가 있어? 🍳',
  ],
  '데이트': [
    '이번 주말에 같이 뭐 하고 싶어? 🎉',
    '요즘 가보고 싶은 맛집이 있어? 🍽️',
    '올해 안에 꼭 같이 가보고 싶은 곳은? 🗺️',
    '집에서 같이 해보고 싶은 것들이 있어? 🏠',
    '다음 기념일에 어떻게 보내고 싶어? 🎂',
    '우리 버킷리스트에 뭘 추가할까? 📝',
    '가장 기억에 남는 우리 데이트는 뭐야? 💑',
    '비 오는 날 같이 뭐 하고 싶어? ☔',
    '같이 도전해보고 싶은 운동이나 액티비티가 있어? 🏄',
    '올해 꼭 같이 보고 싶은 영화나 공연이 있어? 🎭',
    '우리만의 특별한 루틴을 만든다면? ☀️',
    '가장 가보고 싶은 해외 여행지는? 🌍',
  ],
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const categories = Object.keys(FALLBACK_QUESTIONS);
  const today = new Date().toISOString().split('T')[0];
  const categoryIndex = parseInt(today.replace(/-/g, '')) % categories.length;
  const category = categories[categoryIndex];

  const getFallback = function() {
    const list = FALLBACK_QUESTIONS[category];
    const index = parseInt(today.replace(/-/g, '')) % list.length;
    return { question: list[index], category: category };
  };

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

    if (!question) {
      return res.status(200).json(getFallback());
    }

    res.status(200).json({ question: question.trim(), category: category });
  } catch (e) {
    res.status(200).json(getFallback());
  }
}
