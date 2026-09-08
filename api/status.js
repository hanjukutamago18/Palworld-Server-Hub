export default async function handler(req, res) {
    // Data ini diambil dari log console Pterodactyl kamu
    const palworldIp = '15.235.180.31';
    const apiPort = '28045';
    const adminPassword = 'ajinomoto';
    
    // Palworld API membutuhkan otentikasi admin
    const authHeader = 'Basic ' + Buffer.from('admin:' + adminPassword).toString('base64');

    try {
        const response = await fetch(`http://${palworldIp}:${apiPort}/v1/api/info`, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Gagal terhubung ke Palworld' });
    }
}
