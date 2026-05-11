# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ⚠ **상위 폴더(`D:\capstone\CLAUDE.md`)는 참조하지 말 것.** 그 파일은 다른 프로젝트(데이트 코스 추천 앱) 기준이라 이 저장소와 도메인이 다르다. 이 저장소의 명세·관습은 본 파일과 `PLAN.md`/`function.md`/`RESEARCH.md`만으로 결정한다.

## 현재 상태 — 코드 이전 설계 단계

이 저장소는 **반려동물 헬스케어 웹 서비스**의 사전 설계 산출물만 들어 있다. 소스 디렉토리, `package.json`, 빌드·테스트 도구가 아직 존재하지 않으므로 일반적인 build/lint/test 명령은 적용되지 않는다. 작업이 들어오면 "코드를 만들 차례인지" vs "문서를 갱신할 차례인지" 먼저 판단할 것.

루트에 있는 4개 문서가 전부다:

| 파일 | 역할 |
|---|---|
| `README.md` | 프로젝트 한 줄 소개, 팀, 기술 스택, 문서 읽는 순서 |
| `function.md` | **누가 어떤 기능을 담당하는지** (4인 분담표) + 자료조사 항목 |
| `RESEARCH.md` | 왜 만드는지(슬로건·요구사항)와 "유기적 시스템" 설계 결정의 근거 |
| `PLAN.md` | 아키텍처·ERD·위험도 엔진·화면 흐름 — 가장 상세한 설계 문서 |

> 참고: `README.md`는 `TODO.md`(주차별 일정)를 언급하지만 아직 존재하지 않는다. 회의에서 일정 확정 후 만들 예정.

## 권위 있는 명세 파일 (SSOT)

다음 두 파일이 "무엇을 만들 것인가"의 단일 진실 공급원이다. 구현이 명세를 위반하면 안 되고, 명세에 모순이 보이거나 수정이 필요하면 **임의로 고치지 말고 사용자에게 먼저 보고**한다.

- **`PLAN.md`** — 시스템 아키텍처(3절), 기능별 상세 설계(4절), ERD(5절), 위험도 엔진(6절), 외부 API 출처(7절), 범위 결정(13절)
- **`function.md`** — 팀원별 담당 기능. 작업 의뢰가 특정 기능에 묶여 있으면 누구의 영역인지 먼저 확인.

`RESEARCH.md`는 결정의 *근거*이지 명세가 아니다. PLAN과 RESEARCH가 충돌하면 PLAN이 이긴다(PLAN은 RESEARCH를 검토한 뒤 내린 결론).

## 도메인 한 줄 요약

강아지·고양이 보호자가 일상 데이터(체중·음식·접종·증상)를 입력하면 → 위험도 점수가 자동 재계산되고 → 등급 변화 시 알림이 가는 **이벤트 기반 유기적 시스템**. 슬로건은 *"병원을 최대한 적게 가기 위해 사전에 대비"*.

핵심 설계 결정 (자주 흔들릴 수 있어서 미리 박아둔다):

- **AI 진단 안 함** — 증상 → 질환 매핑은 의료 책임 문제로 범위 밖. 증상 입력 결과 피드백은 `PLAN.md` 4.6절·13.3절의 **A + B + C 조합**(위험도 갱신 + 최근 7일 관련 이벤트 묶음 + 정적 권고 문구)으로 확정.
- **Gemini는 보조 검색용** — 위험음식 DB(ASPCA 23개)에 없는 음식만 호출, 응답은 캐시하고 항상 1차 소스 대조 라벨과 함께 노출.
- **이벤트 기반 자동 재분석** — 사용자가 수동으로 "분석" 버튼을 누르는 게 아니라, 입력 저장 → Event Bus → Risk Engine 재계산 → 등급 변경 시 알림. 단순 CRUD로 짜다가 이 흐름을 깨뜨리지 말 것.
- **펫 단위 격리** — 모든 기록(체중·음식·접종·증상)은 `pet_id`로 분리 저장하고, 모든 API에서 사용자-펫 권한 검증 강제. 한 계정에서 다묘/다견 관리가 핵심 사용 시나리오.
- **개인정보 최소화** — 집주소 수집·동물병원 찾기 기능은 1차 범위에서 제외(`PLAN.md` 13.2).
- **의료 자료 검증 절차** — 시드 데이터는 1차 출처(KASA·AVMA·ASPCA·농림축산검역본부) + 2개 이상 교차 검증을 통과한 항목만 등재(`PLAN.md` 7.1). 블로그·요약 글 인용 금지.

## 아키텍처 의도 (구현 전, PLAN.md 3·5·6절 기준)

```
[Web Client]  ──HTTPS/JWT──▶  [Express API]
                                    │
                                    ├─ 도메인 서비스 (Auth/Pet/Weight/Food/Vaccination/Symptom)
                                    ├─ Event Bus  ──▶ Risk Engine ──▶ Notification
                                    └─ Gemini API (DB 미존재 음식만)
                                         │
                                    [AWS RDS]
                                       └ 운영 DB + 마스터 (DangerFood/Vaccine/StandardWeight/SymptomGuide)
```

ERD 핵심: `User 1—N Pet 1—N {WeightRecord, FoodIntake, VaccinationRecord, SymptomLog, RiskScore}` + 4개 마스터 테이블. 인덱스는 `Pet.user_id`, `WeightRecord(pet_id, recorded_at DESC)`, `FoodIntake.eaten_at`이 빈번 조회 대상.

위험도 엔진 가중치 초안: 음식 0.35 / 체중 0.25 / 미접종 0.20 / 증상 0.20, 등급 `안심(0-30) / 관찰(31-60) / 주의(61-80) / 위험(81-100)`. 가중치는 환경변수/DB 설정값으로 외부화해서 코드 수정 없이 튜닝하게 두기로 함(`PLAN.md` 6절).

## 기술 스택 (구현 시점에 채택 예정)

- **Frontend**: React + TypeScript, CSS-in-JS. ⚠ CSS는 `.tsx`에 합치지 말고 **별도 파일로 분리** (`PLAN.md` 10절).
- **Backend**: Node.js + Express (REST).
- **DB**: AWS RDS (PostgreSQL/MySQL — 비용·운영 편의로 결정 예정).
- **배포**: 프론트 S3(또는 EC2), 백엔드 EC2.
- **외부**: Google Gemini API (위험음식 보조 검색).

## 작업 워크플로 — RESEARCH → PLAN → 구현

비자명한 작업을 시작하기 전에 다음 순서를 지킨다 (이 저장소의 `RESEARCH.md`/`PLAN.md`가 그렇게 작성됐다):

1. **RESEARCH** = 발견(facts) — 관련 파일·함수, 기존 구현, 제약, 참고 자료. "어디를 건드려야 하는가."
2. **PLAN** = 결정(decisions) — research 기반 단계별 작업, 순서, 위험·롤백, 완료 기준. "무엇을 어떤 순서로 바꿀까."
3. 두 단계를 섞지 말 것. RESEARCH에 결정이 들어가거나 PLAN에 조사 노트가 섞이면 추후 추적이 어려워진다.

코드 이전 단계라서 위 두 파일은 *프로젝트 전체*에 대한 RESEARCH/PLAN이지만, 구현이 시작되면 작업 단위로도 같은 패턴을 따라간다.

## 커밋 메시지 규칙

타입은 영어 소문자 prefix로 시작한다. 한국어 본문은 OK.

| 타입 | 용도 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 (현재 단계 대부분의 커밋이 여기 해당) |
| `style` | 코드 스타일(기능 변경 없음) |
| `refactor` | 코드 구조 개선 |
| `test` | 테스트 코드 추가 |
| `chore` | 빌드 설정 등 기타 작업 |
