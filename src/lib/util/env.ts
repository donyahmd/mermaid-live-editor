const rawAllowedEmails = import.meta.env.ALLOWED_EMAILS ?? '';

export const env = {
  analyticsUrl: import.meta.env.MERMAID_ANALYTICS_URL ?? '',
  docsUrl: import.meta.env.MERMAID_DOCS_URL ?? 'https://mermaid.js.org',
  domain: import.meta.env.MERMAID_DOMAIN ?? '',
  isEnabledMermaidChartLinks: import.meta.env.MERMAID_IS_ENABLED_MERMAID_CHART_LINKS === 'true',
  krokiRendererUrl: import.meta.env.MERMAID_KROKI_RENDERER_URL ?? '',
  rendererUrl: import.meta.env.MERMAID_RENDERER_URL ?? '',
  // Google OAuth Configuration
  googleClientId: import.meta.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: import.meta.env.GOOGLE_CLIENT_SECRET ?? '',
  allowedEmails: rawAllowedEmails
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean)
} as const;
