FROM node:20-alpine AS builder
WORKDIR /build

# Install build deps
RUN apk add --no-cache git

# Install project dependencies and build the TypeScript tool
COPY package.json package-lock.json* ./
RUN npm ci || npm i
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /usr/src/app
RUN apk add --no-cache bash
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./package.json
COPY --from=builder /build/test-repos ./test-repos

ENV NODE_ENV=production

ENTRYPOINT ["node", "dist/index.js"]
