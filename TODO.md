# TODO — 다음 작업 트래커

> 시점: 2026-05-18
> 회의 후 주차별 일정표로 재편 예정. 지금은 작업 단위 트래커.

---

## 즉시 처리

- [ ] **회원가입 + 로그인 + 펫 등록 commit** — 사용자 검토 후 진행 (현재 검토 단계, working tree에 staged)
- [ ] **DB 엔진 결정 (PostgreSQL vs MySQL)** — 김찬영과 협의. 결정 후 `PLAN.md` 10절·`CLAUDE.md`·`server/migrations/` 갱신
  - 현 코드는 **PostgreSQL 가정** (pgcrypto, `$1` placeholder, jsonb). MySQL로 결정되면 마이그레이션 + repo 쿼리 재작성 필요.
- [ ] **AWS RDS 인스턴스 셋업** — 담당: 김찬영. endpoint·DB명·계정 정보 공유 필요
  - 현재 `.env` 호스트만 입력됨 (`empty-bowl-db-instance-1.cd2e804cyc02.ap-northeast-2.rds.amazonaws.com`). 사용자가 user/password/dbname 채워야 동작.

## RDS 준비 후

- [x] `server/src/db/pool.ts`에 SSL 설정 추가 — `sslmode=require` 또는 RDS 호스트 자동 감지로 처리. 단 현재는 `rejectUnauthorized:false` → 운영 전 RDS Root CA로 검증 강화 필요.
- [ ] `npm run migrate` 로 `001_create_users.sql` + `002_create_pets.sql` 적용
- [ ] 회원가입 엔드포인트 실제 호출 테스트 — 정상 1건 + 5가지 실패 케이스(중복/짧은 비번/Pwned/이메일 형식/Rate limit)
- [ ] 로그인 엔드포인트 실제 호출 테스트 — 정상 / 잘못된 비번 / 미가입 이메일(타이밍 일정 확인) / Rate limit

## 회원가입 라인 마무리 (다음 코딩 작업)

- [x] `POST /api/auth/login` — research_taehyun §4 (타이밍 공격 방어용 더미 해시 포함)
- [x] `POST /api/auth/logout` — Access-only 정책이라 쿠키 clear만 수행
- [x] `GET /api/auth/me` — 쿠키 인증 상태 확인 (프론트 진입 시 자동 로그인 복원용)
- [x] `server/src/utils/token.ts` — HS256 Access 발급·검증 (`algorithms: ['HS256']` 명시)
- [x] `requireAuth` 미들웨어 (`server/src/middleware/auth.ts`)
- [ ] **(후속) `POST /api/auth/refresh`** — Refresh Rotation + Reuse Detection (research §2.3)
- [ ] **(후속) `refresh_tokens` 마이그레이션** (rotation family 추적용)

> 📌 1차 구현은 **Access-only(httpOnly 쿠키, 기본 2h)** 로 진행했다. research_taehyun.md §2의 정본은 Access 15m + Refresh 14d Rotation이라 정합성 차이가 있고, **운영 전환 전에 반드시 좁혀야 한다** (`JWT_ACCESS_TTL=15m` + Refresh 도입). PLAN.md §4.1의 "Refresh Token 인증" 문장과도 어긋남.

## 로그인 진입 전 결정 사항

- [ ] **CSRF 라이브러리 선정** — `csurf` deprecated (research §2.4). 후보 조사: `csrf-csrf`, `tiny-csrf` 등
  - 1차 구현은 `SameSite=Strict` 쿠키로만 방어 중. Refresh 도입 시점에 함께 결정.
- [ ] **PLAN.md 5절 ERD에 `User.id = UUID` 반영 제안** — research §3.7. 사용자 승인 후 PLAN.md 갱신

## 명세 정합성 (보류)

- [ ] **`plan3.md` 처리 방식 결정** — rename / PLAN.md에 흡수 / 새로 작성 중 선택. 현재 `PLAN.md`·`workflow.md`가 미존재 파일을 "워크플로 정본"으로 참조 중
- [ ] **MFA / 이메일 인증 1차 도입 여부** — 학과 평가 기준 확인 후 회의 결정

## 김태현 본업 — 회원가입 라인 정리 후

- [x] **반려동물 등록** — `POST /api/pets` + `GET /api/pets` 구현. `requireAuth`로 인증 강제, `user_id` 필터로 펫 격리.
  - ERD 컬럼명 그대로 (`allergies_json` jsonb 등). `current_weight`는 ERD에 없어 제외 — 초기 체중 입력은 WeightRecord(김기연) 도입 후 연동.
- [ ] **(후속) `PATCH /api/pets/:id` / `DELETE /api/pets/:id`** — 수정·삭제 + `requirePetOwnership` 미들웨어 (research §3.4)
- [ ] **챗봇** — `/api/chat` Gemini + 펫 컨텍스트 RAG, `ChatLog` 테이블

---

## 참고

- 작업 단위로 들어가기 전 `RESEARCH → PLAN → 구현` 순서 (`CLAUDE.md` "작업 워크플로")
- 인증 결정값은 `research/research_taehyun.md` §5.7 표가 정본
