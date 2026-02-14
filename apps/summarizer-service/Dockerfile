# ---------- Stage 1: Builder ----------
FROM node:lts AS builder
WORKDIR /app

# Install PNPM globally
RUN npm install -g pnpm

# Copy only dependency files first (better cache)
COPY package*.json pnpm-lock.yaml nx.json tsconfig.base.json ./

# Install all dependencies for build
RUN pnpm install --frozen-lockfile --prefer-offline --unsafe-perm

# Copy the workspace (apps/libs)
COPY apps ./apps
COPY libs ./libs

# Build only the summarizer service
# Use single-threaded build to avoid pthread errors in Docker
RUN pnpm exec nx build summarizer-service --maxParallel=1

# Install only production dependencies into node_modules
RUN pnpm install --prod --frozen-lockfile --prefer-offline

# ---------- Stage 2: Runtime ----------
FROM node:lts
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy the built service
COPY --from=builder /app/dist/apps/summarizer-service ./dist

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy wait-for-kafka script
COPY wait-for-kafka.sh ./
RUN chmod +x wait-for-kafka.sh

USER node
EXPOSE 3000

# Wait for Kafka, then start app
CMD ["sh", "./wait-for-kafka.sh", "kafka", "9092", "node", "dist/main.js"]
