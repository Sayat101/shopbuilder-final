FROM node:18-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY prisma ./prisma

RUN npx prisma generate --schema=./prisma/schema.prisma

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]