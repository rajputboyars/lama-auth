# One image for the whole app: the API also serves the built dashboard (one URL).
# Used by render.yaml. Local docker-compose still runs the API and nginx separately.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --include-workspace-root -w server -w client
COPY server server
COPY client client
RUN npm run build -w server && npm run build -w client

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV STATIC_DIR=/app/client/dist
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci -w server --omit=dev --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
WORKDIR /app/server
EXPOSE 4000
USER node
CMD ["node", "dist/index.js"]
