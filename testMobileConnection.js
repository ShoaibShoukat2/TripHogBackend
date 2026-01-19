const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

// Get local IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Mobile connection successful!',
    serverIP: localIP,
    timestamp: new Date().toISOString(),
    clientIP: req.ip
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', server: 'Running' });
});

const PORT = 8001;

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Mobile Connection Test Server                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`\n📱 Test URLs for Mobile App:\n`);
  console.log(`   Local:   http://localhost:${PORT}/test`);
  console.log(`   Network: http://${localIP}:${PORT}/test`);
  console.log(`\n🔧 APK Configuration:\n`);
  console.log(`   API_URL = "http://${localIP}:8000"`);
  console.log(`\n💡 Testing Steps:\n`);
  console.log(`   1. Mobile aur laptop same WiFi pe hone chahiye`);
  console.log(`   2. Mobile browser mein open karein:`);
  console.log(`      http://${localIP}:${PORT}/test`);
  console.log(`   3. Agar success message aaye to connection working hai`);
  console.log(`   4. APK mein API_URL update karein`);
  console.log(`\n⚠️  Windows Firewall allow karna na bhoolein!\n`);
});
