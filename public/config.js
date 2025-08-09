// Production configuration
const CONFIG = {
  // Change these URLs after deployment
  API_BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://traica-backend.azurewebsites.net',
  
  WS_URL: window.location.hostname === 'localhost'
    ? 'ws://localhost:5000'
    : 'wss://traica-backend.azurewebsites.net',
    
  MQTT_BROKER: 'mqtt://broker.hivemq.com'
};

// Export for use in other files
window.APP_CONFIG = CONFIG;
