FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /fe
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
COPY frontend/apps ./apps
COPY frontend/packages ./packages
RUN pnpm install --frozen-lockfile
ARG VITE_DEMO_MODE=false
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
RUN pnpm --filter campo exec vite build \
 && pnpm --filter web exec vite build

FROM nginx:1.27-alpine
COPY infra/nginx/staging.conf /etc/nginx/conf.d/default.conf
COPY --from=build /fe/apps/campo/dist /usr/share/nginx/html/campo
COPY --from=build /fe/apps/web/dist /usr/share/nginx/html/web
EXPOSE 80
