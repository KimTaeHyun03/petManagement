import pg from 'pg';
import { env } from '../config/env.js';

// AWS RDS는 SSL이 기본이지만 RDS 서버 인증서는 Node 기본 CA 번들에 없다.
//
// pg-connection-string의 차기 메이저에서 `sslmode=require`가 `verify-full`로
// 해석되도록 바뀌었고, 이미 경고와 함께 그 동작이 적용된다. 그 결과
// connection string에 `sslmode=require`만 있으면 인증서 검증이 강제되어
// `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` 에러가 난다.
//
// 1차 구현은 ssl 옵션으로 직접 제어(`rejectUnauthorized:false`)한다.
// 운영 전환 시 RDS Root CA(`global-bundle.pem`)를 받아 `ca:` 로 검증 강화 필요.

function shouldUseSsl(url: string): boolean {
  if (/sslmode=(require|verify-ca|verify-full|prefer)/i.test(url)) return true;
  return /\.rds\.amazonaws\.com/i.test(url);
}

// connection string의 sslmode 쿼리를 제거 — ssl 옵션이 라이브러리 해석을 덮도록.
function stripSslMode(url: string): string {
  return url
    .replace(/([?&])sslmode=[^&]*&?/gi, '$1')
    .replace(/[?&]$/, '');
}

const useSsl = shouldUseSsl(env.databaseUrl);

export const pool = new pg.Pool({
  connectionString: stripSslMode(env.databaseUrl),
  max: 10,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});
