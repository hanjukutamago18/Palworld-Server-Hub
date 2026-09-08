import net from 'net';

// Helper sederhana untuk koneksi RCON Palworld
function queryRcon(ip, port, password) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let authenticated = false;
    let responseData = Buffer.alloc(0);

    client.setTimeout(3000); // Timeout 3 detik

    client.connect(parseInt(port), ip, () => {
      // Packet RCON Login: ID 3 (SERVERDATA_AUTH), Payload: password
      const packet = Buffer.alloc(10 + password.length);
      packet.writeInt32LE(packet.length - 4, 0); // Size
      packet.writeInt32LE(1, 4); // Request ID
      packet.writeInt32LE(3, 8); // Type 3 = Auth
      packet.write(password, 12, 'ascii');
      packet.writeInt8(0, 12 + password.length);
      packet.writeInt8(0, 13 + password.length);
      client.write(packet);
    });

    client.on('data', (data) => {
      responseData = Buffer.concat([responseData, data]);
      if (!authenticated && responseData.length >= 14) {
        const reqId = responseData.readInt32LE(4);
        if (reqId === 1) {
          authenticated = true;
          // Setelah login sukses, kirim command "ShowWorldGuid" atau info lain
          const cmdPacket = Buffer.alloc(14);
          cmdPacket.writeInt32LE(10, 0);
          cmdPacket.writeInt32LE(2, 4); // Request ID 2
          cmdPacket.writeInt32LE(2, 8); // Type 2 = ExecCommand
          cmdPacket.write('ShowWorldGuid', 12, 'ascii');
          cmdPacket.writeInt8(0, 25);
          cmdPacket.writeInt8(0, 26);
          // Karena keterbatasan contoh ringkas, kita tutup setelah auth atau kirim command
          client.end();
          resolve({ success: true });
        }
      }
    });

    client.on('error', (err) => reject(err));
    client.on('timeout', () => { client.destroy(); reject(new Error('RCON Timeout')); });
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ip, api_port, rcon_port, password } = req.query;

  if (!ip || !api_port || !password) {
    return res.status(400).json({ error: 'Parameter tidak lengkap' });
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

    // Jika RCON port tersedia, kita ukur status RCON-nya
    let rconStatus = false;
    if (rcon_port) {
      try {
        await queryRcon(cleanIP, rcon_port, password);
        rconStatus = true;
      } catch (e) {
        rconStatus = false;
      }
    }

    return res.status(200).json({
      online: true,
      latency: latency,
      uptime: Math.floor(process.uptime()), // Uptime serverless / estimasi sesi
      rconConnected: rconStatus,
      info: infoData,
      players: playersData
    });
  } catch (err) {
    return res.status(200).json({ online: false, error: err.message });
  }
}
