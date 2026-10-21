# Build context: repo root (npm workspaces share one lockfile)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci -w server --include-workspace-root
COPY server server
RUN npm run build -w server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci -w server --omit=dev --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/server/dist server/dist
WORKDIR /app/server
EXPOSE 4000
USER node
CMD ["node", "dist/index.js"]
