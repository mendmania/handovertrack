# Exact multi-platform upstream identity; build for the inspected node architecture.
FROM --platform=$BUILDPLATFORM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build
WORKDIR /app
RUN npm install --global pnpm@10.32.1
COPY . .
RUN pnpm install --frozen-lockfile --filter handovertrack --filter @handovertrack/web... --filter @handovertrack/api... --filter @handovertrack/worker... --filter @handovertrack/db...
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_WEB_ORIGIN=https://handovertrack.com
RUN pnpm --filter @handovertrack/api build && pnpm --filter @handovertrack/worker build && pnpm --filter @handovertrack/web build

FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS target-deps
WORKDIR /app
RUN npm install --global pnpm@10.32.1
COPY . .
RUN pnpm install --frozen-lockfile --filter handovertrack --filter @handovertrack/web... --filter @handovertrack/api... --filter @handovertrack/worker... --filter @handovertrack/db...

FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
WORKDIR /app
ARG SOURCE_REVISION
LABEL org.opencontainers.image.source="https://github.com/mendmania/handovertrack" org.opencontainers.image.revision=$SOURCE_REVISION
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# Migration tooling stays in this private trial image; credentials never do.
COPY --from=target-deps --chown=1000:1000 /app /app
COPY --from=build --chown=1000:1000 /app/apps/api/dist /app/apps/api/dist
COPY --from=build --chown=1000:1000 /app/apps/worker/dist /app/apps/worker/dist
COPY --from=build --chown=1000:1000 /app/apps/web/.next /app/apps/web/.next
USER 1000:1000
CMD ["node", "apps/api/dist/main.js"]
