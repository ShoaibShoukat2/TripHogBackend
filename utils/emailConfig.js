const nodemailer = require("nodemailer");

// Centralized email configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.GMAIL_EMAIL || "contact.alinventors@gmail.com",
      pass: process.env.GMAIL_PASSWORD || "sxmp lxuv jckd savw",
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
      ciphers: 'SSLv3', // Force SSL version
    },
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
  });
};

module.exports = { createEmailTransporter };