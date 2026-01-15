/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_COGNITO_USER_POOL_ID: string
  readonly VITE_COGNITO_CLIENT_ID: string
  readonly VITE_COGNITO_REGION: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_ENABLE_AI: string
  readonly VITE_ENABLE_COMMUNITY: string
  readonly VITE_ENABLE_NEWS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
