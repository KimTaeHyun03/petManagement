# 김태현  — 표준 로그인 로직 요약

> 담당: **회원가입/로그인**
> 기준: **OWASP Authentication / Password Storage / Session Management / JWT / Forgot Password Cheat Sheet + NIST SP 800-63B**


---

## 한 줄 결론

> **OWASP·NIST 표준 그대로 따른다.** Argon2id 해시 + 짧은 Access / 회전식 Refresh + httpOnly 쿠키 + Rate Limit.

---

## 핵심 결정 표

| 항목 | 결정값 | 근거 |
|---|---|---|
| 비밀번호 해시 | **Argon2id** (`m=19456, t=2, p=1`) | OWASP Password Storage 1순위 |
| 비밀번호 정책 | 최소 **10자** / 최대 64자+ / 복잡도 강제 X | NIST 800-63B + OWASP Auth |
| 유출 비밀번호 검사 | **Pwned Passwords API** (k-Anonymity) | OWASP Auth 권고 |
| Access Token | JWT HS256, **15분** | OWASP JWT |
| Refresh Token | **14일**, DB 저장, **Rotation + 재사용 감지** | Auth0 RTR |
| 토큰 저장 | **httpOnly + Secure + SameSite=Strict 쿠키** | OWASP Session Management |
| 로그아웃 | Refresh Token DB row 삭제 | stateless JWT 한계 보완 |
| 재설정 토큰 | 32바이트 hex, **30분**, 1회용, SHA-256 해시 저장 | OWASP Forgot Password |
| Rate Limit | 로그인 IP당 1분 5회 실패 → 5분 잠금 | OWASP Auth |

---

## 1. 비밀번호 저장 — Argon2id

- **순위**: Argon2id ▶ scrypt ▶ bcrypt(레거시) ▶ PBKDF2
- **Salt**: `argon2` npm 라이브러리가 자동 처리
- **Pepper**: 1차 범위 미도입 (운영 부담)
- **MD5/SHA 금지** — GPU로 무차별 대입 가능

---

## 2. 토큰 인증 — Refresh Rotation

```
로그인 → Access(15분) + Refresh(14일) 발급
       ↓
 Refresh로 갱신 시 새 쌍 발급, 기존 Refresh 폐기
       ↓
 같은 Refresh가 두 번 사용되면 → 패밀리 전체 무효화
```

- **저장**: httpOnly 쿠키 (XSS 방어 우선, CSRF는 SameSite=Strict로 차단)
- **`alg=none` 공격 방어**: 검증 시 알고리즘 명시
- **Payload 금지**: 비밀번호, PII, 권한 역할

---

## 3. 회원가입 표준 흐름

1. 입력 검증 (이메일 형식 RFC 5322, 비밀번호 정책)
2. 이메일 정규화 (소문자 + 공백 제거)
3. 중복 검사
4. **Argon2id 해시** → DB 저장 (평문 절대 X)
5. 자동 로그인 X, 로그인 화면으로

---

## 4. 로그인 표준 흐름 (타이밍 공격 방어 핵심)

1. 이메일로 사용자 조회
2. **사용자 없어도 더미 해시 비교 수행** → 응답 시간 일정하게
3. `argon2.verify()` 검증
4. 성공 시 Access + Refresh 발급, Refresh를 DB 저장
5. **에러 메시지 통일**: "이메일 또는 비밀번호가 올바르지 않습니다"

```js
const user = await db.findByEmail(email);
const hash = user?.pw_hash ?? DUMMY_ARGON2_HASH;
const ok = await argon2.verify(hash, password);
if (!ok || !user) return 401;
```

---

## 5. 비밀번호 재설정 표준 흐름

1. 사용자 존재 여부와 **무관하게 동일 응답** ("이메일을 보냈습니다")
2. CSPRNG로 토큰 생성 — `crypto.randomBytes(32).toString('hex')`
3. **DB에는 SHA-256 해시만** 저장 (원본은 메일에만)
4. 30분 만료, 1회용
5. 검증 후 새 비밀번호 → Argon2id 해시 갱신
6. **모든 활성 세션·Refresh Token 무효화**
7. 완료 알림 메일 발송 (새 비밀번호는 메일에 절대 X)

---

## 6. 무차별 대입 / 크리덴셜 스터핑 방어

- **Rate Limit** (`express-rate-limit`)
  - 로그인: IP당 1분 5회 실패 → 5분 잠금 (지수 backoff)
  - 가입·재설정 요청: IP당 10분 3회
- **Pwned Passwords API**: 도입 (k-Anonymity, 평문 전송 X)
- **MFA**: 1차 미도입, 2차 도입 검토 — Microsoft 통계 99.9% 침해 차단
- **CAPTCHA**: 1차 미도입

---

## 미해결 / 회의 필요

| # | 항목 | 상태 |
|---|---|---|
| 1 | **MFA / 이메일 인증** 1차 포함 여부 | 학과 평가 기준 확인 후 결정 |
| 2 | **CSRF 라이브러리** (`csurf` deprecated) 대체재 선택 | 코드 단계 전 조사 |
| 3 | **PLAN.md 4.1절을 본 결정값으로 갱신** | 회의 후 반영 |

---

## 출처

- OWASP Cheat Sheets: Password Storage / Authentication / Session Management / JWT / Forgot Password
- NIST SP 800-63B
- Auth0 — Refresh Token Rotation
- RFC 7519 (JWT)

> 상세 파라미터·트레이드오프·코드 예시는 `research_taehyun copy.md` 참고
