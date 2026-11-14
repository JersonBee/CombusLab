import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig(({ command, mode }) => {
  const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env
  const uploadMaps = command === 'build' && mode !== 'test' &&
    Boolean(SENTRY_AUTH_TOKEN && SENTRY_ORG && SENTRY_PROJECT)
  return {
    plugins: [react(), tailwindcss(), ...(uploadMaps ? [sentryVitePlugin({
      authToken: SENTRY_AUTH_TOKEN,
      org: SENTRY_ORG,
      project: SENTRY_PROJECT,
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      telemetry: false,
    })] : [])],
    build: { sourcemap: uploadMaps ? 'hidden' : false },
    server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  }
})
