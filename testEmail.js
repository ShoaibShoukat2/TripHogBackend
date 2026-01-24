const { createEmailTransporter } = require('./utils/emailConfig');

async function testEmailConnection() {
  console.log('Testing Gmail connection...');
  
  const transporter = createEmailTransporter();
  
  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ Gmail connection successful!');
    
    // Send test email
    const info = await transporter.sendMail({
      from: process.env.GMAIL_EMAIL || "contact.alinventors@gmail.com",
      to: process.env.GMAIL_EMAIL || "contact.alinventors@gmail.com", // Send to self
      subject: "Test Email - Triphog Server",
      text: "This is a test email to verify Gmail SMTP configuration.",
      html: "<p>This is a test email to verify Gmail SMTP configuration.</p>"
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Gmail connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Possible solutions:');
      console.log('1. Check if Gmail credentials are correct');
      console.log('2. Enable 2-factor authentication on Gmail account');
      console.log('3. Generate a new App Password from Gmail settings');
      console.log('4. Make sure "Less secure app access" is disabled (use App Password instead)');
    }
  }
}

// Run the test
testEmailConnection();