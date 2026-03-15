FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

# DATABASE_URL is needed at build time for Next.js page data collection
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npm run build

CMD sh -c "PRISMA_ADVISORY_LOCK_TIMEOUT_MS=60000 DATABASE_URL=${DIRECT_URL:-$DATABASE_URL} npx prisma migrate deploy && node_modules/.bin/next start -p ${PORT:-3000}"
