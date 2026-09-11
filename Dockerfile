# Debian slim, not alpine: bcrypt ships prebuilt glibc binaries and otherwise
# falls back to compiling from source, which is a common pain point on musl.
ARG NODE_VERSION=24-bookworm-slim

# ---- deps: full dependency install, reused as the base for the build stage ----
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile TypeScript with nest build ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- runtime: production deps only + compiled dist ----
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Legacy local upload storage — kept only so pre-Cloudinary /uploads/* URLs
# frozen onto historical orders keep resolving. Mount a volume over this in
# compose so uploads survive container recreation.
RUN mkdir -p uploads \
    && groupadd --system app && useradd --system --gid app --home /app app \
    && chown -R app:app /app

USER app
EXPOSE 4000
CMD ["node", "dist/main"]
