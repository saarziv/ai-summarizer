# Stage 1: Build
FROM node:lts-alpine AS builder
WORKDIR /app

COPY package*.json nx.json tsconfig.base.json wait-for-kafka.sh ./
COPY apps ./apps
COPY libs ./libs

RUN npm install  # <--- Keep dev deps here for build
RUN npx nx build ai-service

# Stage 2: Runtime
FROM node:lts-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY --from=builder app/apps/ai-service/dist ./dist
COPY --from=builder /app/wait-for-kafka.sh ./wait-for-kafka.sh
RUN chmod +x wait-for-kafka.sh
RUN apk add --no-cache netcat-openbsd #for the script


COPY package*.json ./

RUN npm install --omit=dev --legacy-peer-deps --fetch-retries=5 --fetch-retry-factor=2 --fetch-retry-maxtimeout=60000

USER node

CMD ["sh", "./wait-for-kafka.sh", "kafka", "9092", "node", "dist/main.js"]

#CMD ["node", "dist/main.js"]
