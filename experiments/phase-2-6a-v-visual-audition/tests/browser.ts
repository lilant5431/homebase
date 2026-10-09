import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium, webkit, type Page } from 'playwright'

// Run against the independent Vite server or built preview. No production imports.
const baseURL = process.env.AUDITION_URL || 'http://127.0.0.1:5175'
const sizes = [
  [1440, 900],
  [820, 1180],
  [390, 844],
  [844, 390],
  [667, 375],
  [320, 640],
]
const effects = ['lattice', 'horizon', 'glass', 'beam', 'shimmer', 'baseline']
type Sample = { frames: number; medianMs: number; p95Ms: number; activeAnimations: number }
const report: {
  baseURL: string
  engines: string[]
  geometryCases: number
  screenshots: string[]
  performance: (Sample & { effect: string })[]
} = { baseURL, engines: [], geometryCases: 0, screenshots: [], performance: [] }
await fs.mkdir('test-results', { recursive: true })
await fs.mkdir('screenshots', { recursive: true })

async function open(page: Page) {
  await page.addInitScript(() => {
    for (const key of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, key, {
        configurable: true,
        get() {
          throw new Error(`Forbidden ${key} access`)
        },
      })
    }
  })
  await page.goto(baseURL)
  await page.getByRole('heading', { name: 'Find your atmosphere.' }).waitFor()
  await page.evaluate(() => document.fonts.ready)
}
async function geometry(page: Page, label: string) {
  const result = await page.evaluate(() => {
    const visible = (element: Element) =>
      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'
    const escaped = [
      ...document.querySelectorAll<HTMLElement>(
        'button,select,input,summary,.content-card,.navigation,.metrics',
      ),
    ]
      .filter(visible)
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        return (
          rect.left < -1 ||
          rect.right > innerWidth + 1 ||
          (element.scrollWidth > element.clientWidth + 2 &&
            element.matches('button,select,.content-card,.metrics'))
        )
      })
      .map((element) => element.className || element.id || element.tagName)
    const targets = [
      ...document.querySelectorAll<HTMLElement>('button,select,summary,input[type=range],.check-control,a'),
    ]
      .filter(visible)
      .map((element) => ({
        name: (element.textContent || '').trim() || element.getAttribute('aria-label') || element.id,
        rect: element.getBoundingClientRect(),
      }))
      .filter(({ rect }) => rect.width < 43.9 || rect.height < 43.9)
      .map(({ name, rect }) => ({ name, width: rect.width, height: rect.height }))
    return { pageWidth: document.documentElement.scrollWidth, viewport: innerWidth, escaped, targets }
  })
  assert.equal(result.pageWidth, result.viewport, `${label}: document overflow`)
  assert.deepEqual(result.escaped, [], `${label}: clipped content/controls`)
  assert.deepEqual(result.targets, [], `${label}: target below 44×44`)
  report.geometryCases++
}
async function expandedControls(page: Page) {
  const details = page.locator('.lab-controls > details:not(.technical-references)')
  if (!((await details.getAttribute('open')) !== null)) await details.locator('summary').click()
}
async function allAnimations(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation instanceof CSSAnimation)
      .map((animation) => ({ state: animation.playState, duration: animation.effect?.getTiming().duration })),
  )
}
async function screenShot(page: Page, name: string) {
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.locator('#preview').scrollIntoViewIfNeeded()
  const file = `screenshots/${name}.png`
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
  report.screenshots.push(file)
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
}
async function reference(page: Page, id: string) {
  const details = page.locator('.technical-references')
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click()
  await page.locator('#effect').selectOption(id)
}
async function phase(page: Page, fraction: number) {
  return page.evaluate((fraction) => {
    const field = document
      .getAnimations()
      .find((animation) => animation instanceof CSSAnimation && animation.animationName === 'ambient-field')!
    field.currentTime = Number(field.effect!.getTiming().duration) * fraction
    const style = (selector: string, pseudo?: string) =>
      getComputedStyle(document.querySelector(selector)!, pseudo).backgroundImage
    return {
      x: getComputedStyle(document.querySelector('.preview-stage')!).getPropertyValue('--scene-light-x'),
      nav: style('.magic-glass .ambient-gradient'),
      menu: style('.menu-glass .ambient-gradient'),
      action: style('.action-glass .ambient-gradient'),
      active: style('.nav-item.active', '::before'),
      control: style('.primary-action', '::before'),
      sky: style('.sky-light'),
    }
  }, fraction)
}
for (const [engineName, engine] of [
  ['Chromium', chromium],
  ['WebKit', webkit],
] as const) {
  const browser = await engine.launch({
    headless: true,
    ...(engineName === 'Chromium' ? { args: ['--no-sandbox'] } : {}),
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const errors: string[] = []
  const external: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (!request.url().startsWith(new URL(baseURL).origin) && !request.url().startsWith('data:'))
      external.push(request.url())
  })
  await open(page)
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    for (const theme of ['Daylight', 'Night Flight']) {
      await page.getByRole('button', { name: theme, exact: true }).click()
      for (const id of ['integrated', ...effects]) {
        await reference(page, id)
        await page.getByRole('button', { name: 'Overview', exact: false }).click()
        await geometry(page, `${engineName} ${width}×${height} ${theme} ${id} overview`)
        await page.getByRole('button', { name: /Weekly Planner/ }).click()
        await geometry(page, `${engineName} ${width}×${height} ${theme} ${id} week`)
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await reference(page, 'integrated')
  await page.getByText('Preview notes', { exact: true }).click()
  await geometry(page, `${engineName}: opened in-flow preview menu`)
  await expandedControls(page)
  await page.getByRole('button', { name: 'Overview', exact: false }).click()
  await page.getByRole('button', { name: 'Night Flight', exact: true }).click()
  await page.locator('#preview').scrollIntoViewIfNeeded()
  await page.locator('.audition[data-inactive="false"]').waitFor()
  const before = await phase(page, 0.05)
  const after = await phase(page, 0.65)
  for (const role of ['x', 'nav', 'menu', 'action', 'active', 'control', 'sky'] as const)
    assert.notEqual(before[role], after[role], `${engineName}: shared lighting changes ${role}`)
  await page.getByRole('button', { name: 'Cinematic', exact: true }).click()
  await page.getByRole('button', { name: 'Daylight', exact: true }).click()
  assert.equal(await page.locator('#intensity').inputValue(), '92', 'theme preserves preset')
  assert.equal(await page.locator('#speed').inputValue(), '1.2', 'theme preserves speed')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  assert.ok((await allAnimations(page)).every((animation) => animation.state === 'paused'))
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.locator('#preview').scrollIntoViewIfNeeded()
  await page.locator('.audition[data-inactive="false"]').waitFor()
  assert.ok((await allAnimations(page)).some((animation) => animation.state === 'running'))
  await page.getByLabel('Reduce motion', { exact: true }).check()
  assert.equal((await allAnimations(page)).length, 0)
  await page.getByRole('button', { name: 'Play light cue' }).click()
  assert.equal(await page.locator('.audition').getAttribute('data-cue-active'), 'false')
  assert.ok(await page.getByText('Light cue confirmed.', { exact: false }).count())
  await page.getByLabel('Reduce motion', { exact: true }).uncheck()
  await page.getByLabel('Reduce visual effects', { exact: true }).check()
  assert.equal(
    await page.locator('.navigation').evaluate((element) => getComputedStyle(element).backdropFilter),
    'none',
  )
  assert.equal(
    await page.locator('.navigation').evaluate((element) => getComputedStyle(element).backgroundImage),
    'none',
  )
  await page.getByRole('button', { name: 'Reset recommended values' }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('.audition[data-reduced-motion="true"]').waitFor()
  assert.equal((await allAnimations(page)).length, 0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('.audition[data-reduced-motion="false"]').waitFor()
  await page.locator('.navigation').hover({ position: { x: 80, y: 80 } })
  await page.waitForTimeout(50)
  assert.notEqual(
    await page
      .locator('.magic-glass')
      .first()
      .evaluate((element) => element.style.getPropertyValue('--pointer-x')),
    '',
    'shared glass responds in the integrated scene',
  )
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  assert.equal(
    await page
      .locator('.magic-glass')
      .first()
      .evaluate((element) => element.style.getPropertyValue('--pointer-x')),
    '',
  )
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.locator('#preview').scrollIntoViewIfNeeded()
  await page.locator('.audition[data-inactive="false"]').waitFor()
  const cueCount = await page.locator('[data-cue-target]').count()
  assert.equal(cueCount, 5)
  for (let repeat = 0; repeat < 3; repeat++) {
    await page.getByRole('button', { name: 'Play light cue' }).click()
    assert.equal(await page.locator('[data-cue-target]').count(), cueCount)
    const count = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) => !(animation instanceof CSSAnimation) && !(animation instanceof CSSTransition),
          ).length,
    )
    assert.equal(count, 5, 'retrigger cancels previous cue animations')
  }
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  assert.equal(await page.locator('.audition').getAttribute('data-cue-active'), 'false')
  assert.equal(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) => !(animation instanceof CSSAnimation) && !(animation instanceof CSSTransition),
          ).length,
    ),
    0,
  )
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await page.locator('#preview').scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Play light cue' }).click()
  await page.locator('.audition[data-cue-active="false"]').waitFor()
  await page.getByRole('button', { name: 'Inspect The shape of a good argument' }).focus()
  await page.keyboard.press('Enter')
  await page.getByRole('complementary', { name: 'Illustrative record details' }).waitFor()
  await page.getByRole('button', { name: 'Close details' }).focus()
  await page.keyboard.press('Space')
  assert.equal(await page.getByRole('complementary', { name: 'Illustrative record details' }).count(), 0)
  await page.getByRole('button', { name: /Weekly Planner/ }).focus()
  assert.equal(
    await page
      .getByRole('button', { name: /Weekly Planner/ })
      .evaluate((element) => getComputedStyle(element).outlineStyle),
    'solid',
  )
  await page.keyboard.press('Enter')
  await page.getByRole('heading', { name: 'A week with breathing room.' }).waitFor()
  await page.setViewportSize({ width: 667, height: 375 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.locator('.audition[data-inactive="true"]').waitFor()
  assert.ok(
    (await allAnimations(page)).every((animation) => animation.state === 'paused'),
    'offscreen scene pauses',
  )
  await page.locator('#preview').scrollIntoViewIfNeeded()
  await page.locator('.audition[data-inactive="false"]').waitFor()
  await page.getByRole('button', { name: 'Play light cue' }).click()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.locator('.audition[data-inactive="true"]').waitFor()
  assert.equal(await page.locator('.audition').getAttribute('data-cue-active'), 'false')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  if (engineName === 'Chromium') {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByRole('button', { name: 'Overview', exact: false }).click()
    for (const theme of ['Daylight', 'Night Flight']) {
      await page.getByRole('button', { name: theme, exact: true }).click()
      await page.getByRole('button', { name: 'Balanced', exact: true }).click()
      await page.locator('#preview').scrollIntoViewIfNeeded()
      const sample = await page.evaluate(
        () =>
          new Promise<Sample>((resolve) => {
            const deltas: number[] = []
            let last: number | undefined
            const start = performance.now()
            function tick(now: number) {
              if (last !== undefined) deltas.push(now - last)
              last = now
              if (now - start >= 1000) {
                const sorted = [...deltas].sort((a, b) => a - b)
                resolve({
                  frames: deltas.length,
                  medianMs: sorted[Math.floor(sorted.length / 2)],
                  p95Ms: sorted[Math.floor(sorted.length * 0.95)],
                  activeAnimations: document
                    .getAnimations()
                    .filter((animation) => animation.playState === 'running').length,
                })
              } else requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }),
      )
      report.performance.push({ effect: theme, ...sample })
    }
    for (const [width, height, device] of [
      [1440, 900, 'desktop'],
      [390, 844, 'phone'],
    ] as const) {
      await page.setViewportSize({ width, height })
      for (const theme of ['Daylight', 'Night Flight']) {
        await page.getByRole('button', { name: theme, exact: true }).click()
        await page
          .getByRole('button', { name: theme === 'Daylight' ? 'Balanced' : 'Cinematic', exact: true })
          .click()
        for (const details of ['.technical-references', '.lab-controls > details:not(.technical-references)'])
          if ((await page.locator(details).getAttribute('open')) !== null)
            await page.locator(details).locator('summary').click()
        for (const view of ['Overview', 'Weekly Planner']) {
          await page.getByRole('button', { name: view, exact: false }).click()
          await screenShot(
            page,
            `v2-${theme === 'Daylight' ? 'daylight' : 'night'}-${view === 'Overview' ? 'overview' : 'planner'}-${device}`,
          )
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByRole('button', { name: 'Overview', exact: false }).click()
    for (const theme of ['Daylight', 'Night Flight']) {
      await page.getByRole('button', { name: theme, exact: true }).click()
      await page.locator('#preview').scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: 'Play light cue' }).click()
      await page.waitForTimeout(420)
      const file = `screenshots/v2-${theme === 'Daylight' ? 'daylight' : 'night'}-cue-desktop.png`
      await page.screenshot({ path: file, fullPage: true, animations: 'allow' })
      report.screenshots.push(file)
      await page.locator('.audition[data-cue-active="false"]').waitFor()
    }
    await page.emulateMedia({ forcedColors: 'active' })
    await page.locator('.audition[data-reduced-effects="true"]').waitFor()
    assert.equal((await allAnimations(page)).length, 0)
    await page.emulateMedia({ forcedColors: 'none' })
  }
  const fallbackPage = await context.newPage()
  await fallbackPage.addInitScript(() => {
    CSS.supports = () => false
    Object.defineProperty(CSS, 'registerProperty', { value: undefined, configurable: true })
  })
  await open(fallbackPage)
  assert.equal(await fallbackPage.locator('.preview-stage').getAttribute('data-light-motion'), 'false')
  assert.equal(
    (await allAnimations(fallbackPage)).length,
    0,
    'unsupported field stays static, no discrete jumps',
  )
  assert.equal(
    await fallbackPage.locator('.navigation').evaluate((element) => getComputedStyle(element).backdropFilter),
    'none',
  )
  await reference(fallbackPage, 'beam')
  assert.equal(await fallbackPage.locator('.beam-fallback').count(), 1)
  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const touch = await touchContext.newPage()
  touch.on('pageerror', (error) => errors.push(error.message))
  await open(touch)
  for (const theme of ['Daylight', 'Night Flight']) {
    await touch.getByRole('button', { name: theme, exact: true }).tap()
    await touch.locator('#preview').scrollIntoViewIfNeeded()
    await touch.locator('.audition[data-inactive="false"]').waitFor()
    await touch.getByRole('button', { name: 'Play light cue' }).tap()
    assert.equal(await touch.locator('.audition').getAttribute('data-cue-active'), 'true')
    assert.equal(
      await touch
        .locator('.magic-glass')
        .first()
        .evaluate((element) => element.style.getPropertyValue('--pointer-x')),
      '',
      'touch does not require mouse reflection',
    )
    await touch.getByRole('button', { name: /Weekly Planner/ }).tap()
    await touch.getByRole('heading', { name: 'A week with breathing room.' }).waitFor()
  }
  await touchContext.close()
  assert.deepEqual(errors, [], `${engineName}: browser exceptions`)
  assert.deepEqual(external, [], `${engineName}: unexpected runtime external requests`)
  await browser.close()
  report.engines.push(`${engineName}: passed (simulation, not physical iPhone acceptance)`)
}
await fs.writeFile('test-results/browser-report.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
