FROM node:22-alpine AS builder

ARG VITE_WS_URL=
ARG VITE_API_URL=
ARG VITE_DEFAULT_MODEL=glm-5

ENV VITE_WS_URL=${VITE_WS_URL} \
    VITE_API_URL=${VITE_API_URL} \
    VITE_DEFAULT_MODEL=${VITE_DEFAULT_MODEL}

WORKDIR /app/web

COPY web/package*.json ./
COPY web/.npmrc ./
RUN npm ci

COPY web/ ./
RUN npm run build

FROM nginx:1.28-alpine AS runner

COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
