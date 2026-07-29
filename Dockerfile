# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/data/app.db"
ENV UPLOAD_DIR="data/uploads"
ENV PORT=3000

# Copy files needed for postinstall (prisma generate) before npm ci
COPY package.json package-lock.json* ./
COPY prisma ./prisma

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy remaining source
COPY . .
RUN npx prisma generate

# Build the Next.js app
RUN npm run build

# Switch to production mode for runtime
ENV NODE_ENV=production

# Ensure writable data directories for SQLite DB and uploaded PDFs
RUN mkdir -p /app/data/uploads

EXPOSE 3000

# Push schema to SQLite (creates DB if missing), then start
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]
