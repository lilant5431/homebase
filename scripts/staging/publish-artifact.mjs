import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, cpSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

const [artifactPath, sitePath] = process.argv.slice(2)
const artifact = resolve(artifactPath),
  site = resolve(sitePath)
function git(args) {
  return execFileSync('git', ['-C', site, ...args], { encoding: 'utf8' }).trim()
}
const allowed = (path) =>
  path === '.nojekyll' ||
  path === 'index.html' ||
  path === 'staging-version.json' ||
  path === 'staging-version.html' ||
  /^assets\/[^/]+$/.test(path)
if (git(['branch', '--show-current']) !== 'device-test-pages' || git(['status', '--porcelain']))
  throw new Error('Expected a clean device-test-pages publisher checkout')
const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean)
if (tracked.some((path) => !allowed(path)))
  throw new Error('Publisher contains non-artifact files; do not remove them')
const metadata = JSON.parse(readFileSync(resolve(artifact, 'staging-version.json'), 'utf8'))
if (
  metadata.sourceSha !== process.env.SOURCE_SHA ||
  metadata.stagingReleaseSha !== process.env.GITHUB_SHA ||
  metadata.buildResult !== 'passed'
)
  throw new Error('Artifact does not match this verified release')
for (const file of metadata.files) {
  if (!allowed(file.path) || (!['index.html'].includes(file.path) && !file.path.startsWith('assets/')))
    throw new Error('Invalid built file path')
  const bytes = readFileSync(resolve(artifact, file.path))
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256)
    throw new Error('Artifact hash mismatch')
}
function check(folder, prefix = '') {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = prefix + entry.name
    if (entry.isDirectory() && path === 'assets') check(resolve(folder, entry.name), 'assets/')
    else if (!entry.isFile() || !allowed(path)) throw new Error('Unexpected artifact entry')
  }
}
check(artifact)
// Remove only guarded, tracked preview output. Application/source branches are never checked out here.
if (tracked.length) git(['rm', '--', ...tracked])
for (const entry of readdirSync(artifact))
  cpSync(resolve(artifact, entry), resolve(site, entry), { recursive: true })
writeFileSync(resolve(site, '.nojekyll'), '')
git(['config', 'user.name', 'github-actions[bot]'])
git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'])
git(['add', '--all'])
git(['commit', '-m', `staging: publish ${metadata.sourceSha} from release ${metadata.stagingReleaseSha}`])
git(['push', 'origin', 'HEAD:refs/heads/device-test-pages'])
console.log(`Published artifact commit ${git(['rev-parse', 'HEAD'])}; source ${metadata.sourceSha}`)
