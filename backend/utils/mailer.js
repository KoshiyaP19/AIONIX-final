require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendCriticalAlert = async (logData) => {
  if (process.env.SMTP_PASS === 'put_your_gmail_app_password_here') {
    console.log("⚠️ Alert Skipped: Configure Gmail App Password in backend/.env to send emails.");
    return;
  }

  const mailOptions = {
    from: `"AIONIX AI Platform" <${process.env.SMTP_USER}>`,
    to: process.env.ALERT_EMAIL,
    subject: `🚨 CRITICAL ALERT - ${logData.service}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 8px;">
        <h2 style="color: #ef4444;">Critical System Event Detected</h2>
        <p><strong>Service:</strong> ${logData.service || 'Unknown'}</p>
        <p><strong>Message:</strong> ${logData.message || 'No description provided'}</p>
        <p><strong>Timestamp:</strong> ${new Date(logData.timestamp || Date.now()).toLocaleString()}</p>
        <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
          This is an automated alert from the AIONIX Real-time Monitoring Engine.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📨 Critical Alert Email sent:", info.response);
  } catch (error) {
    console.error("❌ Email Send Error:", error);
  }
};

const sendDigestEmail = async (htmlDigest) => {
  if (process.env.SMTP_PASS === 'put_your_gmail_app_password_here') {
    console.log("⚠️ Digest Skipped: Configure Gmail App Password in backend/.env to send emails.");
    return;
  }

  const mailOptions = {
    from: `"AIONIX AI Engine" <${process.env.SMTP_USER}>`,
    to: process.env.ALERT_EMAIL,
    subject: `📊 AIONIX 6-Hour Platform Digest`,
    html: htmlDigest
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📨 Digest Email sent:", info.response);
  } catch (error) {
    console.error("❌ Email Send Error:", error);
  }
};

module.exports = {
  sendCriticalAlert,
  sendDigestEmail
};
