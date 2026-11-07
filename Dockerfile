# 단일 컨테이너: Express(API) + 빌드된 React(정적 파일)을 한 서버에서 서빙한다.

# 1. 프론트엔드 빌드
FROM node:22-slim AS client-build
WORKDIR /client
COPY client/package.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# 2. 백엔드 빌드 (TypeScript -> JS)
FROM node:22-slim AS server-build
WORKDIR /server
COPY server/package.json ./
RUN npm install --no-audit --no-fund
COPY server/ ./
RUN npm run build

# 3. 실행 이미지
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=server-build /server/dist ./dist
COPY server/migrations ./migrations
COPY --from=client-build /client/dist ./public

# Cloud Run은 PORT 환경변수(기본 8080)로 포트를 지정한다. 서버는 PORT를 읽는다.
EXPOSE 8080
CMD ["node", "dist/index.js"]
