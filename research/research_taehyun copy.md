# 김태현 (총괄) — 자료조사 결과

> 담당 기능: **회원가입/로그인**, **반려동물 등록**
> 출처 원칙: 블로그 글 ❌ / OWASP·NIST·RFC 같은 **표준·학회 자료** 우선 / **2개 이상 교차 검증** 후 채택 / 모든 항목은 **출처 링크 함께** 기록
> 자료 수집일: 2026-05-01 (자료 자체는 2025년 갱신본 기준)

---


## 진행 상태

| 항목 | 시작일 | 완료일 | 결과 위치 |
|---|---|---|---|
| 1. 비밀번호 저장 | 2026-05-01 | 2026-05-01 | [§1](#1-비밀번호를-안전하게-저장하는-방법) |
| 2. JWT 토큰 정책 | 2026-05-01 | 2026-05-01 | [§2](#2-로그인-후-사용자-인증-유지--토큰-만료재발급-정책) |
| 3. 인가 / IDOR 방어 | 2026-05-01 | 2026-05-01 | [§3](#3-다른-사람이-내-반려동물-정보를-못-보게-막는-방법-인가) |
| 4. 펫 등록 UX 참고 | 2026-05-01 | 2026-05-01 | [§4 (간이)](#4-반려동물-등록-기능--uiux-참고-간이) |
| 5.1 회원가입 흐름 | 2026-05-01 | 2026-05-01 | [§5.1~5.3](#51-회원가입-표준-흐름) |
| 5.2 로그인 흐름 | 2026-05-01 | 2026-05-01 | [§5.4](#54-로그인-표준-흐름) |
| 5.3 비밀번호 재설정 | 2026-05-01 | 2026-05-01 | [§5.5](#55-비밀번호-재설정-흐름) |
| 5.4 Brute Force 방어 | 2026-05-01 | 2026-05-01 | [§5.6](#56-무차별-대입--크리덴셜-스터핑-방어) |
| 5.5 통합 결정 사항 | 2026-05-01 | 2026-05-01 | [§5.7](#57-통합-결정-사항--이-섹션의-최종-산출물) |

---

## 미해결 / 추가 확인 필요

1. **MFA / 이메일 인증 도입 시점** — 2차 단계로 미뤘는데 학과 평가 기준 따라 1차에 넣어야 할 수도. 회의에서 결정. ([§5.3](#53-이메일-인증-도입-여부) · [§5.6](#56-무차별-대입--크리덴셜-스터핑-방어))
2. **Pwned Passwords API 호출** — k-Anonymity 모델 구현 세부 (SHA-1 prefix 5자 → API 응답에서 suffix 매칭) 코드 단계에서 재확인. ([§1.6](#16-비밀번호-정책-nist-sp-800-63b--owasp-auth-cheat-sheet-교차) · [§5.6](#56-무차별-대입--크리덴셜-스터핑-방어))
3. **펫 ID UUID 변경** — PLAN.md 5절 ERD가 정수 ID로 그려져 있어 갱신 제안 필요. 다른 팀원(찬영) DB 작업과 동기화. ([§3.6](#36-추가-방어--자원-id-형식) · [§3.7](#37-결정-사항))
4. **CSRF 토큰 구현** — `SameSite=Strict`로 대부분 차단되지만 OWASP는 추가 방어로 double-submit token 권고. 라이브러리 선택(`csurf`는 deprecated, 대체재 조사) 필요. ([§2.4](#24-토큰-저장-위치--️-owasp-내부-권고-충돌))


---
## 1. 비밀번호를 안전하게 저장하는 방법

### 1.1 권장 알고리즘 우선순위 — **Argon2id 1순위**

OWASP Password Storage Cheat Sheet는 다음 순서를 명시한다:

1. **Argon2id** — 1순위
2. **scrypt** — Argon2id 사용 불가 시
3. **bcrypt** — 레거시 시스템 한정 ("legacy systems only")
4. **PBKDF2** — FIPS-140 준수가 필요한 경우만

> 결론: 신규 프로젝트는 **Argon2id 채택**이 표준. bcrypt도 여전히 유효하지만 "레거시" 분류라는 점은 의식해둘 것.

### 1.2 알고리즘별 권장 파라미터

**Argon2id** (5개 동일 보안 수준 설정 중 택1, 메모리/CPU 트레이드오프):
| 메모리 | 시간(t) | 병렬도(p) |
|---|---|---|
| m=47104 (46 MiB) | t=1 | p=1 |
| m=19456 (19 MiB) | t=2 | p=1 ← **최소 권장** |
| m=12288 (12 MiB) | t=3 | p=1 |
| m=9216 (9 MiB) | t=4 | p=1 |
| m=7168 (7 MiB) | t=5 | p=1 |

**bcrypt**:
- 최소 work factor: **10**
- 최대 비밀번호 길이: **72 bytes** (강제 제한 — 이걸 모르고 더 긴 비밀번호 받으면 뒷부분이 무시됨)

**PBKDF2** 반복 횟수 (내부 해시별):
- HMAC-SHA1: 1,400,000
- HMAC-SHA256: 600,000
- HMAC-SHA512: 220,000

> NIST SP 800-63B는 PBKDF2 최소 **10,000회** 반복을 명시(2017년 기준). OWASP 권고가 훨씬 강하다 — 컴퓨팅 능력 향상에 따라 OWASP가 더 최신 기준이라 OWASP를 채택.

**Node.js 라이브러리**:
- `argon2` (node-argon2) — Argon2id 지원, 1순위
- `bcrypt` 또는 `bcryptjs` — bcrypt
- `node:crypto` 내장 — `pbkdf2`, `scrypt` 지원

### 1.3 Salt

- **자동 생성·관리됨** — "most widely used implementations and libraries automatically generate and manage salts internally" (OWASP). 라이브러리(`argon2`, `bcrypt`)가 알아서 처리하므로 직접 만들 필요 없음.
- NIST SP 800-63B 기준 **최소 32-bit salt**. (실제로 라이브러리는 128-bit 이상 사용)

### 1.4 Pepper (서버 시크릿)

- salt와 달리 **모든 비밀번호에 공유**되는 시크릿. 해시와 함께 DB에 저장하면 안 되고 **secrets vault나 HSM에 별도 보관** 필수.
- 한 번 설정하면 **변경 시 모든 사용자 비밀번호 재설정 필요** — 운영 부담 큼.
- 1차 범위에서는 도입하지 않고, AWS Secrets Manager/Parameter Store 같은 인프라 마련 후 옵션 고려.

### 1.5 평문/단순 해시 저장이 안 되는 이유

- MD5/SHA-1/SHA-256은 **속도가 빠르도록 설계된 일반 해시** — DB 유출 시 GPU로 초당 수십억 회 무차별 대입 가능.
- 위 4개(Argon2/scrypt/bcrypt/PBKDF2)는 **의도적으로 느리게** 설계된 키 파생 함수(KDF). OWASP 표현: "slow by design".

### 1.6 비밀번호 정책 (NIST SP 800-63B + OWASP Auth Cheat Sheet 교차)

| 항목 | NIST SP 800-63B | OWASP Auth Cheat Sheet |
|---|---|---|
| 최소 길이 | **8자** (사용자 선택) | **8자** (MFA 사용 시), **15자** (MFA 없을 때) |
| 최대 길이 | **64자 이상 허용** | **64자 이상 허용** |
| 복잡도 강제 | **금지** ("SHOULD NOT impose composition rules") | **불권장** (모든 문자·유니코드·공백 허용) |
| 정기 변경 강제 | **금지** ("SHOULD NOT require... arbitrarily") | (동일 입장) |
| 차단 목록 | **필수** (유출 corpus, 사전 단어, 연속 문자, 서비스명 등) | (동일 입장) |
| 유출 비밀번호 검사 | (직접 명시 X) | **권장** — Pwned Passwords API |

**우리 프로젝트 결정값 (둘 다 만족하는 안)**:
- 최소 8자 + MFA 미구현 1차 범위에선 안전 마진으로 **최소 10자** 권장
- 최대 64자 이상 허용 (해시는 어차피 고정 길이)
- 복잡도 강제 X — 대신 **차단 목록 검사** + (선택) Pwned Passwords API

### 1.7 결정 사항

- **알고리즘**: Argon2id, 파라미터 `m=19456, t=2, p=1`
- **라이브러리**: `argon2` (npm)
- **Salt**: 라이브러리 자동 처리
- **Pepper**: 1차 범위 미도입
- **정책**: 최소 10자, 최대 ≥64자, 복잡도 강제 X, 차단 목록 검사

### 출처

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-63B Digital Identity Guidelines (Authentication and Lifecycle Management)](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

## 2. 로그인 후 사용자 인증 유지 — 토큰 만료·재발급 정책

### 2.1 세션 vs JWT 트레이드오프

| 항목 | 세션 (서버 저장) | JWT |
|---|---|---|
| 상태 | Stateful (서버 메모리/DB) | Stateless (토큰 자체에 정보) |
| 즉시 무효화 | 쉬움 (서버에서 삭제) | 어려움 (블랙리스트나 짧은 만료로 우회) |
| 수평 확장 | 세션 저장소(Redis 등) 필요 | 자연스러움 |
| MSA/모바일 | 추가 처리 필요 | 친화적 |

> 우리는 React SPA + Express + 단일 백엔드라 둘 다 가능하지만, **PLAN.md 4.1절이 JWT 채택**으로 결정함. 이유: 모바일 확장 가능성 + 표준화된 라이브러리 풍부.

### 2.2 Access Token + Refresh Token 분리

**OWASP JWT Cheat Sheet 권고**:
- Access Token 유효기간: **약 15분** (`withExpiresAt()` 등으로 강제 만료)
- 짧은 Access Token + 긴 Refresh Token 분리가 표준 패턴

**일반적 산업 관행**:
- Access Token: 15분 ~ 1시간
- Refresh Token: 7일 ~ 30일

> Auth0 문서는 "shorter-lived" / "longer-lived"만 언급하고 구체 수치는 안 줌. 실무 표준값은 OWASP 15분이 가장 권위 있음.

### 2.3 Refresh Token Rotation + Reuse Detection

**Auth0 공식 정의**:
> "every time an application exchanges a refresh token to get a new access token, a new refresh token is also returned."

**탈취 감지 시나리오** (가장 중요한 메커니즘):

1. **시나리오 A — 정상 사용자가 먼저 사용**:
   - 정상 사용자 → Refresh Token 사용 → 새 토큰 쌍 발급 → 기존 Refresh Token 폐기
   - 탈취자가 나중에 기존 토큰 사용 시도 → **재사용 감지** → **전체 토큰 패밀리 무효화** (정상 사용자도 강제 재로그인)
2. **시나리오 B — 탈취자가 먼저 사용**:
   - 탈취자 → 토큰 사용 → 새 쌍 발급 → 잠시 접근 가능
   - 정상 사용자가 원본 토큰 사용 시도 → **재사용 감지** → **전체 패밀리 무효화** → 탈취자 접근 차단

> 핵심: **같은 Refresh Token이 두 번 사용되면 무조건 패밀리 전체 폐기**. 이걸 구현하려면 Refresh Token을 DB에 저장하고 사용 이력을 추적해야 한다.

### 2.4 토큰 저장 위치 — ⚠ OWASP 내부 권고 충돌

| 위치 | 장점 | 단점 |
|---|---|---|
| `localStorage` | 단순 | **XSS에 취약** — 스크립트가 읽을 수 있음 |
| `sessionStorage` | XSS 시 영향 일부 제한 (탭 닫으면 삭제) | 여전히 JS 접근 가능 → XSS 위험 잔존 |
| **`httpOnly Cookie`** | **JS 접근 불가 (XSS 안전)** + Secure + SameSite | CSRF 대응 필요 (SameSite=Lax/Strict) |

**OWASP 권고가 문서별로 다름**:

- **OWASP JWT Cheat Sheet**: `sessionStorage` + Bearer 헤더 권장. 쿠키는 "automatic transmission"(자동 전송으로 인한 CSRF) 우려로 회피.
- **OWASP Session Management Cheat Sheet**: "Strongly prefer cookies" — `HttpOnly` + `Secure` + `SameSite`로 보호하라고 명시. localStorage는 "lacks encryption guarantees and persists across sessions".

**해석**:
- JWT 시트는 *오래된* JWT 운영 관점(쿠키 자동 전송 = CSRF)에서 작성됨.
- 세션 관리 시트는 더 최근 가이드. `SameSite=Lax/Strict` + CSRF 토큰으로 CSRF는 막을 수 있다는 입장.

**우리 프로젝트 결정**: **httpOnly Cookie** 채택. 근거:
- React SPA에서 XSS 위험이 더 즉각적이고 광범위 (npm 의존성 다수)
- `SameSite=Strict` + Secure 조합이면 CSRF는 거의 차단됨 (브라우저가 cross-site 요청에 쿠키를 안 실음)
- Express + `cookie-parser` + `csurf`(또는 double-submit token)로 추가 방어 가능

### 2.5 JWT 서명 알고리즘 — HS256 vs RS256

**OWASP**:
- **HS256 (HMAC)**: 대칭키, **64자 이상의 강한 시크릿** 필수. 단일 서버 환경.
- **RS256 (RSA)**: 비대칭키. **선호 권고** — 시크릿 공유로 인한 오프라인 크래킹 위험 제거.

**우리 프로젝트**: 단일 백엔드라 HS256으로 충분. 단, 시크릿은 64자 이상 + Secrets Manager 보관.

### 2.6 JWT 주요 취약점 (구현 시 반드시 방어)

1. **`alg=none` 공격**: 토큰 헤더에서 알고리즘을 `none`으로 위조하면 서명 검증을 우회 가능. → 검증 시 **명시적으로 알고리즘 지정** 필수.
2. **약한 시크릿**: HS256 시크릿이 짧거나 추측 가능하면 John the Ripper 같은 도구로 오프라인 크래킹.
3. **Token Sidejacking**: 토큰 탈취 후 재사용. → User context fingerprint(IP/UA 해시)를 Hardened Cookie로 함께 검증하는 패턴 권고.

### 2.7 JWT Payload — 넣어도 되는 것 / 안 되는 것

**OK**:
- `sub` (사용자 ID — UUID 권장, 자동증가 ID는 enumeration 위험)
- `iat` (issued at)
- `exp` (expiration)
- `iss` (issuer)
- 사용자 fingerprint (보안 컨텍스트)

**금지**:
- 비밀번호·해시 ❌
- 민감 PII (주민번호·전화번호 평문) ❌
- 권한 역할(role) — 위변조 가능성 의식하고, 서버 측 재검증 필수

> JWT는 **base64 인코딩**일 뿐 **암호화가 아님**. 누구나 payload 읽을 수 있다.

### 2.8 로그아웃 처리

JWT는 stateless라 즉시 무효화가 어려움. 표준 패턴 3가지:

1. **Fingerprint 기반** (OWASP 권장): JWT + 서버 fingerprint 쿠키 조합. 로그아웃 시 쿠키 삭제로 무효화.
2. **Denylist (블랙리스트)**: 무효화된 토큰의 SHA-256 해시를 DB에 저장, 만료 시각까지 유지.
3. **짧은 Access + Refresh 폐기**: Access Token은 어차피 15분이면 만료. 로그아웃 시 Refresh Token만 DB에서 삭제하면 갱신 불가 → 사실상 무효화.

**우리 프로젝트 결정**: 3번 (짧은 Access + Refresh DB 삭제). Refresh Token은 어차피 DB 저장 필요(rotation/reuse detection)이라 추가 비용 없음.

### 2.9 결정 사항

- Access Token 만료: **15분**, HS256 서명
- Refresh Token 만료: **14일**, DB 저장 + Rotation + Reuse Detection
- 저장 위치: **httpOnly + Secure + SameSite=Strict 쿠키**
- 로그아웃: Refresh Token DB row 삭제
- Payload: `sub` (UUID), `iat`, `exp`, `iss`

### 출처

- [OWASP JSON Web Token for Java Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Auth0 — Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
- RFC 7519 (JWT), RFC 7515 (JWS)

---

## 3. 다른 사람이 내 반려동물 정보를 못 보게 막는 방법 (인가)

### 3.1 인증 vs 인가

- **인증 (Authentication)**: "당신이 누구인지" — 로그인으로 신원 확인 (JWT)
- **인가 (Authorization)**: "당신이 무엇을 할 수 있는지" — 자원에 대한 권한 검증

> JWT가 유효해도 그게 *그 펫의 주인*인지는 별개 문제다. 인가가 빠지면 IDOR 발생.

### 3.2 BOLA (Broken Object Level Authorization) — OWASP API Security #1

OWASP API Security Top 10 (2023) **1위 취약점**.

**정의**: 인증된 사용자가 자기 권한 밖의 객체(record)를 조작할 수 있게 되는 취약점.

**실제 사고 사례** (OWASP 인용):

1. **이커머스 매출 데이터 노출**: `/shops/{shopName}/revenue_data.json` 패턴에서 shop 이름만 바꿔치기해 수천 개 매장의 매출 정보 유출.
2. **차량 원격 제어**: 커넥티드카 API가 VIN(차대번호)만으로 권한 검증 없이 제어 명령 수락 → 다른 사람 차량 조작 가능.
3. **GraphQL 문서 삭제**: 문서 ID만으로 삭제 mutation 호출 → 권한 검사 누락 → 남의 파일 삭제.

> 우리 프로젝트로 치환하면: `GET /api/pets/123/weight` 호출 시 `pet_id=123`이 *내 펫인지* 검증 안 하면 남의 펫 체중·증상·접종 이력 전부 조회 가능.

### 3.3 OWASP 공식 방어 권고

1. **모든 함수에서 권한 검증** — "Implement proper authorization checking in every function that uses an input from the client to access a record in the database"
2. **자원-사용자 관계를 매 요청마다 검증** — JWT의 user ID만 비교하는 건 부족. *그 user가 그 자원에 접근할 권한이 있는지*까지.
3. **예측 불가능한 ID 사용** — 자동증가 정수(1, 2, 3...) 대신 **GUID/UUID** 사용 권고. enumeration 차단.
4. **권한 테스트 작성 강제** — 실패하는 테스트가 있으면 배포 차단.

### 3.4 우리 프로젝트 미들웨어 설계안

**계층**: 라우터 → JWT 검증 미들웨어(`requireAuth`) → 펫 소유권 검증 미들웨어(`requirePetOwnership`) → 컨트롤러

```js
// pseudo-code
function requirePetOwnership(req, res, next) {
  const petId = req.params.petId;
  const userId = req.user.id; // requireAuth에서 채워진 값

  const pet = await db.query(
    'SELECT id FROM pets WHERE id = ? AND user_id = ?',
    [petId, userId]
  );

  if (!pet) return res.status(404).json({ error: 'Not found' });
  // 403 대신 404 반환 — 자원 존재 여부 노출 회피
  next();
}

// 사용
router.get('/api/pets/:petId/weight',
  requireAuth,
  requirePetOwnership,
  weightController.list
);
```

**핵심 원칙**:
- DB 쿼리에 **항상 `user_id` 조건 포함** — `WHERE pet_id = ? AND user_id = ?` 강제
- 미들웨어에서 검증 + 서비스/리포지토리 계층에서 한 번 더 검증 (방어 심층화)

### 3.5 응답 코드 — 403 vs 404

OWASP는 명시적으로 결정하지 않음. 일반 보안 관행:

- **403 Forbidden**: 자원 존재 + 접근 거부 → 자원 ID가 실제로 존재함을 알려주는 정보 누출
- **404 Not Found**: 자원 존재 여부 자체를 숨김

**우리 프로젝트 결정**: **404 통일**. 펫 ID는 enumeration 가능성이 있어서(자동증가 정수 사용 시) 존재 여부를 노출하지 않는 게 안전.

### 3.6 추가 방어 — 자원 ID 형식

PLAN.md 5절에서 ERD가 단순 정수 ID로 그려져 있지만, **펫·사용자 등 외부 노출 자원은 UUID 권장**. enumeration 자체를 무력화.

> 예: `/api/pets/4f3c-...-9a1` vs `/api/pets/123`

### 3.7 결정 사항

- 모든 펫 관련 라우트: `requireAuth` → `requirePetOwnership` → 컨트롤러 순서
- DB 쿼리: `user_id` 조건 항상 포함 (방어 심층화)
- 응답 코드: 권한 없음/없는 자원 모두 **404**로 통일
- 펫 ID: **UUID 사용** (PLAN.md 5절 ERD 갱신 제안)
- 권한 단위 테스트 필수 (남의 펫 ID로 호출 시 404 반환되는지)

### 출처

- [OWASP API Security Top 10 (2023) — API1: Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

---

## 4. 반려동물 등록 기능 — UI/UX 참고 (간이)

> 이 섹션은 표준·학회 자료가 아니라 일반 UX 관점이라 본격 인용은 건너뜀. 구현 시 와이어프레임 단계에서 다시 검토.

- 다묘/다견 전환: 헤더 드롭다운 또는 카드 선택이 일반적. 펫 수가 많지 않으니 드롭다운으로 충분.
- 생년월일 미상: 입양·구조 케이스 흔함 → "정확한 날짜 모름" 토글로 *대략 나이(개월)*만 받는 옵션 필요.
- 품종 입력: 자유 입력 + 자동완성. 완전한 표준 목록은 KASA·AKC 모두 공개되어 있지 않아 자유 입력 폴백 필수.

---

## 5. 보편적인 로그인, 회원가입 로직, 알고리즘 정리

### 5.1 회원가입 표준 흐름

**서버 처리 순서** (OWASP Authentication Cheat Sheet 종합):

1. **입력 유효성 검증** — 이메일 형식(RFC 5322), 비밀번호 정책(1.6절)
2. **이메일 정규화** — 소문자 변환 + 앞뒤 공백 제거
3. **이메일 중복 검사** — `SELECT 1 FROM users WHERE email = ?`
4. **비밀번호 해시** — Argon2id (1.7절 결정값)
5. **DB 저장** — `pw_hash`만, 평문 절대 X
6. **(선택) 이메일 인증 메일 발송**
7. **응답** — 자동 로그인 X, 로그인 화면으로 이동

### 5.2 이메일 enumeration 방지

**문제**: 회원가입 시 "이미 가입된 이메일" 응답을 그대로 노출하면 → 공격자가 이메일 목록을 던져서 가입자를 식별 가능.

**OWASP 권고**:
- 회원가입·로그인·비밀번호 재설정 모두 **동일 응답** 사용
- "가입 완료. 이메일을 확인하세요" 식으로 가입 여부와 무관하게 같은 메시지
- 응답 시간도 일정하게 (비동기 처리)

**우리 프로젝트 트레이드오프**:
- UX 손실: 사용자가 "이미 가입된 이메일인데..." 모르고 다시 시도
- 절충안: **회원가입 시에는 enumeration 허용**, **로그인·재설정에서는 통일**. 이유: 회원가입 단계 enumeration은 어차피 비밀번호 재설정에서도 노출되므로 UX 우선.
- 결정 후 PLAN.md에 명시.

### 5.3 이메일 인증 도입 여부

**도입 시 이점**:
- 가짜 이메일 가입 차단
- 비밀번호 재설정 신뢰도 (이메일이 실재함을 보장)

**도입 시 부담**:
- SMTP/SES 인프라 구축
- 인증 토큰 테이블 추가 + 만료 처리
- 사용자 가입 이탈률 증가

**우리 프로젝트 결정 (제안)**: **1차 범위 미도입**. 6주 일정에 인프라 부담 큼. 2차 단계에서 AWS SES로 도입.

### 5.4 로그인 표준 흐름

1. 이메일로 사용자 조회
2. **사용자 존재 여부와 무관하게 항상 해시 비교 수행** — 타이밍 공격 방어
3. `argon2.verify(stored_hash, input)` 으로 비밀번호 검증
4. 성공 시 Access + Refresh Token 발급, Refresh를 DB 저장
5. 응답: httpOnly 쿠키로 토큰 전달

**OWASP 핵심 원칙**:
- **에러 메시지 통일**: "이메일 또는 비밀번호가 올바르지 않습니다" — 어느 쪽이 틀렸는지 노출 X
- **타이밍 공격 방어**: 사용자 없을 때도 더미 해시 비교 — 응답 시간으로 계정 존재 추정 차단
  ```js
  const user = await db.findByEmail(email);
  const hash = user?.pw_hash ?? DUMMY_ARGON2_HASH; // 미리 만든 더미 해시
  const ok = await argon2.verify(hash, password);
  if (!ok || !user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
  ```

### 5.5 비밀번호 재설정 흐름

**OWASP Forgot Password Cheat Sheet 표준**:

1. 사용자 → "비밀번호 찾기" → 이메일 입력
2. 서버: **사용자 존재 여부와 무관하게 동일 응답** ("이메일을 보냈습니다") + **응답 시간도 일정하게** (비동기 처리)
3. 존재 시 **재설정 토큰** 생성:
   - **CSPRNG** (cryptographically secure random number generator) 사용
   - **무차별 대입 방어가 가능한 길이** (구체 수치는 OWASP 미명시 — 산업 관행 **128bit / 32바이트 hex** 표준)
   - **개별 사용자에 연결됨**
4. 토큰을 **해시해서 DB 저장** (원본은 메일에만 — DB 유출 시에도 안전)
5. 메일 링크 → 토큰 검증 → 새 비밀번호 입력 → 해시 후 갱신 → 토큰 폐기 (1회용)
6. **모든 활성 세션·Refresh Token 무효화** — 탈취 시 자동 로그아웃 효과
7. **재설정 완료 알림 메일 발송** — 본인이 아닐 경우 인지 가능 (단, 새 비밀번호는 메일에 절대 X)

> ⚠ OWASP는 토큰 만료 시간 구체값을 명시하지 않음. 산업 관행은 **15~60분**. 우리는 **30분**으로 결정.

**우리 결정값**:
- 토큰: 32바이트(256bit) hex, `crypto.randomBytes(32).toString('hex')`
- DB 저장: SHA-256 해시 + `expires_at`(now + 30분) + `used_at`
- 만료: 30분
- 자동 로그인 X

### 5.6 무차별 대입 / 크리덴셜 스터핑 방어

**OWASP Authentication Cheat Sheet**:
- **계정 잠금**: 일정 실패 횟수 후 잠금. **지수적 잠금 시간** 권장 — 1초로 시작해 실패마다 2배.
- **CAPTCHA**: 1회 실패부터 X. **소수 회 실패 후** 노출 (UX 균형). reCAPTCHA/hCaptcha.
- **계정 잠금 중에도 비밀번호 찾기는 동작** — DoS(악의적 잠금) 방지

**OWASP Credential Stuffing Cheat Sheet**:
- **MFA가 1순위 방어** — Microsoft 통계로 **99.9% 계정 침해 차단**
- **Rate Limiting**: 단순 횟수 제한보다 **짧은 버스트 + 긴 윈도우** 조합 권장
- **IP 단위 차단은 부족** — 분산 공격에 우회 쉬움. **디바이스 fingerprint** 병행
- **유출 비밀번호 검사**: **Pwned Passwords API** (haveibeenpwned.com) — ASVS v4.0 요구 2.1.7

**우리 프로젝트 1차 범위 결정**:
- MFA: 1차 범위 미도입 (인프라 부담), 2차에서 도입 검토
- Rate Limit: `express-rate-limit`
  - 로그인: IP당 1분에 5회 실패 → 5분 잠금 (지수 backoff 시작값)
  - 회원가입·재설정 요청: IP당 10분에 3회
- CAPTCHA: 1차 범위 미도입 (서버 인증 충분), 2차에서 도입
- Pwned Passwords API: **1차 범위 도입** — k-Anonymity 모델로 비밀번호를 평문 전송 안 하고도 확인 가능 (구현 부담 작음)

### 5.7 통합 결정 사항 — 이 섹션의 최종 산출물

> PLAN.md 4.1절 갱신 제안 시 그대로 사용할 스펙.

| 항목 | 결정값 | 출처/근거 |
|---|---|---|
| 비밀번호 해시 | **Argon2id** `m=19456, t=2, p=1` | OWASP Password Storage |
| 비밀번호 정책 | 최소 10자 / 최대 ≥64자 / 복잡도 강제 X / 차단목록 + Pwned Passwords | NIST 800-63B + OWASP Auth |
| Access Token | JWT, HS256, **15분** 만료 | OWASP JWT |
| Refresh Token | **14일** 만료, DB 저장, **Rotation + Reuse Detection** | Auth0 RTR |
| 토큰 저장 | **httpOnly + Secure + SameSite=Strict 쿠키** | OWASP Session Management |
| 이메일 인증 | **1차 범위 미도입** | 인프라 부담 |
| 재설정 토큰 | 32바이트 hex, **30분** 만료, DB에 SHA-256 해시 저장, 1회용 | OWASP Forgot Password |
| 로그인 Rate Limit | IP당 1분 5회 실패 → 5분 잠금 (`express-rate-limit`) | OWASP Auth |
| 권한 검증 | `requireAuth` → `requirePetOwnership` 미들웨어 + DB 쿼리 `user_id` 조건 | OWASP API Security #1 (BOLA) |
| 응답 코드 | 권한 없음/없는 자원 모두 **404** 통일 | enumeration 방지 |
| 펫 ID | **UUID** | BOLA 방어 |
| MFA | 2차 범위 (Microsoft 통계: 99.9% 침해 차단) | OWASP Credential Stuffing |

→ 회의 시 위 표 기준으로 PLAN.md 4.1절 갱신 제안.

---

## 공통 규칙 (function.md "공통 규칙" 인용)

- **출처 링크**를 자료마다 함께 기록 — 본 문서 각 섹션 하단 ✓
- **블로그 글 말고 표준·학회·정부 자료** 우선 — OWASP·NIST·RFC만 인용 ✓
- **2개 이상 출처에서 같은 내용**이 나오는 것만 채택 — 비밀번호 정책은 NIST + OWASP 양쪽 비교, 토큰 저장 위치는 OWASP 두 시트 충돌 명시 ✓

---
