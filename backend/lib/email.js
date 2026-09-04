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

  // 1. Brevo REST API (HTTP Port 443 - Can send to ANY recipient without requiring custom domain)
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    try {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM_ADDRESS || 'siddheshnhinge1528@gmail.com';
      const senderName = process.env.BREVO_SENDER_NAME || 'AgroHerd';

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email }],
          subject: `${otp} is your AgroHerd verification code`,
          htmlContent: htmlContent
        })
      });

      const resData = await response.json();
      if (response.ok) {
        console.log(`[Brevo Success] Email delivered to ${email}. Message ID:`, resData.messageId);
        return { success: true, provider: 'brevo', messageId: resData.messageId };
      } else {
        console.warn('[Brevo Warning]', resData.message || resData);
      }
    } catch (err) {
      console.error('[Brevo Error]', err.message);
    }
  }

  // 2. Resend API (HTTP REST Port 443)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'AgroHerd <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
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
      if (response.ok) {
        console.log(`[Resend Success] Email delivered to ${email}. ID:`, resData.id);
        return { success: true, provider: 'resend', id: resData.id };
      } else {
        console.warn('[Resend Sandbox Restriction]', resData.message || resData);
      }
    } catch (err) {
      console.error('[Resend Error]', err.message);
    }
  }

  // 3. Fallback: SMTP with short timeout
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const userEmail = process.env.SMTP_USER.trim();
      const cleanPass = process.env.SMTP_PASS.replace(/[^a-zA-Z0-9]/g, '');

      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        auth: {
          user: userEmail,
          pass: cleanPass
        }
      });

      const info = await transporter.sendMail({
        from: `"AgroHerd" <${userEmail}>`,
        to: email,
        subject: `${otp} is your AgroHerd verification code`,
        html: htmlContent
      });

      console.log(`[SMTP Success] Email sent to ${email}. Message ID: ${info.messageId}`);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.warn('[SMTP Notice - Cloud host may block outbound SMTP]', err.message);
    }
  }

  // If providers failed or restricted recipient, return graceful false
  return { success: false, reason: 'provider_restricted' };
}

module.exports = { sendOtpEmail };
