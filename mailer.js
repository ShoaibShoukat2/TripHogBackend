const nodemailer = require("nodemailer");

const EMAIL_USER="contact.alinventors@gmail.com"
const EMAIL_PASS="sxmp lxuv jckd savw"

const transporter = nodemailer.createTransport({
  service: "gmail", // Use your email service (e.g., 'gmail', 'outlook')
  auth: {
    user: EMAIL_USER, // Your email address
    pass: EMAIL_PASS, // Your email password or app-specific
  },
});

const sendMail = async (options) => {
  const { to, subject, text} = options;

  console.log("EMAIL USER", EMAIL_USER);
  console.log("EMAIL PASS", EMAIL_PASS);

  // Create HTML content for demo request
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
      <div style="background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
        <h1 style="color: #30325E; text-align: center;">Triphog</h1>
        <h2 style="color: #30325E; text-align: center;">New Demo Request</h2>
        
        <div style="font-size: 16px; color: #333333; margin: 20px 0; line-height: 1.6;">
          ${text.split('\n').map(line => `<p>${line.trim()}</p>`).join('')}
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #666666;">
          <p>This is an automated message from the Triphog demo request system.</p>
        </div>
      </div>
    </div>
  `;

  const mailOptions = {
    from: EMAIL_USER, // Sender address
    to, // Recipient address
    subject, // Email subject
    text, // Plain text body
    html: htmlContent, // HTML body
 
  };
  
  

  try {
      console.log("Mail is being sent to",to)
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error; // Re-throw the error so the calling function can handle it
  }
};

module.exports = sendMail;