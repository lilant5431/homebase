import { build, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/** One source contract, bundled inline before styles; no async module/React effect first-paint race. */
function appearanceBootstrap(): Plugin {
  let script: Promise<string> | undefined
  return {
    name: 'homebase-appearance-bootstrap',
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        script ??= build({
          configFile: false,
          logLevel: 'silent',
          build: {
            write: false,
            lib: { entry: 'src/appearanceBootstrap.ts', name: 'HomebaseAppearance', formats: ['iife'] },
          },
        }).then((result) => {
          const bundles = Array.isArray(result) ? result : [result]
          for (const bundle of bundles)
            if ('output' in bundle) {
              for (const output of bundle.output) if (output.type === 'chunk') return output.code
            }
          throw new Error('Appearance bootstrap bundle missing')
        })
        if (!html.includes('<!-- appearance-bootstrap -->'))
          throw new Error('Appearance bootstrap marker missing')
        return html.replace(
          '<!-- appearance-bootstrap -->',
          `<script data-appearance-bootstrap>${await script}</script>`,
        )
      },
    },
    handleHotUpdate() {
      script = undefined
    },
  }
}
export default defineConfig({
  plugins: [appearanceBootstrap(), react()],
  test: { environment: 'jsdom', css: { include: [/tokens\.css/] } },
})
