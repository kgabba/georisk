FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY requirements-ee.txt ./
RUN python3 -m venv /opt/ee-venv \
  && /opt/ee-venv/bin/pip install --no-cache-dir -r requirements-ee.txt

COPY scripts ./scripts
COPY src ./src

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3001
ENV EE_PYTHON=/opt/ee-venv/bin/python3

EXPOSE 3001

CMD ["npm", "run", "start"]
