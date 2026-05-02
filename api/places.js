export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  var query = req.query && req.query.query;
  if (!query) return res.status(400).json({ error: '검색어가 없습니다' });

  var apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });

  try {
    var response = await fetch(
      'https://dapi.kakao.com/v2/local/search/keyword.json?query=' + encodeURIComponent(query) + '&size=5',
      { headers: { 'Authorization': 'KakaoAK ' + apiKey } }
    );
    var data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: '장소 검색 중 오류가 발생했습니다' });
  }
}
