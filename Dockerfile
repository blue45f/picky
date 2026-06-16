# --- Build Stage ---
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@11.4.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @picky/api build

# --- Runner Stage ---
FROM node:22-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@11.4.0
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/src ./packages/shared/src

USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
