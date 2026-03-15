FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

# DATABASE_URL is needed at build time for Next.js page data collection
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN PRISMA_ADVISORY_LOCK_TIMEOUT_MS=60000 npx prisma migrate deploy

RUN npm run build

CMD sh -c "node_modules/.bin/next start -p ${PORT:-3000}"
