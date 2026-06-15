const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://broker.hivemq.com:1883');
client.on('connect', () => {
  const payload = JSON.stringify({ device_id: 'esp32-sala', mq9: 800, alarme: true });
  client.publish('ianes/gasshield/dispositivos/esp32-sala/status', payload, {}, (err) => {
    if (err) console.error('Erro publish:', err);
    else console.log('Mensagem publicada:', payload);
    client.end();
  });
});
