import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { createHash } from 'node:crypto'

const [directory, selectionPath] = process.argv.slice(2)
const selection = JSON.parse(readFileSync(selectionPath, 'utf8'))
if (
  selection.version !== 1 ||
  selection.repository !== 'lilant5431/homebase' ||
  !/^[a-f0-9]{40}$/.test(selection.sourceSha)
)
  throw new Error('Invalid staging source manifest')
if (process.env.SOURCE_SHA !== selection.sourceSha) throw new Error('Checkout and selection differ')
const root = resolve(directory)
const files = []
function inspect(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = resolve(folder, entry.name)
    if (entry.isSymbolicLink()) throw new Error('No links permitted in the Pages artifact')
    if (entry.isDirectory()) inspect(path)
    else if (entry.isFile()) {
      const bytes = readFileSync(path)
      files.push({
        path: relative(root, path).replaceAll('\\', '/'),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      })
    }
  }
}
inspect(root)
if (
  !files.some((file) => file.path === 'index.html') ||
  !files.some((file) => /^assets\/Newsreader-.*\.woff2$/.test(file.path)) ||
  !files.some((file) => /^assets\/Geist-.*\.woff2$/.test(file.path))
)
  throw new Error('Production HTML or required local fonts missing')
const metadata = {
  ...selection,
  stagingReleaseSha: process.env.GITHUB_SHA,
  builtAtUtc: new Date().toISOString(),
  buildResult: 'passed',
  previewUrl: 'https://lilant5431.github.io/homebase/',
  workflowRun: `https://github.com/lilant5431/homebase/actions/runs/${process.env.GITHUB_RUN_ID}`,
  files: files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
}
writeFileSync(resolve(root, 'staging-version.json'), JSON.stringify(metadata, null, 2) + '\n')
writeFileSync(
  resolve(root, 'staging-version.html'),
  `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Homebase mobile staging version</title><style>body{font:16px/1.5 system-ui;max-width:42rem;margin:2rem auto;padding:1rem;overflow-wrap:anywhere}button,a{min-height:44px;display:inline-flex;align-items:center}button{font:inherit;padding:.75rem}pre{white-space:pre-wrap}</style>
<h1>Homebase mobile staging</h1><p>Public testing preview. Use demonstration records only.</p>
<p>Source: <a href="https://github.com/lilant5431/homebase/commit/${selection.sourceSha}">${selection.sourceSha}</a></p>
<p>Build: passed · ${metadata.builtAtUtc}</p><p><a href="${metadata.workflowRun}">Deployment status and identifier</a></p>
<p><a href="./">Open Homebase</a> · <a href="staging-version.json">Complete build record and asset hashes</a></p>
<p>Clearing removes Homebase test records, scheduling settings and appearance on this browser origin. Other project paths on lilant5431.github.io share this origin. Nothing is cleared remotely.</p>
<button id="clear" type="button">Clear Homebase staging data</button><p id="result" role="status"></p>
<script>document.getElementById('clear').onclick=()=>{if(!confirm('Clear Homebase test data on '+location.origin+'?'))return;try{for(const key of ['homebase.academic.v1','homebase.schedule.v1','homebase.appearance.v1'])localStorage.removeItem(key);document.getElementById('result').textContent='Test data cleared. Close other Homebase staging tabs, then reopen the app.'}catch{document.getElementById('result').textContent='This browser blocked storage access. Use Safari website-data settings instead.'}}</script></html>`,
)
