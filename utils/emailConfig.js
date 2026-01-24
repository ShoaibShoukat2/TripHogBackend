const nodemailer = require("nodemailer");

// Centralized email configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail", // Use Gmail service for better compatibility
    auth: {
      user: process.env.GMAIL_EMAIL || "contact.alinventors@gmail.com",
      pass: process.env.GMAIL_PASSWORD || "sxmp lxuv jckd savw",
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
    debug: false, // Disable debug mode in production
    logger: false, // Disable logging in production
  });
};

// Safe email sending function with error handling
const sendEmailSafely = async (transporter, mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    
    // Log specific error types
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication failed - check Gmail credentials');
    } else if (error.code === 'ECONNECTION') {
      console.error('🌐 Connection failed - check internet connection');
    }
    
    return { success: false, error: error.message };
  }
};

module.exports = { createEmailTransporter, sendEmailSafely };