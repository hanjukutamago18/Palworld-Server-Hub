export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ip, api_port, password } = req.query;

  if (!ip || !api_port || !password) {
    return res.status(400).json({ error: 'Parameter ip, api_port, dan password diperlukan' });
  }

  const cleanIP = ip.split(':')[0];
  const apiBaseUrl = `http://${cleanIP}:${api_port}`;
  const authHeader = 'Basic ' + Buffer.from(`admin:${password}`).toString('base64');

  const startTime = Date.now();

  try {
    const [infoRes, playersRes] = await Promise.all([
      fetch(`${apiBaseUrl}/v1/api/info`, {
        headers: { 'Authorization': authHeader, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      }),
      fetch(`${apiBaseUrl}/v1/api/players`, {
        headers: { 'Authorization': authHeader, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      })
    ]);

    const latency = Date.now() - startTime;
    let infoData = null;
    let playersData = null;

    if (infoRes.ok) infoData = await infoRes.json();
    if (playersRes.ok) playersData = await playersRes.json();

    return res.status(200).json({
      online: true,
      latency: latency,
      info: infoData,
      players: playersData
    });
  } catch (err) {
    return res.status(200).json({ online: false, error: err.message });
  }
}
