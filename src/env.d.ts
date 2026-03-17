/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MERMAID_RENDERER_URL?: string;
  readonly MERMAID_KROKI_RENDERER_URL?: string;
  readonly MERMAID_ANALYTICS_URL?: string;
  readonly MERMAID_DOCS_URL?: string;
  readonly MERMAID_DOMAIN?: string;
  readonly MERMAID_IS_ENABLED_MERMAID_CHART_LINKS?: string;
  // Google OAuth
  readonly GOOGLE_CLIENT_ID?: string;
  readonly GOOGLE_CLIENT_SECRET?: string;
  readonly ALLOWED_EMAILS?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
