FROM node:18-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY prisma ./prisma

RUN npx prisma generate --schema=./prisma/schema.prisma

COPY . .
ENV PORT=3000
ENV NODE_ENV=production
ENV JWT_EXPIRES_IN=15m
ENV JWT_REFRESH_EXPIRES_IN=7d
ENV MOCK_PAYMENT_SECRET=mockpaymentsecret2024
ENV APP_URL=https://sayat101-shopbuilder-app.kazi.rocks
EXPOSE 3000

CMD ["node", "src/server.js"]