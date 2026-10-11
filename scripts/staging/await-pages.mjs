import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'

const [site] = process.argv.slice(2)
const repository = 'lilant5431/homebase'
const url = 'https://lilant5431.github.io/homebase/'
const artifactSha = execFileSync('git', ['-C', site, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
function api(path, post = false) {
  return JSON.parse(
    execFileSync('gh', ['api', ...(post ? ['--method', 'POST'] : []), `repos/${repository}/${path}`], {
      encoding: 'utf8',
    }),
  )
}
const settings = api('pages')
if (
  settings.build_type !== 'legacy' ||
  settings.source?.branch !== 'device-test-pages' ||
  settings.source?.path !== '/' ||
  settings.html_url !== url
)
  throw new Error('Existing preview settings changed; stop and inspect')
if (api('git/ref/heads/device-test-pages').object.sha !== artifactSha)
  throw new Error('Publisher advanced; refuse to deploy another release')
// GITHUB_TOKEN pushes do not implicitly build Pages. Request the existing branch build explicitly.
const request = api('pages/builds', true)
console.log(`Requested Pages build: ${request.url ?? request.status}`)
for (let attempt = 0; attempt < 48; attempt++) {
  const build = api('pages/builds/latest')
  if (build.commit === artifactSha && build.status === 'errored')
    throw new Error(`Pages build failed: ${build.error?.message}`)
  if (build.commit === artifactSha && build.status === 'built') {
    const response = await fetch(
      `${url}staging-version.json?release=${process.env.GITHUB_SHA}&attempt=${attempt}`,
      { cache: 'no-store' },
    )
    const metadata = response.ok ? await response.json() : null
    const deployments = api(`deployments?sha=${artifactSha}&environment=github-pages`)
    const deployment = deployments.find((d) => d.sha === artifactSha)
    const success =
      deployment && api(`deployments/${deployment.id}/statuses`).some((s) => s.state === 'success')
    if (
      metadata?.sourceSha === process.env.SOURCE_SHA &&
      metadata.stagingReleaseSha === process.env.GITHUB_SHA &&
      success
    ) {
      const record = `## Mobile staging deployed\nSource: ${process.env.SOURCE_SHA}\n\nRelease controls: ${process.env.GITHUB_SHA}\n\nArtifact commit: ${artifactSha}\n\nDeployment ID: ${deployment.id}\n\nPages build: ${build.url}\n\nStatus: success\n\nTimestamp: ${new Date().toISOString()}\n\nBuild: passed\n\nURL: ${url}\n\nDeployment record: ${deployment.url}\n`
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, record)
      console.log(record)
      process.exit(0)
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 10000))
}
throw new Error('Exact artifact deployment and served source were not confirmed before timeout')
