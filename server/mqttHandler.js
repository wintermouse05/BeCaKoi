const mqtt = require('mqtt');
const { db, ref, push } = require('./firebase');
let wsClients = [];
let mainClient = null; // Client chính để nhận và gửi dữ liệu

function setupMQTT(wsList) {
  wsClients = wsList;
  mainClient = mqtt.connect('mqtt://broker.hivemq.com');

  mainClient.on('connect', () => {
    console.log('Main MQTT client connected');
    mainClient.subscribe('/sensor/data');
  });
  
  // Thêm event listeners để tracking việc gửi message
  mainClient.on('publish', (packet) => {
    console.log('✅ Message published successfully:', {
      topic: packet.topic,
      messageId: packet.messageId,
      timestamp: new Date().toISOString()
    });
  });
  
  mainClient.on('error', (error) => {
    console.error('❌ MQTT Error:', error);
  });
  
  mainClient.on('disconnect', () => {
    console.log('⚠️ MQTT Disconnected');
  });
  
  mainClient.on('message', (topic, message) => {
    const data = JSON.parse(message.toString());
    console.log("MQTT Received:", data);
    push(ref(db, 'data_sensor'), data);
    
    // Kiểm tra điều kiện và gửi tín hiệu điều khiển
    // checkConditionAndSendControl(data, mainClient);
    
    wsClients.forEach(ws => {
      if (ws.readyState === 1) ws.send(JSON.stringify(data));
    });
  });
}

// Thêm luồng gửi dữ liệu bật/tắt về MQTT
let controlClient = null;

function setupControlMQTT() {
  controlClient = mqtt.connect('mqtt://broker.hivemq.com');
  
  controlClient.on('connect', () => {
    console.log('Control MQTT connected');
    // Bắt đầu gửi dữ liệu bật/tắt định kỳ
    startControlDataStream();
  });
}

// Hàm gửi dữ liệu bật/tắt với callback để tracking
function sendControlSignal(state, callback) {
  if (mainClient && mainClient.connected) {
    const controlData = {
      state: state, // 1 = bật, 0 = tắt
      timestamp: Date.now(),
      device: 'web_control',
      source: 'user_interface'
    };
    
    // Gửi với callback để biết kết quả
    mainClient.publish('/device/control', JSON.stringify(controlData), { qos: 1 }, (error) => {
      if (error) {
        console.error('❌ Failed to send control signal:', error);
        if (callback) callback(false, error);
        return false;
      } else {
        console.log('✅ Control signal sent successfully:', controlData);
        if (callback) callback(true, controlData);
        return true;
      }
    });
    
    console.log('📤 Sending control signal:', controlData);
    return true; // Đã gửi (chưa biết kết quả)
  }
  
  const errorMsg = 'Cannot send control signal - MQTT not connected';
  console.log('❌', errorMsg);
  if (callback) callback(false, errorMsg);
  return false;
}

// Phiên bản Promise của sendControlSignal
function sendControlSignalAsync(state) {
  return new Promise((resolve, reject) => {
    if (mainClient && mainClient.connected) {
      const controlData = {
        state: state,
        timestamp: Date.now(),
        device: 'web_control',
        source: 'user_interface'
      };
      
      mainClient.publish('/device/control', JSON.stringify(controlData), { qos: 1 }, (error) => {
        if (error) {
          console.error('❌ Failed to send control signal:', error);
          reject(error);
        } else {
          console.log('✅ Control signal sent successfully:', controlData);
          resolve(controlData);
        }
      });
      
      console.log('📤 Sending control signal:', controlData);
    } else {
      const errorMsg = 'MQTT not connected';
      console.log('❌', errorMsg);
      reject(new Error(errorMsg));
    }
  });
}

// Luồng tự động gửi dữ liệu bật/tắt
function startControlDataStream() {
  setInterval(() => {
    const randomState = Math.random() > 0.5 ? 1 : 0; // Random bật/tắt
    sendControlSignal(randomState);
  }, 3000); // Gửi mỗi 3 giây
}

// Hàm kiểm tra điều kiện và gửi tín hiệu điều khiển
function checkConditionAndSendControl(data, client) {
  // Ví dụ các điều kiện có thể kiểm tra:
  
  
  // 5. Kiểm tra giá trị cảm biến cụ thể
  if (data.sensor_id === 'motion_sensor' && data.value === 1) {
    // Bật đèn khi phát hiện chuyển động
    const controlSignal = { device: 'security_light', state: 1, reason: 'motion_detected' };
    client.publish('/device/security/control', JSON.stringify(controlSignal));
    console.log('Security light activated - Motion detected');
  }
}

module.exports = { 
  setupMQTT, 
  setupControlMQTT, 
  sendControlSignal, 
  sendControlSignalAsync 
};
