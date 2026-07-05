# ============================================================
# SmartMove Frontend — Multi-Stage Dockerfile
# Base: Node 22 Alpine
# ============================================================

# ----------------------------------------------------------
# Stage 1: Dependencies — install node_modules
# ----------------------------------------------------------
FROM node:22-alpine AS deps

# Add libc6-compat for Alpine compatibility with some npm packages
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies (clean install for reproducible builds)
RUN npm ci --verbose --no-audit --no-fund

# ----------------------------------------------------------
# Stage 2: Builder — build the Next.js application
# ----------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY . .

# Set Next.js telemetry opt-out
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Build the application (produces .next/standalone)
RUN npm run build

# ----------------------------------------------------------
# Stage 3: Runner — lean production image
# ----------------------------------------------------------
FROM node:22-alpine AS runner

LABEL maintainer="SmartMove Team" \
      description="SmartMove Next.js Frontend" \
      version="1.0"

WORKDIR /app

# Set to production
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy the public assets
COPY --from=builder /app/public ./public

# Copy the standalone server and static files
# The standalone output includes a minimal node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the Next.js server
CMD ["node", "server.js"]
