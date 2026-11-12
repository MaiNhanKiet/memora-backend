# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:20.20.2-bookworm-slim
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY nest-cli.json tsconfig.json tsconfig.base.json tsconfig.build.json ./
COPY apps ./apps
COPY libs ./libs
COPY proto ./proto
# prisma.config.ts requires OPERATIONS_DATABASE_URL; generate does not connect.
ENV OPERATIONS_DATABASE_URL=postgresql://prisma_generate:unused@127.0.0.1:5432/prisma_generate
RUN npm run prisma:operations:generate \
  && npx nest build operations-service

FROM ${NODE_IMAGE} AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get upgrade -y --no-install-recommends \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 memora \
  && useradd --system --uid 1001 --gid memora --home-dir /app --no-create-home memora
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/proto ./proto
COPY --from=build /app/apps/operations-service/generated ./apps/operations-service/generated
USER memora
EXPOSE 50053 5053
CMD ["node", "dist/apps/operations-service/main.js"]
