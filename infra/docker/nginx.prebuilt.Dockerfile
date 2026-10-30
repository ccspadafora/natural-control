# Expects frontend/apps/{campo,web}/dist already built.
FROM nginx:1.27-alpine
COPY infra/nginx/staging.conf /etc/nginx/conf.d/default.conf
COPY frontend/apps/campo/dist /usr/share/nginx/html/campo
COPY frontend/apps/web/dist /usr/share/nginx/html/web
EXPOSE 80
