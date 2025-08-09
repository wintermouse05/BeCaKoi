const express = require('express');
const cors = require('cors');
const path = require('path');

const http = require('http');
const { setupWebSocket } = require('./websocket');
const { setupMQTT, setupControlMQTT, sendControlSignal, sendControlSignalAsync } = require('./mqttHandler');
const { db, ref, get, query, orderByChild, startAt, endAt } = require('./firebase');

const app = express();
const server = http.createServer(app);

const wsClients = setupWebSocket(server);
setupMQTT(wsClients);

// CORS phải đặt trước các route
app.use(cors());
app.use(express.json()); // Thêm middleware để parse JSON

// Serve static files từ thư mục public (Frontend)
app.use(express.static('../public'));

// Route chính để serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'TraiCa IoT System API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            'GET /': 'Frontend dashboard',
            'GET /data_sensor': 'Get sensor data with date range',
            'POST /api/control': 'Send control signals to devices',
            'GET /api': 'This API information'
        },
        timestamp: new Date().toISOString()
    });
});

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

// API endpoint để nhận tín hiệu điều khiển từ front-end
app.post('/api/control', async (req, res) => {
    try {
        const { state, timestamp, source } = req.body;
        
        console.log(`📨 Control signal received from ${source}: state=${state}`);
        
        // Phương pháp 1: Sử dụng async/await
        try {
            const result = await sendControlSignalAsync(state);
            res.json({ 
                success: true, 
                message: `Device ${state ? 'turned ON' : 'turned OFF'}`,
                state: state,
                timestamp: timestamp,
                mqtt_result: result
            });
        } catch (mqttError) {
            console.error('MQTT sending failed:', mqttError);
            res.status(500).json({ 
                success: false, 
                message: 'Failed to send control signal via MQTT',
                error: mqttError.message
            });
        }
        
        // Phương pháp 2: Sử dụng callback (comment out vì đã dùng async)
        /*
        sendControlSignal(state, (success, result) => {
            if (success) {
                res.json({ 
                    success: true, 
                    message: `Device ${state ? 'turned ON' : 'turned OFF'}`,
                    state: state,
                    timestamp: timestamp,
                    mqtt_result: result
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to send control signal via MQTT',
                    error: result
                });
            }
        });
        */
        
    } catch (error) {
        console.error('Error handling control signal:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Frontend available at http://localhost:${PORT}`);
    console.log(`🔌 WebSocket available at ws://localhost:${PORT}`);
    console.log(`📡 API endpoints:`);
    console.log(`   - GET  /data_sensor`);
    console.log(`   - POST /api/control`);
});
