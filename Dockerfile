FROM node:20-slim

# better-sqlite3 compiles a native module
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
# Store the database on a mountable volume for persistence
ENV DB_PATH=/data/data.sqlite
RUN mkdir -p /data
VOLUME /data

EXPOSE 3000
CMD ["node", "server.js"]
