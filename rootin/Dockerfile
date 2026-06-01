# ─────────────────────────────────────────
# Stage 1: React 빌드
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 먼저 설치 (캐시 레이어 최적화)
COPY package*.json ./
RUN npm ci

# 빌드 타임 환경변수 (Vite는 빌드 시점에 번들에 포함됨)
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# 소스 복사 후 빌드
COPY . .
RUN npm run build
# Vite 사용 시 결과물: /app/dist
# ─────────────────────────────────────────
# Stage 2: Nginx로 정적파일 서빙
# ─────────────────────────────────────────
FROM nginx:alpine

# 기본 nginx 설정 제거
RUN rm /etc/nginx/conf.d/default.conf \
    && apk add --no-cache curl

# FE 전용 nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 결과물 복사
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

