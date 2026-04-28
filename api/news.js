export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const response = await fetch(
      'https://gnews.io/api/v4/top-headlines?lang=ko&country=kr&max=4&apikey=bcf3dada057318a80aa25e747fdb5881'
    );
    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
