FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY prisma ./prisma

RUN npx prisma generate --schema=./prisma/schema.prisma

COPY . .
ENV PORT=3000
ENV NODE_ENV=production
ENV JWT_EXPIRES_IN=15m
ENV JWT_REFRESH_EXPIRES_IN=7d
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
