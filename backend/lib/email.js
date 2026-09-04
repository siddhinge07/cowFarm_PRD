require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendOtpEmail(email, otp, farmName = 'AgroHerd') {
  console.log(`[EMAIL OTP] Generated 6-digit code for ${email}: ${otp}`);

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 40px;">🐄</span>
        <h1 style="color: #2D6A4F; font-size: 24px; margin: 8px 0;">AgroHerd</h1>
        <p style="color: #666; font-size: 14px; margin: 0;">Farm Management System</p>
      </div>
      <p style="font-size: 16px; color: #1C2321; line-height: 1.5;">
        Welcome to <strong>${farmName}</strong>! Please enter the 6-digit verification code below to activate your farm account:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2D6A4F; background: #F0FDF4; border: 2px dashed #86EFAC; padding: 12px 24px; border-radius: 8px;">
          ${otp}
        </span>
      </div>
      <p style="font-size: 13px; color: #888; text-align: center;">
        This code expires in 15 minutes. Never share this code with anyone.
      </p>
    </div>
  `;

  // 1. Prioritize Gmail / SMTP if configured (Allows sending to ANY recipient in the world)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS.replace(/\s+/g, '') // remove any accidental spaces
        }
      });

      const info = await transporter.sendMail({
        from: `"AgroHerd" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `${otp} is your AgroHerd verification code`,
        html: htmlContent
      });

      console.log(`[Gmail SMTP Success] Email sent to ${email}. Message ID: ${info.messageId}`);
      return true;
    } catch (err) {
      console.error('[Gmail SMTP Error]', err.message);
    }
  }

  // 2. Fallback to Resend API
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'AgroHerd <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: `${otp} is your AgroHerd verification code`,
          html: htmlContent
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        console.error('[Resend Error]', resData);
      } else {
        console.log('[Resend Success] Email sent ID:', resData.id);
      }
    } catch (err) {
      console.error('[Resend Failed]', err.message);
    }
  }

  return true;
}

module.exports = { sendOtpEmail };
