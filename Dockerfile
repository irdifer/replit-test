# 第一阶段：build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install                  # 把 devDependencies＋prodDependencies 都装好
COPY . .                         
RUN npm run build                # 生成 dist/

# 第二阶段：runtime
FROM node:18-alpine
WORKDIR /app

# 只拷 runtime 需要的文件
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/migrations ./migrations

RUN npm install --omit=dev       # 只装 production 依赖
RUN apk add --no-cache postgresql-client

ENV DATABASE_URL="postgres://postgres:123456@my-postgres:5432/testdb"
EXPOSE 5000
CMD ["sh", "-c", "npm run db:push && npm start"]
