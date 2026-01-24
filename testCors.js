const axios = require('axios');

async function testCORS() {
  console.log('Testing CORS configuration...');
  
  try {
    // Test basic API endpoint
    const response = await axios.get('https://api.triphog.net/api/v1', {
      headers: {
        'Origin': 'https://triphog.net'
      }
    });
    
    console.log('✅ API endpoint accessible');
    console.log('Response:', response.data);
    
    // Test CORS test endpoint
    const corsResponse = await axios.get('https://api.triphog.net/api/v1/cors-test', {
      headers: {
        'Origin': 'https://triphog.net'
      }
    });
    
    console.log('✅ CORS test endpoint accessible');
    console.log('CORS Response:', corsResponse.data);
    
  } catch (error) {
    console.error('❌ CORS test failed:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    console.error('Headers:', error.response?.headers);
  }
}

testCORS();