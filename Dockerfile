FROM docker.io/library/node:22.15.0-alpine3.21 AS mermaid-live-editor-dependencies

RUN apk --no-cache add build-base git python3 && \
    rm -rf /var/cache/apk/*

RUN corepack enable pnpm

WORKDIR /app

COPY ./package.json .
COPY ./pnpm-lock.yaml .

RUN pnpm install

FROM mermaid-live-editor-dependencies AS mermaid-live-editor-builder

ARG MERMAID_RENDERER_URL
ARG MERMAID_KROKI_RENDERER_URL
ARG MERMAID_ANALYTICS_URL
ARG MERMAID_DOMAIN
ARG MERMAID_IS_ENABLED_MERMAID_CHART_LINKS
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG ALLOWED_EMAILS

ENV MERMAID_RENDERER_URL=${MERMAID_RENDERER_URL}
ENV MERMAID_KROKI_RENDERER_URL=${MERMAID_KROKI_RENDERER_URL}
ENV MERMAID_ANALYTICS_URL=${MERMAID_ANALYTICS_URL}
ENV MERMAID_DOMAIN=${MERMAID_DOMAIN}
ENV MERMAID_IS_ENABLED_MERMAID_CHART_LINKS=${MERMAID_IS_ENABLED_MERMAID_CHART_LINKS}
ENV GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV ALLOWED_EMAILS=${ALLOWED_EMAILS}

COPY . ./

RUN pnpm build

FROM mermaid-live-editor-builder AS mermaid-dev

ENTRYPOINT ["pnpm", "dev"]

FROM nginx:1.28-alpine3.21 AS mermaid

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=mermaid-live-editor-builder /app/docs /usr/share/nginx/html
