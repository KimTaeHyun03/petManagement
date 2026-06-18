# 프론트엔드 (client)

반려동물 헬스케어 웹 서비스의 프론트엔드. 백엔드 API(`../server`)와 연동된다.

## 기술 스택

- React 19 + TypeScript
- Vite (빌드 / 개발 서버)
- React Router (라우팅)
- ESLint

## 실행 방법

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드 (tsc 타입체크 + vite build → dist/)
npm run preview  # 빌드 결과 미리보기
npm run lint     # 린트
```

> 백엔드 API 기본 주소는 `http://localhost:4000` (CORS 허용 origin: `http://localhost:5173`).

## 폴더 구조

```
src/
├─ components/   # 기능별 패널 (Vaccinations / Ocr / Weight / Chatbot / Timeline)
├─ api.ts        # 백엔드 API 클라이언트
├─ App.tsx       # 라우팅 · 레이아웃 · 인증 상태
├─ main.tsx      # 엔트리포인트
└─ index.css     # 전역 스타일
```

> 스타일은 컴포넌트별 `.css` 파일로 분리해 `.tsx`와 쌍으로 관리한다.
