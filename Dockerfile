# Frontend Dockerfile
# Multi-stage build: Next.js production build, then serve with standalone output

FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source and config
COPY next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs ./
COPY lib/ ./lib/
COPY app/ ./app/
COPY components/ ./components/
COPY scripts/ ./scripts/
COPY public/ ./public/

# Build Next.js
RUN pnpm build

# Production stage — use Next.js standalone output
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3020
ENV HOSTNAME="0.0.0.0"

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy standalone output from builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3020/api/health || exit 1

EXPOSE 3020

CMD ["node", "server.js"]
