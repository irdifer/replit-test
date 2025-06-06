# ------------------------------------------------------------
# 第一阶段：打包(包含 devDependencies)
# ------------------------------------------------------------
    FROM node:18-alpine AS builder
    WORKDIR /app
    
    # 1. 先拷 package.json / package-lock.json，安装所有依赖（包含 devDependencies）
    COPY package.json package-lock.json ./
    RUN npm install
    
    # 2. 拷贝所有源代码，执行 build（例如：tsc 或其他打包脚本）
    COPY . .
    RUN npm run build
    
    # ------------------------------------------------------------
    # 第二阶段：运行时(只带 production 依赖 + 已打包产物)
    # ------------------------------------------------------------
    FROM node:18-alpine
    WORKDIR /app
    
    # 3. 从 builder 阶段拷贝 package.json / package-lock.json + dist 产物 + drizzle.config.ts
    COPY --from=builder /app/package.json /app/package-lock.json ./
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
    
    # 4. 安装 production 依赖（会 omit devDependencies）
    RUN npm install --omit=dev
    
    # 5. 如果运行时需要 psql client，可保留；否则可以删掉这行
    RUN apk add --no-cache postgresql-client
    
    # 6. 默认环境变量（production 环境可被 docker-compose 覆写）
    ENV NODE_ENV=production
    ENV DATABASE_URL="postgres://postgres:123456@my-postgres:5432/testdb"
    ENV PUBLIC_DIR="/app/dist/public"
    ENV UPLOAD_DIR="/app/uploads"
    
    # 7. 暴露应用端口（与程序内监听一致）
    EXPOSE 5000
    
    # 8. 启动命令：直接执行编译好的 dist/index.js
    CMD ["sh", "-c", "node dist/index.js"]
    