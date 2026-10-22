# syntax=docker/dockerfile:1
# Build template only. Not published to GHCR and not referenced by deploy/backend/compose.yaml.
# Do not publish 50052 or 5052 on the host. Join memora-network and use postgres:5432.
# schema.prisma has 27 models. This image still does not generate or copy Prisma Client.
# TODO(ci/cd): generate the client and copy apps/commerce-service/generated, as docker/iam-service.Dockerfile does.
# Runtime uses the pg pool for the database probe. Business repositories are not in this image.

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
RUN npx nest build commerce-service

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
USER memora
EXPOSE 50052 5052
CMD ["node", "dist/apps/commerce-service/main.js"]
