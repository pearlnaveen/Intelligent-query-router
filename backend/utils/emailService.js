import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to || typeof to !== 'string' || !to.trim()) {
    console.warn('⚠️ sendEmail skipped: No recipient email provided.');
    return { success: false, message: 'No recipient defined' };
  }

  try {
    const mailOptions = {
      from: `"Admin System" <${process.env.EMAIL_USER || process.env.MAIL_USER}>`,
      to: to.trim(),
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error?.message || error);
    return { success: false, error: error?.message || 'Email delivery failed' };
  }
};

export default { sendEmail };
