FROM node:20-alpine AS base
WORKDIR /app

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

USER nodejs
EXPOSE 4000

CMD ["node", "src/server.js"]
