import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

// SMTP 설정이 없으면 콘솔 출력만 (개발 환경 fallback)
function isSmtpConfigured(): boolean {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass && env.smtpFrom);
}

function createTransport() {
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log(`[mailer] SMTP 미설정 — 콘솔 출력만\n  to: ${to}\n  subject: ${subject}`);
    return;
  }

  const transporter = createTransport();
  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    html,
  });
  console.log(`[mailer] 발송 완료 → ${to} / ${subject}`);
}
