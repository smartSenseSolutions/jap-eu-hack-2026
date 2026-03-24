FROM public.ecr.aws/docker/library/node:20-alpine AS base
WORKDIR /app

# Copy workspace manifests for dependency install
COPY package.json package-lock.json ./
COPY packages ./packages
COPY backend/package.json ./backend/

# Install all deps (dev + prod) for compilation
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=backend --include-workspace-root

# Copy backend source (includes prisma/)
COPY backend ./backend

# Generate Prisma client and compile TypeScript
RUN npm run build --workspace=backend

# Prune devDependencies in-place — production stage copies these node_modules directly
RUN npm prune --omit=dev

# Production stage
FROM public.ecr.aws/docker/library/node:20-alpine AS production
WORKDIR /app

COPY package.json ./
COPY packages ./packages
COPY backend/package.json ./backend/

# Copy pruned node_modules from build stage (no second npm install)
COPY --from=base /app/node_modules ./node_modules

# Copy compiled output and Prisma artifacts
COPY --from=base /app/backend/dist ./backend/dist
COPY --from=base /app/backend/prisma ./backend/prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma

# Entrypoint script: run migrations + seed, then start
COPY backend/docker-entrypoint.sh ./backend/docker-entrypoint.sh
RUN chmod +x ./backend/docker-entrypoint.sh

EXPOSE 8000

CMD ["./backend/docker-entrypoint.sh"]
