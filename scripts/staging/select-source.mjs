import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const repository = 'lilant5431/homebase'
function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim()
}
const [kind, value, expected] = process.argv.slice(2)
if (run('git', ['branch', '--show-current']) !== 'staging/mobile')
  throw new Error('Use the staging/mobile branch; do not run this on main or a PR branch.')
if (run('git', ['status', '--porcelain'])) throw new Error('Working tree must be clean.')
let sourceSha,
  sourcePr = null,
  sourceBranch = null
if (kind === 'pr') {
  if (!/^[1-9]\d*$/.test(value) || !/^[a-f0-9]{40}$/.test(expected ?? ''))
    throw new Error('Usage: node scripts/staging/select-source.mjs pr NUMBER VERIFIED_FULL_HEAD_SHA')
  const pr = JSON.parse(
    run('gh', [
      'pr',
      'view',
      value,
      '--repo',
      repository,
      '--json',
      'headRefOid,headRefName,headRepository,headRepositoryOwner,baseRefName,state',
    ]),
  )
  if (
    `${pr.headRepositoryOwner?.login}/${pr.headRepository?.name}` !== repository ||
    pr.baseRefName !== 'main' ||
    !['OPEN', 'MERGED'].includes(pr.state) ||
    pr.headRefOid !== expected
  )
    throw new Error(
      'PR repository/base/state/head differs from the verified selection. Inspect before retrying.',
    )
  run('git', ['fetch', 'origin', `refs/pull/${value}/head`])
  if (run('git', ['rev-parse', 'FETCH_HEAD']) !== expected)
    throw new Error('PR advanced during verification.')
  sourceSha = expected
  sourcePr = Number(value)
  sourceBranch = pr.headRefName
} else if (kind === 'commit') {
  if (!/^[a-f0-9]{40}$/.test(value ?? '') || expected !== undefined)
    throw new Error('Usage: node scripts/staging/select-source.mjs commit FULL_APPROVED_SHA')
  run('git', ['fetch', 'origin', value])
  sourceSha = value
} else throw new Error('Select an explicitly reviewed PR head or full approved commit SHA.')
if (run('git', ['cat-file', '-t', sourceSha]) !== 'commit') throw new Error('Source is not a commit.')
writeFileSync(
  'staging/source.json',
  JSON.stringify(
    { version: 1, repository, sourceSha, sourcePr, sourceBranch, selectedAtUtc: new Date().toISOString() },
    null,
    2,
  ) + '\n',
)
console.log(`Pinned ${sourceSha}. Review staging/source.json, commit normally, and push staging/mobile.`)
