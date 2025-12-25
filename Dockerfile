# Simple Dockerfile to run the Next.js app and socket server
# This image expects server.js to bootstrap both Next and socket.io on ports 3000 and 3001

FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV NODE_ENV=production

EXPOSE 3000 3001

CMD ["node", "server.js"]
