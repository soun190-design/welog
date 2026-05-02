export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  var lat = req.query && req.query.lat;
  var lon = req.query && req.query.lon;
  if (!lat || !lon) return res.status(400).json({ error: '위치 정보가 없습니다' });

  var apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });

  try {
    var response = await fetch(
      'https://api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lon +
      '&appid=' + apiKey + '&units=metric&lang=kr'
    );
    var data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: '날씨 정보를 가져올 수 없어요' });
  }
}
