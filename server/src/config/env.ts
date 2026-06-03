import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
export const isProd = nodeEnv === 'production';

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // research_taehyun.md §2: 운영 권장 Access=15m + Refresh Rotation.
  // 1차 구현은 Access-only이므로 테스트 편의를 고려해 기본 2h.
  // 운영 전환 시 15m으로 줄이고 Refresh Rotation을 도입한다 (TODO.md).
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '2h',
  // dev/테스트 편의용 — Pwned Passwords 검사 우회.
  // 운영에서 실수로 켜지지 않도록 prod에서는 무조건 false로 강제.
  skipPwnedCheck: !isProd && process.env.SKIP_PWNED_CHECK === 'true',

  // 이메일 알림 (SMTP) — 미설정 시 알림 발송 생략
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpFrom: process.env.SMTP_FROM ?? '',

  // Naver CLOVA OCR (General 도메인 petocr)
  clovaOcrInvokeUrl: required('CLOVA_OCR_INVOKE_URL'),
  clovaOcrSecret: required('CLOVA_OCR_SECRET'),

  // OpenAI (챗봇)
  openaiApiKey: required('OPENAI_API_KEY'),
};
