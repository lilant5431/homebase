import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium, webkit, type Page } from 'playwright'
import { materialEvidence } from './material-evidence.ts'

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
const materials = ['solid', 'frosted', 'clearer']
const effects = ['lattice', 'glass', 'beam', 'shimmer', 'landscape-legacy']
type Sample = { frames: number; medianMs: number; p95Ms: number; activeAnimations: number }
const report: {
  baseURL: string
  engines: string[]
  geometryCases: number
  fullPageCases: number
  cueCoverageCases: number
  screenshots: string[]
  performance: (Sample & { effect: string })[]
} = {
  baseURL,
  engines: [],
  geometryCases: 0,
  fullPageCases: 0,
  cueCoverageCases: 0,
  screenshots: [],
  performance: [],
}
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
  const panel = await page
    .locator('.content-card')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element)
      const material = document.querySelector('.audition')!.getAttribute('data-effective-material')!
      return {
        material,
        background: style.backgroundColor,
        filter: style.backdropFilter,
        opacity: style.opacity,
      }
    })
  assert.equal(panel.opacity, '1', `${label}: never fade text subtree`)
  if (panel.material === 'solid') {
    assert.match(panel.background, /^rgb\(/, `${label}: fully opaque`)
    assert.equal(panel.filter, 'none')
  } else {
    assert.match(panel.background, /^rgba\(/, `${label}: real alpha background`)
    assert.equal(
      panel.filter,
      `blur(${panel.material === 'clearer' ? 1 : result.viewport <= 600 ? 3 : 4}px)`,
      `${label}: active bounded blur`,
    )
    if (panel.material === 'clearer')
      assert.match(
        await page
          .locator('.content-card h3')
          .first()
          .evaluate((el) => getComputedStyle(el).backgroundColor),
        /^rgb\(/,
        `${label}: opaque text backing`,
      )
  }
  report.geometryCases++
  if (await page.locator('.landscape-sketch').count()) {
    const scene = await page.locator('.landscape-sketch').boundingBox()
    const stage = (await page.locator('#preview').boundingBox())!
    assert.ok(scene, `${label}: landscape exists`)
    for (const edge of ['x', 'y', 'width', 'height'] as const)
      assert.ok(Math.abs(scene[edge] - stage[edge]) <= 2, `${label}: full-page scene ${edge}`)
    assert.equal(
      await page.locator('.environment-band').evaluate((element) => getComputedStyle(element).display),
      'none',
    )
    assert.equal(await page.locator('.sketch-range').count(), 3)
    assert.equal(await page.locator('.sketch-ripples').count(), 1)
    report.fullPageCases++
  }
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
      sky: getComputedStyle(document.querySelector('.landscape-wash')!).transform,
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
  assert.match(
    await page.locator('.navigation').evaluate((el) => getComputedStyle(el).backdropFilter),
    /blur\(18px\)/,
    `${engineName}: built shared glass blur active`,
  )
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    for (const environment of ['lattice', 'landscape', 'basic']) {
      await page.getByLabel('Environment', { exact: true }).selectOption(environment)
      for (const mode of ['Light', 'Dark']) {
        await page.getByRole('button', { name: mode, exact: true }).click()
        assert.equal(await page.locator('.audition').getAttribute('data-environment'), environment)
        assert.equal(await page.locator('.audition').getAttribute('data-mode'), mode.toLowerCase())
        for (const id of environment === 'lattice' ? ['integrated', ...effects] : ['integrated']) {
          await reference(page, id)
          for (const material of id === 'integrated' ? materials : ['solid']) {
            await page.getByLabel('Content material', { exact: true }).selectOption(material)
            for (const view of ['Overview', 'Weekly Planner']) {
              await page.getByRole('button', { name: view, exact: false }).click()
              await geometry(
                page,
                `${engineName} ${width}×${height} ${environment} ${mode} ${id} ${material} ${view}`,
              )
            }
          }
        }
      }
    }
  }
  const reservedArea = await page.addStyleTag({
    content:
      '.audition { padding-left:44px!important; padding-right:44px!important; padding-bottom:34px!important }',
  })
  for (const [width, height] of [
    [390, 844],
    [667, 375],
  ]) {
    await page.setViewportSize({ width, height })
    for (const environment of ['lattice', 'landscape', 'basic']) {
      await page.getByLabel('Environment', { exact: true }).selectOption(environment)
      for (const mode of ['Light', 'Dark']) {
        await page.getByRole('button', { name: mode, exact: true }).click()
        for (const view of ['Overview', 'Weekly Planner']) {
          await page.getByRole('button', { name: view, exact: false }).click()
          await geometry(
            page,
            `${engineName}: simulated reserved edges ${width}×${height} ${environment} ${mode} ${view}`,
          )
        }
      }
    }
  }
  await reservedArea.evaluate((element) => {
    element.parentNode?.removeChild(element)
  })
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    for (const environment of ['lattice', 'landscape', 'basic']) {
      await page.getByLabel('Environment', { exact: true }).selectOption(environment)
      for (const mode of ['Light', 'Dark']) {
        await page.getByRole('button', { name: mode, exact: true }).click()
        for (const material of materials) {
          await page.getByLabel('Content material', { exact: true }).selectOption(material)
          for (const view of ['Overview', 'Weekly Planner']) {
            await page.getByRole('button', { name: view, exact: false }).click()
            await page.locator('#preview').scrollIntoViewIfNeeded()
            await page.locator('.audition[data-inactive="false"]').waitFor()
            await page.getByRole('button', { name: 'Play light cue' }).click()
            const coverage = await page.evaluate(() => {
              const targets = [...document.querySelectorAll<HTMLElement>('[data-cue-target]')]
              const rect = (element: Element) => {
                const r = element.getBoundingClientRect()
                return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
              }
              for (const animation of document.getAnimations()) {
                if (animation instanceof CSSAnimation || animation instanceof CSSTransition) continue
                animation.pause()
                const delay = Number(animation.effect!.getTiming().delay)
                animation.currentTime = delay + 360
              }
              const target = (name: string) => targets.find((element) => element.dataset.cueTarget === name)!
              return {
                stage: rect(document.querySelector('#preview')!),
                environment: rect(target('environment')),
                sky: target('sky') ? rect(target('sky')) : null,
                water: target('water') ? rect(target('water')) : null,
                transform: getComputedStyle(target('environment')).transform,
                opacity: getComputedStyle(target('environment')).opacity,
              }
            })
            assert.equal(coverage.transform, 'none', `${engineName}: scene cue stays in place`)
            assert.ok(Number(coverage.opacity) > 0, `${engineName}: midpoint is illuminated`)
            for (const edge of ['top', 'bottom', 'left', 'right'] as const)
              assert.ok(
                Math.abs(coverage.stage[edge] - coverage.environment[edge]) <= 2,
                `${engineName} ${width}×${height} ${mode} ${view}: entire cue ${edge}`,
              )
            if (environment === 'landscape') {
              assert.ok(coverage.sky && coverage.water)
              assert.ok(coverage.sky.top <= coverage.stage.top + 2)
              assert.ok(coverage.water.bottom >= coverage.stage.bottom - 2)
              assert.ok(
                coverage.sky.bottom >= coverage.water.top,
                'sky/water coverage overlaps without a seam',
              )
            }
            report.cueCoverageCases++
            await page.getByRole('button', { name: 'Pause', exact: true }).click()
            await page.getByRole('button', { name: 'Resume', exact: true }).click()
          }
        }
      }
    }
  }
  // Explicit archive: old filled band stays functional under either palette.
  await page.getByLabel('Environment', { exact: true }).selectOption('landscape')
  await reference(page, 'landscape-legacy')
  for (const mode of ['Light', 'Dark']) {
    await page.getByRole('button', { name: mode, exact: true }).click()
    assert.equal(await page.locator('.landscape-legacy').count(), 1)
    assert.equal(await page.locator('.landscape-sketch').count(), 0)
    assert.ok(await page.locator('.environment-band').isVisible())
    assert.ok(await page.getByLabel('Library defaults', { exact: false }).isDisabled())
    assert.equal(await page.locator('.audition').getAttribute('data-environment'), 'landscape')
  }
  await reference(page, 'integrated')
  await page.getByLabel('Environment', { exact: true }).selectOption('basic')
  await page.getByRole('button', { name: 'System', exact: true }).click()
  for (const mode of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: mode })
    await page.locator(`.audition[data-mode="${mode}"]`).waitFor()
    assert.equal(await page.getByLabel('Environment', { exact: true }).inputValue(), 'basic')
    assert.equal(
      await page.locator('.audition').evaluate((element) => getComputedStyle(element).colorScheme),
      mode,
    )
  }
  await page.getByRole('button', { name: 'Light', exact: true }).click()
  await page.emulateMedia({ colorScheme: 'dark' })
  assert.equal(
    await page.locator('.audition').getAttribute('data-mode'),
    'light',
    'OS cannot override explicit Light',
  )
  await page.getByLabel('Environment', { exact: true }).selectOption('landscape')
  const palette = async () =>
    page.locator('.audition').evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        ice: style.getPropertyValue('--ice'),
        sky: style.getPropertyValue('--land-sky-top'),
        glass: style.getPropertyValue('--glass-bg'),
      }
    })
  const lightPalette = await palette()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  const darkPalette = await palette()
  for (const key of ['ice', 'sky', 'glass'] as const)
    assert.notEqual(lightPalette[key], darkPalette[key], `${engineName}: resolved landscape colors ${key}`)
  assert.equal(
    await page.locator('.landscape-stars').evaluate((element) => getComputedStyle(element).opacity),
    '0.65',
  )
  await page.getByRole('button', { name: 'Light', exact: true }).click()
  assert.equal(
    await page.locator('.landscape-stars').evaluate((element) => getComputedStyle(element).opacity),
    '0',
  )
  await page.getByLabel('Environment', { exact: true }).selectOption('basic')
  assert.equal((await allAnimations(page)).length, 0, 'Basic has no continuous motion')
  assert.equal(
    await page.locator('.atmosphere').evaluate((element) => getComputedStyle(element).display),
    'none',
  )
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByLabel('Environment', { exact: true }).selectOption('landscape')
  await reference(page, 'integrated')
  await page.getByText('Preview notes', { exact: true }).click()
  await geometry(page, `${engineName}: opened in-flow preview menu`)
  await expandedControls(page)
  await page.getByRole('button', { name: 'Overview', exact: false }).click()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await page.locator('#preview').scrollIntoViewIfNeeded()
  await page.locator('.audition[data-inactive="false"]').waitFor()
  for (const selector of ['.nav-item.active', '.primary-action']) {
    const rim = await page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element, '::before')
      return { composite: style.maskComposite, legacy: style.getPropertyValue('-webkit-mask-composite') }
    })
    assert.ok(
      rim.composite.includes('exclude') || rim.legacy.includes('xor'),
      `${engineName}: ${selector} reflection is a rim, never an additive layer over text`,
    )
  }
  const before = await phase(page, 0.05)
  const after = await phase(page, 0.65)
  for (const role of ['x', 'nav', 'menu', 'action', 'active', 'control', 'sky'] as const)
    assert.notEqual(before[role], after[role], `${engineName}: shared lighting changes ${role}`)
  await page.getByRole('button', { name: 'Cinematic', exact: true }).click()
  await page.getByRole('button', { name: 'Light', exact: true }).click()
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
  assert.equal(cueCount, 7)
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
    assert.equal(count, 7, 'retrigger cancels previous cue animations including water')
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
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      await page.getByRole('button', { name: 'Overview', exact: false }).click()
      for (const environment of ['lattice', 'landscape']) {
        await page.getByLabel('Environment', { exact: true }).selectOption(environment)
        for (const mode of ['Light', 'Dark']) {
          await page.getByRole('button', { name: mode, exact: true }).click()
          await page.getByRole('button', { name: 'Balanced', exact: true }).click()
          await page.locator('#preview').scrollIntoViewIfNeeded()
          await page.locator('.audition[data-inactive="false"]').waitFor()
          for (const material of materials) {
            await page.getByLabel('Content material', { exact: true }).selectOption(material)
            await page.locator('#preview').scrollIntoViewIfNeeded()
            await page.locator('.audition[data-inactive="false"]').waitFor()
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
            report.performance.push({ effect: `${environment}-${mode}-${material}-${width}`, ...sample })
          }
        }
      }
    }
    for (const [width, height, device] of [
      [1440, 900, 'desktop'],
      [390, 844, 'phone'],
    ] as const) {
      await page.setViewportSize({ width, height })
      for (const environment of ['lattice', 'landscape', 'basic']) {
        await page.getByLabel('Environment', { exact: true }).selectOption(environment)
        for (const mode of ['Light', 'Dark']) {
          await page.getByRole('button', { name: mode, exact: true }).click()
          await page.getByRole('button', { name: 'Balanced', exact: true }).click()
          for (const details of [
            '.technical-references',
            '.lab-controls > details:not(.technical-references)',
          ])
            if ((await page.locator(details).getAttribute('open')) !== null)
              await page.locator(details).locator('summary').click()
          for (const material of environment === 'landscape' ? materials : ['solid']) {
            await page.getByLabel('Content material', { exact: true }).selectOption(material)
            for (const view of ['Overview', 'Weekly Planner']) {
              await page.getByRole('button', { name: view, exact: false }).click()
              await screenShot(
                page,
                `v5-${environment}-${mode.toLowerCase()}-${view === 'Overview' ? 'overview' : 'planner'}-${device}-${material}`,
              )
            }
          }
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByLabel('Environment', { exact: true }).selectOption('landscape')
    await page.getByRole('button', { name: 'Overview', exact: false }).click()
    for (const mode of ['Light', 'Dark']) {
      await page.getByRole('button', { name: mode, exact: true }).click()
      await page.locator('#preview').scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: 'Play light cue' }).click()
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) {
          if (animation instanceof CSSAnimation || animation instanceof CSSTransition) continue
          animation.pause()
          animation.currentTime = Number(animation.effect!.getTiming().delay) + 360
        }
      })
      const file = `screenshots/v5-landscape-${mode.toLowerCase()}-cue-desktop.png`
      await page.screenshot({ path: file, fullPage: true, animations: 'allow' })
      report.screenshots.push(file)
      await page.locator('.audition[data-cue-active="false"]').waitFor()
    }
    await page.getByLabel('Environment', { exact: true }).selectOption('lattice')
    await page.getByLabel('Content material', { exact: true }).selectOption('solid')
    await page.getByRole('button', { name: 'Overview', exact: false }).click()
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      const tiles = []
      for (const mode of ['Light', 'Dark']) {
        await page.getByRole('button', { name: mode, exact: true }).click()
        tiles.push((await page.locator('#preview').screenshot({ animations: 'disabled' })).toString('base64'))
        if (mode === 'Dark') {
          const file = `screenshots/v5-moonlit-branding-${width}.png`
          await page.locator('.navigation').screenshot({ path: file, animations: 'disabled' })
          report.screenshots.push(file)
        }
      }
      const comparison = await context.newPage()
      await comparison.setViewportSize({ width: width === 390 ? 800 : 1600, height: 900 })
      await comparison.setContent(
        `<body style="margin:0;padding:16px;background:#101827;color:white;font:16px sans-serif"><h1>V5 · Sunlit Lattice / Moonlit Lattice · actual browser renders</h1><div style="display:flex;align-items:start;gap:16px">${tiles.map((tile, i) => `<section style="width:50%;min-width:0"><h2>${i === 0 ? 'Sunlit · Light' : 'Moonlit · Dark'}</h2><img style="width:100%;display:block" src="data:image/png;base64,${tile}"></section>`).join('')}</div></body>`,
      )
      await comparison.evaluate(async () => Promise.all([...document.images].map((image) => image.decode())))
      const file = `screenshots/v5-lattice-comparison-${width}.png`
      await comparison.screenshot({ path: file, fullPage: true })
      report.screenshots.push(file)
      await comparison.close()
    }
    await page.getByRole('button', { name: 'Resume', exact: true }).click()
    await page.getByLabel('Environment', { exact: true }).selectOption('landscape')
    await reference(page, 'landscape-legacy')
    for (const [width, height, device] of [
      [1440, 900, 'desktop'],
      [390, 844, 'phone'],
    ] as const) {
      await page.setViewportSize({ width, height })
      for (const mode of ['Light', 'Dark']) {
        await page.getByRole('button', { name: mode, exact: true }).click()
        await screenShot(page, `v5-archived-v3-landscape-${mode.toLowerCase()}-${device}`)
      }
    }
    await reference(page, 'integrated')
    await page.emulateMedia({ forcedColors: 'active' })
    await page.locator('.audition[data-reduced-effects="true"]').waitFor()
    assert.equal((await allAnimations(page)).length, 0)
    await page.emulateMedia({ forcedColors: 'none' })
  }
  await materialEvidence(page, engineName)
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
  for (const material of materials) {
    await fallbackPage.getByLabel('Content material', { exact: true }).selectOption(material)
    await geometry(fallbackPage, `${engineName}: unsupported blur ${material}`)
    assert.equal(await fallbackPage.locator('.audition').getAttribute('data-effective-material'), 'solid')
  }
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
  for (const environment of ['lattice', 'landscape', 'basic']) {
    await touch.getByLabel('Environment', { exact: true }).selectOption(environment)
    for (const theme of ['Light', 'Dark']) {
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
  }
  await touchContext.close()
  assert.deepEqual(errors, [], `${engineName}: browser exceptions`)
  assert.deepEqual(external, [], `${engineName}: unexpected runtime external requests`)
  await browser.close()
  console.log(`${engineName}: geometry, cues, sampled materials and fallbacks passed`)
  report.engines.push(`${engineName}: passed (simulation, not physical iPhone acceptance)`)
}
await fs.writeFile('test-results/browser-report.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
