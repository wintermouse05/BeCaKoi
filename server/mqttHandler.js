const mqtt = require('mqtt');
const { db, ref, push } = require('./firebase');
let wsClients = [];

function setupMQTT(wsList) {
  wsClients = wsList;
  const client = mqtt.connect('mqtt://broker.hivemq.com');

  client.on('connect', () => {
    client.subscribe('/sensor/data');
  });

  client.on('message', (topic, message) => {
    const data = JSON.parse(message.toString());
    console.log("MQTT Received:", data);
    push(ref(db, 'data_sensor'), data);

    wsClients.forEach(ws => {
      if (ws.readyState === 1) ws.send(JSON.stringify(data));
    });
  });
}

module.exports = { setupMQTT };
