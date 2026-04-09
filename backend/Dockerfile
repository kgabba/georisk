FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3001

EXPOSE 3001

CMD ["npm", "run", "start"]
