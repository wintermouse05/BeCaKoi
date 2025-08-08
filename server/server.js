const express = require('express');
const cors = require('cors');

const http = require('http');
const { setupWebSocket } = require('./websocket');
const { setupMQTT } = require('./mqttHandler');
const { db, ref, get, query, orderByChild, startAt, endAt } = require('./firebase');

const app = express();
const server = http.createServer(app);

const wsClients = setupWebSocket(server);
setupMQTT(wsClients);

// CORS phải đặt trước các route
app.use(cors());
app.use(express.static('public'));

app.get('/data_sensor', async (req, res) => {
    try {
        const { from, to } = req.query;
        console.log(`Fetching data from ${from} to ${to}`);
        
        const snap = await get(ref(db, 'data_sensor'));
        const result = [];

        snap.forEach(child => {
            const item = child.val();
            if (item.timestamp) {
                const itemDate = item.timestamp.split(' ')[0];
                if (itemDate >= from && itemDate <= to) {
                    result.push(item);
                }
            }
        });

        // Sắp xếp theo timestamp tăng dần
        result.sort((a, b) => {
            if (a.timestamp && b.timestamp) {
                return new Date(a.timestamp) - new Date(b.timestamp);
            }
            return 0;
        });

        // Chỉ lấy 20 điểm cuối cùng (gần nhất)
        const limitedResult = result.slice(-20);

        console.log(`Found ${limitedResult.length} records (limited to 20 latest points)`);
        res.json(limitedResult);
    } catch (error) {
        console.error('Error fetching sensor data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

server.listen(3000, () => console.log('Server on http://localhost:3000'));
