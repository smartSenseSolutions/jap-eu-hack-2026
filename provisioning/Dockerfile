FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy only source needed for compilation (excludes vault/, README.md, .env*, etc.)
COPY src ./src
COPY tsconfig.json ./

RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install system deps first — cached independently of code/npm changes
RUN apk add --no-cache git

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
