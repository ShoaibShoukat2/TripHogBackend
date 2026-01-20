// Simple test to check if api.triphog.net is working
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ 
    message: 'API subdomain is working!', 
    domain: req.get('host'),
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'Backend API test successful',
    subdomain: 'api.triphog.net'
  });
});

const PORT = process.env.PORT || 21098;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});