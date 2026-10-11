# Homebase mobile staging

Reusable HTTPS preview: **https://lilant5431.github.io/homebase/**.
Version and local-data utility: **https://lilant5431.github.io/homebase/staging-version.html**.
Machine-readable provenance: **https://lilant5431.github.io/homebase/staging-version.json**.

This is staging, not production. Use demonstration records only. A deployment is verified only after its Actions run succeeds and the served version JSON matches the selected SHA; an old successful run does not prove a new deployment.

## Provider, access and cost

GitHub Pages was already configured for this repository's temporary PR #11 device preview (`device-test-pages`, commit `d3a18ce8ac284ba3c977afbd79c924ac5261f8a4`, explicitly titled temporary device testing). It is reused rather than adding a Cloudflare/Vercel account or GitHub App authorization. No production hosting integration, custom domain or main deployment was found. If a new provider becomes necessary, Cloudflare Pages is the preferred next evaluation; switching providers is not part of this setup.

The site is **public, not password-protected**. A hard-to-guess URL is not access control. Free GitHub Pages on this personal public repository does not offer private-site authentication; do not upgrade or start an Enterprise trial for this preview. iPhone access needs only Safari and the HTTPS link, not a GitHub login or a running computer.

No ongoing charge is expected for Pages and standard Linux Actions runners in this public repository. Current Pages limits include a 1 GB published site, soft 100 GB/month bandwidth limit and deployment timeouts and a soft 10 builds/hour limit for branch publishing. Standard public-repository Actions usage is free; larger runners, private-repository use or other changed services need a new cost review. No paid plan, trial, larger runner, domain or billable service is enabled. GitHub may rate-limit or restrict excessive use. Artifact retention is one day; the published site remains available independently of the build artifact. Workflow logs/records follow GitHub retention policy.

Official references checked during setup:

- [Pages availability and limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
- [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
- [Pages branch publishing](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [explicit Pages build requests](https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build).
- [Private Pages restrictions](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site).
- [Pages settings API](https://docs.github.com/en/rest/pages/pages#update-information-about-a-github-pages-site).
- [Pages host security IP logging](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection). No application analytics or external record synchronization is added.

## Isolation and deployment controls

**Release-control branch: `staging/mobile`.** Do not merge it into main or PR #17. It starts at the selected PR source and adds deployment-only files; production source, package scripts, dependencies and Vite configuration are unchanged. Initial pinned source: PR #17, `ae323d35ce4837414f0fa7bc3163b3ff70ce0a2c`.

`staging/source.json` is the authoritative selection. The workflow checks out that **full SHA** in a separate directory, not the latest PR branch. Later releases append manifest commits to staging/mobile instead of replacing branch history with unrelated source commits. No force-push, cherry-pick, main merge or automatic selection of newer PR heads.

`.github/workflows/mobile-staging.yml` runs only on staging/mobile pushes changing the manifest, deployment scripts or its own workflow. All jobs also check the exact staging ref. Ordinary main/PR pushes and documentation-only staging commits do not redeploy. Deployments serialize without cancelling an in-flight release. Only the publish job gets contents:write and pages:write; application builds have read-only repository access and no deployment secrets. Publisher scripts are release controls, not selected application code.

The existing legacy publisher and github-pages environment policy remain unchanged: device-test-pages at /. This connector returned HTTP 403 when asked to change Pages settings/environment policies, so no such change was made. Instead, automation appends a normal, guarded build-artifact commit to device-test-pages, preserving history. Because automatic GITHUB_TOKEN pushes do not implicitly trigger Pages builds, it explicitly requests a build through the supported Pages API, waits for the matching deployment, and checks served provenance. The existing GitHub-managed Pages job still deploys from its already permitted device-test-pages branch. Never push unrelated files or source code to that artifact branch. No branch protection is weakened.

This URL's origin is `https://lilant5431.github.io`. Other project sites under that account share the same origin even at different paths. **Never host Homebase production/personal records on this origin**; a future production site must use a different origin. Localhost, LAN HTTP and earlier Netlify previews are separate origins. No live records are imported. Existing PR #11 test records on this origin may remain until explicitly cleared.

## One-time setup

No external hosting account or chat token is used. Existing GitHub repository access and the automatic Actions GITHUB_TOKEN publish the release. The branch and its pinned release are pushed normally. Pages remains `build_type: legacy`, HTTPS enforced, with `device-test-pages` as its only publisher/environment branch. Stable built-in actions checked at setup: checkout/setup-node v7, upload-artifact v7 and download-artifact v8. Node is 24.19.0, matching repository CI.

The exact application checkout runs:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build -- --base=/homebase/
npm run format:check
```

`--base=/homebase/` is the staging-only static asset prefix required by the existing project-site URL. Output is `dist/`. No development server, custom application config, SPA redirect script or 404 shim is deployed. Homebase uses local view state, not URL routing; all six destinations reload at the same index URL. Vite's appearance bootstrap and locally bundled Newsreader/Geist remain part of the actual selected build.

After build verification, packaging adds only `staging-version.json` and `staging-version.html` alongside the build. JSON records selected PR/SHA, release-control SHA, timestamp, successful build, run URL, and SHA-256/size for original build files. It does not claim deployment success before publication. Deployment ID/status/timestamp and the separate artifact-branch commit appear in the publish job summary and GitHub environment records. The JSON run link joins the artifact to that final deployment record. A final read-only browser job checks the live HTTPS site in Chromium and desktop WebKit at 390×844 and 844×390; the workflow is successful only when those checks pass. A failed application build never updates the publisher. A publish/deploy failure may leave either the prior site or a newly published artifact online; the run fails unless the exact source and deployment are verified. Inspect provenance before testing.

## Update a reviewed PR or commit

Reusable Codex instruction:

> Update the Homebase mobile staging preview to PR #N at its verified head. Follow docs/deployment/mobile-staging.md on staging/mobile; leave main and all PR branches untouched.

Codex should fetch origin, verify the requested PR's current SHA/state/repository/base and successful checks, inspect any difference from a supplied reviewed SHA, then use a clean staging/mobile worktree. Do not use unreviewed code or a moved branch reference. If the existing worktree is dirty/diverged, stop instead of overwriting it.

```sh
git fetch origin
git switch staging/mobile
git pull --ff-only origin staging/mobile
gh pr view N --repo lilant5431/homebase --json headRefOid,headRefName,state,statusCheckRollup
node scripts/staging/select-source.mjs pr N FULL_VERIFIED_HEAD_SHA
git diff -- staging/source.json
git add staging/source.json
git commit -m "staging: select PR #N at VERIFIED_SHA"
git push origin staging/mobile
```

The selector verifies the same-repository PR and main base, rejects a different head, fetches the PR ref again to detect a verification race, and refuses dirty/non-staging worktrees. Explicit approved commits use `node scripts/staging/select-source.mjs commit FULL_APPROVED_SHA`. The script selects only; a normal reviewed commit/push triggers the gated build. It never writes main or changes Git history. Intentional refresh of the same SHA updates selectedAtUtc and creates an auditable release.

Then inspect the **matching release-head** run, not a previous run:

```sh
gh run list --repo lilant5431/homebase --branch staging/mobile --workflow mobile-staging.yml
gh run watch RUN_ID --repo lilant5431/homebase --exit-status
```

This branch-only workflow is push-triggered; it does not require workflow_dispatch registration on main. Failed runs can be rerun from Actions or with `gh run rerun RUN_ID --repo lilant5431/homebase`. Do not add deployment workflow code to main just to expose a manual button.

## Verify the served version and application

Open the version page or fetch `staging-version.json` with a cache-busting query. Confirm sourceSha equals the requested source, buildResult is passed, and workflowRun points to the successful release. GitHub's environment deployment SHA denotes the built artifact commit on device-test-pages; stagingReleaseSha denotes the release-control commit, and sourceSha denotes the actual application. All three are recorded and intentionally differ.

Verify HTTPS 200 at `/homebase/`, no redirect to production, HTML/JS/CSS, both WOFF2 fonts, and asset hashes against JSON. Exercise Overview, Weekly Planner, Assignments, Assessments, Commitments and Classes; drawer scrolling/open/close; all appearance choices; demo capture and reload persistence. Use 390×844 and 844×390 automation when available. Confirm requests remain static hosting requests, with no external academic-data APIs. Close contexts without exporting local records. The hosted workflow performs these checks automatically; no device browser state is used.

Reproducible hosted smoke check from an installed staging worktree (Playwright Chromium/WebKit installed):

```sh
node scripts/staging/verify-preview.mjs https://lilant5431.github.io/homebase/ FULL_DEPLOYED_SOURCE_SHA
```

It verifies remote artifact hashes and fonts, the two mobile reference sizes, all destinations/appearance choices, demo CRUD/reload and explicit local clearing in fresh disposable browser contexts. HTTPS proxy settings, when present, are inherited for cloud execution; TLS validation remains enabled. No actual user browser records are touched. Optional third argument `chromium` or `webkit` selects one engine for diagnosis; omitting it runs both. In this managed cloud environment, desktop WebKit can use the existing CA bundle through `SSL_CERT_FILE`/`G_TLS_CA_FILE`. Chromium cloud verification was blocked by proxy trust; adding persistent browser trust was rejected by automatic approval review and was not performed. Hosted Actions tests use ordinary public HTTPS trust and check both browsers instead. Do not disable TLS validation to obtain a passing result.

A deployment can take time to propagate through the CDN. Check a cache-busted metadata URL and wait for the exact expected SHA; do not assume URL reachability means the latest release is live. On iPhone, reload after confirming version. No service worker/offline cache is introduced.

Desktop Chromium/WebKit measurements do not certify physical iPhone Safari. The maintainer must test Safari touch, native controls, scrolling/rotation, appearance and font responsiveness. DT-01 remains unresolved for 2.6E; HTTPS does not reproduce the old insecure LAN randomUUID environment.

## Clear demonstration data safely

Close other Homebase tabs on this origin. Open staging-version.html and press **Clear Homebase staging data**, explicitly confirm the origin, then reopen Homebase. Only these local keys are removed: homebase.academic.v1, homebase.schedule.v1 and homebase.appearance.v1. No localStorage.clear(), remote deletion or production-origin operation.

Alternatively use iPhone Settings → Apps → Safari → Advanced → Website Data and remove lilant5431.github.io (older iOS: Settings → Safari). That removes all website data for this shared host, including other project sites; inspect before choosing it. Do not clear unrelated domains. A private browsing tab can isolate a temporary test but is not a persistence-acceptance substitute.

## Diagnose, pause, roll back or remove

- Failed build: open the matching Mobile staging run and fix the selected source in its own PR or select a previously approved SHA. Never bypass test/lint exits. Failed source checkout usually means an invalid/unavailable commit.
- Deployment rejected: inspect legacy Pages publishing mode, the device-test-pages environment policy, and publisher job contents:write/pages:write. Check the explicit Pages build request step; do not assume a GITHUB_TOKEN push automatically deploys. Build jobs deliberately lack those permissions. No API tokens/passwords should be pasted into chat.
- Wrong version: compare source manifest, run release SHA and cache-busted served JSON. A green build without a successful deploy is not a release. Verify asset hashes before claiming a version match.
- Pause updates: Actions → Mobile staging → Disable workflow, or `gh workflow disable mobile-staging.yml --repo lilant5431/homebase`. The current preview remains online. Re-enable there, then rerun/push an explicit release when authorized.
- Roll back safely: select a prior approved source SHA and append a new manifest commit. Never reset/force-push the staging branch.
- Unpublish: after explicit maintainer authorization, Settings → Pages → Unpublish site. This removes availability of this staging URL; disable its workflow too. Do not delete repository history or other deployments.
- Remove the automation/branch only with explicit authorization after disabling/unpublishing. The historical device-test-pages commits are retained. Do not silently restore outdated preview code or force-push either staging branch.

No paid subscription or manual external-account setup is required for this reused provider. Record final deployment evidence with the delivery report; do not claim physical acceptance based on automation.
