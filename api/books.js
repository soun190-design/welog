export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  var query = req.query && req.query.query;
  if (!query) return res.status(400).json({ error: '검색어가 없습니다' });

  var clientId = process.env.NAVER_CLIENT_ID;
  var clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });

  try {
    var response = await fetch(
      'https://openapi.naver.com/v1/search/book.json?query=' + encodeURIComponent(query) + '&display=10',
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    );
    var data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: '검색 중 오류가 발생했습니다' });
  }
}
