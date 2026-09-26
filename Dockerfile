FROM node:24-alpine AS deps

WORKDIR /app

ARG PNPM_VERSION=11.24.0
RUN npm install -g pnpm@${PNPM_VERSION}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN PNPM_CONFIG_MINIMUM_RELEASE_AGE=0 \
    pnpm install --frozen-lockfile


FROM node:24-alpine AS builder

WORKDIR /app

ARG PNPM_VERSION=11.24.0
RUN npm install -g pnpm@${PNPM_VERSION}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build


FROM node:24-alpine AS prod-deps

WORKDIR /app

ARG PNPM_VERSION=11.24.0
RUN npm install -g pnpm@${PNPM_VERSION}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN PNPM_CONFIG_MINIMUM_RELEASE_AGE=0 \
    pnpm install --prod --frozen-lockfile


FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules

COPY package.json ./
COPY ecosystem.config.cjs ./

EXPOSE 3000

CMD ["./node_modules/.bin/pm2-runtime", "ecosystem.config.cjs"]
