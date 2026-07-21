# --------------------------------------------------
# Stage 1: Install all dependencies
# --------------------------------------------------
FROM node:22-alpine AS dependencies

WORKDIR /app

# Prisma requires OpenSSL
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./

# Copy Prisma schema before npm ci because postinstall
# runs `prisma generate`
COPY prisma ./prisma

RUN npm ci


# --------------------------------------------------
# Stage 2: Build the NestJS application
# --------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client explicitly
RUN npx prisma generate

RUN npm run build


# --------------------------------------------------
# Stage 3: Install production dependencies
# --------------------------------------------------
FROM node:22-alpine AS production-dependencies

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev && npm cache clean --force


# --------------------------------------------------
# Stage 4: Production runtime
# --------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apk add --no-cache openssl

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

# Create writable runtime directories while still running as root
RUN mkdir -p /app/uploads/photos \
  && chown -R node:node /app/uploads

USER node

EXPOSE 4000

CMD ["node", "dist/main.js"]