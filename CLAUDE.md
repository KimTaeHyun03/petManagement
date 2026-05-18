# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ⚠ **상위 폴더(`D:\capstone\CLAUDE.md`)는 참조하지 말 것.** 그 파일은 다른 프로젝트(데이트 코스 추천 앱) 기준이라 이 저장소와 도메인이 다르다. 이 저장소의 명세·관습은 본 파일과 `PLAN.md` / `function.md` / `workflow.md` / `RESEARCH.md`만으로 결정한다.

## 현재 상태 — 코드 스캐폴드 단계

이 저장소는 **반려동물 헬스케어 웹 서비스**다. 5.11 회의에서 OCR + 챗봇 중심으로 방향을 피벗했고(`PLAN.md`/`workflow.md` 반영 완료), 코드 스캐폴드 단계로 진입한 상태다.

- `client/` — Vite + React 19 + TypeScript 기본 템플릿 (아직 도메인 코드 없음, Vite 데모 화면 그대로)
- `server/server.ts` — 빈 파일. Express 부트스트랩이 첫 코드 작업

> 작업이 들어오면 "코드를 만들 차례인지" vs "문서를 갱신할 차례인지"부터 판단할 것.

루트 문서 구성:

| 파일 | 역할 |
|---|---|
| `README.md` | 프로젝트 한 줄 소개, 팀, 기술 스택, 문서 읽는 순서 |
| `function.md` | **누가 어떤 기능을 담당하는지** (4인 분담표) — 담당 정본 |
| `workflow.md` | 사용자 워크플로 — OCR 기반 일상 기록 흐름 |
| `RESEARCH.md` | 슬로건·요구사항·"왜 이렇게 설계했나"의 근거 |
| `PLAN.md` | 시스템 아키텍처·기능 설계·ERD·알림·외부 API — **가장 상세한 설계 문서** |
| `5.11 회의내용.md` | OCR 피벗 시점의 회의록 (방향 전환 근거) |
| `research/*.md` | 팀원별 자료조사 (백신·위험음식·인증 등) |

> 참고: `PLAN.md`와 `workflow.md`가 `plan3.md`를 "워크플로 정본"으로 인용하지만 그 파일은 아직 저장소에 없다. **실질적 정본은 `PLAN.md`**이고, 5.11 회의 결과는 `5.11 회의내용.md`에 남아 있다. `plan3.md`를 별도로 작성하기로 결정될 때까지 둘을 참조한다.
> `README.md`는 `TODO.md`(주차별 일정)를 언급하지만 아직 없다.

## 권위 있는 명세 파일 (SSOT)

다음 세 파일이 "무엇을 만들 것인가"의 단일 진실 공급원이다. 구현이 명세를 위반하면 안 되고, 명세에 모순이 보이거나 수정이 필요하면 **임의로 고치지 말고 사용자에게 먼저 보고**한다.

- **`PLAN.md`** — 시스템 아키텍처(3절), 기능별 상세 설계(4절), ERD(5절), 알림 정책(6절), 외부 API 출처(7절), 화면 흐름(8절), 기술 스택(10절)
- **`function.md`** — 팀원별 담당 기능. 작업 의뢰가 특정 기능에 묶여 있으면 누구의 영역인지 먼저 확인.
- **`workflow.md`** — 사용자 시점 흐름. PLAN과 충돌하면 PLAN이 이긴다(PLAN은 workflow를 검토한 뒤 내린 결론).

`RESEARCH.md`는 결정의 *근거*이지 명세가 아니다. PLAN과 RESEARCH가 충돌하면 PLAN이 이긴다.

## 도메인 한 줄 요약

강아지·고양이 보호자가 **사진 한 장(영수증·성분표)**을 올리면 → OCR이 자동 분류·매칭·기록하고 → 통합 타임라인이 시간순으로 쌓이고 → 챗봇이 누적된 펫 데이터를 컨텍스트로 자연어 상담을 해주는 웹 서비스. 슬로건은 *"병원을 최대한 적게 가기 위해 사전에 대비"*.

핵심 설계 결정 (자주 흔들릴 수 있어서 미리 박아둔다):

- **OCR 자동 기록이 핵심 입력 경로** — 영수증(→ 예방접종 자동 기록) / 성분표(→ 위험 성분 + 펫 알러지 매칭). 자동 저장이 아니라 **사용자 확정 후 저장** 흐름으로 오인식 위험 완화 (`PLAN.md` 4.4).
- **AI 진단 안 함** — 챗봇 시스템 프롬프트에 "진단·처방 X, 일반 정보 제공만" 명시. 면책 고지("응급 시 동물병원 방문 권장")를 UI 푸터·검색 결과·챗봇 응답에 상시 노출.
- **챗봇은 RAG식** — OpenAI API + 펫 단위 DB 컨텍스트(타임라인 + 프로필 + 알러지) 주입. 응답 시점 컨텍스트는 `ChatLog.context_snapshot_json`에 감사용으로 보관. 펫 단위 격리로 다른 사용자 데이터 누출 차단 (`PLAN.md` 4.8).
- **위험도 점수 엔진은 MVP 범위에서 제외** — 단순 규칙 알림(체중 ±10% 급변, 접종 D-7/D-1/D-day, 광견병 미접종 강조)만 유지 (`PLAN.md` 6절). 증상 입력도 1차 범위에서 제외 (`function.md` 김기연).
- **펫 단위 격리** — 모든 기록(체중·OCR·접종·챗봇)은 `pet_id`로 분리 저장하고, 모든 API에서 사용자-펫 권한 검증을 강제. 한 계정에서 다묘/다견 동시 관리가 핵심 사용 시나리오.
- **개인정보 최소화** — 집주소 수집·동물병원 찾기 기능은 1차 범위 제외.
- **의료 자료 검증 절차** — 시드 데이터(`DangerFood` / `Vaccine` / `StandardWeight` 마스터)는 1차 출처(KASA·AVMA·ASPCA·농림축산검역본부) + 2개 이상 교차 검증을 통과한 항목만 등재 (`PLAN.md` 7.1). 블로그·요약 글 인용 금지.

## 아키텍처 (PLAN.md 3·5절 기준)

```
[Web Client (React+TS)]
        │
        │ HTTPS / JWT
        ▼
[Express API]
        │
        ├─ 도메인 서비스
        │   ├ AuthService          (회원가입 / 로그인)
        │   ├ PetService           (반려동물 등록·프로필·알러지)
        │   ├ WeightService        (체중 기록·추세·급변 알림)
        │   ├ OCRService           (이미지 → 텍스트, 영수증/성분표 분류)
        │   ├ FoodService          (위험음식 검색·성분표 알러지 매칭)
        │   ├ VaccinationService   (예방접종 일정·이력·영수증 자동 기록)
        │   ├ TimelineService      (이벤트 통합·대시보드)
        │   └ ChatbotService       (OpenAI + DB 컨텍스트 RAG)
        │
        ├─ 알림 처리기 ─► 체중 급변 / 다음 접종일 도래 → Push
        │
        └─ 외부 연동
            ├ OCR 엔진             (선정 예정 — Google Vision / Tesseract / Naver Clova OCR)
            └ OpenAI API           (챗봇)

[AWS RDS]
    ├ 운영 DB (User / Pet / WeightRecord / VaccinationRecord / ReceiptRecord / IngredientScan / ChatLog)
    └ 마스터  (DangerFood / Vaccine / StandardWeight)

[AWS S3]  OCR 원본 이미지 보관
```

ERD 핵심:
```
User 1—N Pet 1—N { WeightRecord, VaccinationRecord, ReceiptRecord, IngredientScan, ChatLog }
```
자주 쓰이는 인덱스: `Pet.user_id`, `WeightRecord(pet_id, recorded_at DESC)`, `VaccinationRecord(pet_id, vaccinated_at DESC)`, `IngredientScan.scanned_at`, `ChatLog(pet_id, created_at DESC)`. 사용자-펫 권한 검증은 모든 API에서 강제.

## 기술 스택 (PLAN.md 10절)

- **Frontend**: React 19 + TypeScript, CSS-in-JS. ⚠ CSS 파일은 `.tsx`에 합치지 말고 **별도 파일로 분리** (스타일 책임 분리).
- **Backend**: Node.js + Express (REST API).
- **Database**: AWS RDS (PostgreSQL / MySQL — RDS 비용·운영 편의로 결정 예정).
- **외부 API**: OCR 엔진(선정 예정), OpenAI API (챗봇).
- **배포**: 프론트 S3(또는 EC2) / 백엔드 EC2 / DB RDS / 이미지 저장소 S3.

현재 빌드·테스트 도구는 `client/`에만 들어있다 (`vite`, `eslint`, `typescript`). `server/`는 아직 `package.json`이 없으므로 통상의 build/lint/test 명령은 적용 안 된다.

## 담당 분담 (function.md)

| 팀원 | 담당 기능 |
|---|---|
| **김태현 (총괄)** | 회원가입/로그인, 반려동물 등록, 챗봇 |
| **김기연** | 체중 관리(급변 알림 포함), 통합 타임라인 + 대시보드 |
| **장윤서** | OCR 변환, 위험 음식 검색 / 성분표 알러지 매칭 |
| **김찬영** | 예방접종 관리(영수증 OCR 자동 기록 포함), DB(RDS) · 배포 셋업 |

작업 의뢰가 들어오면 **누구 영역인지부터 확인**한다. 영역이 겹치면 사용자에게 보고.

## 작업 워크플로 — RESEARCH → PLAN → 구현

비자명한 작업은 다음 순서를 지킨다 (이 저장소의 `RESEARCH.md` / `PLAN.md`가 그렇게 작성됐다):

1. **RESEARCH** = 발견(facts) — 관련 파일·함수, 기존 구현, 제약, 참고 자료. "어디를 건드려야 하는가."
2. **PLAN** = 결정(decisions) — research 기반 단계별 작업, 순서, 위험·롤백, 완료 기준. "무엇을 어떤 순서로 바꿀까."
3. 두 단계를 섞지 말 것. RESEARCH에 결정이 들어가거나 PLAN에 조사 노트가 섞이면 추후 추적이 어려워진다.

구현 페이즈로 넘어가면 작업 단위(예: "회원가입/로그인 구현")로도 같은 패턴을 따라간다.

## 커밋 메시지 규칙

타입은 영어 소문자 prefix로 시작한다. 한국어 본문은 OK.

| 타입 | 용도 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 |
| `style` | 코드 스타일(기능 변경 없음) |
| `refactor` | 코드 구조 개선 |
| `test` | 테스트 코드 추가 |
| `chore` | 빌드 설정·스캐폴드 등 기타 작업 |
