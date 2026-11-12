# syntax=docker/dockerfile:1
# Node + Litestream imajı. Belge: docs/08-isletme/01-self-host.md
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @openmers/api-app --filter @openmers/storefront-app --filter @openmers/admin-app build

FROM node:22-slim
COPY --from=litestream/litestream:0.3 /usr/local/bin/litestream /usr/local/bin/litestream
WORKDIR /app
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/storefront/dist ./storefront
COPY --from=build /repo/apps/admin/build ./admin
COPY --from=build /repo/packages/db/migrations ./migrations
COPY deploy/docker/litestream.yml /etc/litestream.yml
COPY deploy/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /data /data/uploads
ENV NODE_ENV=production OPENMERS_DB=/data/openmers.sqlite OPENMERS_UPLOADS=/data/uploads PORT=3000
VOLUME /data
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
