import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import type { Page } from 'playwright'

// Screenshot sampling is test-only: no runtime Canvas, clock or storage added.
export async function materialEvidence(page: Page, engine: string) {
  const records = []
  const controls = page.locator('.lab-controls > details:not(.technical-references)')
  if ((await controls.getAttribute('open')) === null) await controls.locator('summary').click()
  await page.getByRole('button', { name: 'Reset recommended values' }).click()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    for (const mode of ['Light', 'Dark']) {
      await page.getByRole('button', { name: mode, exact: true }).click()
      await page.getByLabel('Environment', { exact: true }).selectOption('landscape')
      for (const view of ['Overview', 'Weekly Planner']) {
        await page.getByRole('button', { name: view, exact: false }).click()
        const hide = await page.addStyleTag({ content: '.composition { visibility:hidden!important }' })
        const backdrop = (await page.screenshot({ fullPage: true })).toString('base64')
        await hide.evaluate((element) => element.parentNode?.removeChild(element))
        for (const material of ['solid', 'frosted']) {
          await page.getByLabel('Content material', { exact: true }).selectOption(material)
          const rendered = (await page.screenshot({ fullPage: true })).toString('base64')
          const evidence = await page.evaluate(
            async ({ backdrop, rendered, material }) => {
              const image = new Image()
              image.src = `data:image/png;base64,${backdrop}`
              await image.decode()
              const canvas = document.createElement('canvas')
              canvas.width = image.width
              canvas.height = image.height
              const context = canvas.getContext('2d')!
              context.drawImage(image, 0, 0)
              const pixels = context.getImageData(0, 0, image.width, image.height).data
              const front = new Image()
              front.src = `data:image/png;base64,${rendered}`
              await front.decode()
              context.clearRect(0, 0, canvas.width, canvas.height)
              context.drawImage(front, 0, 0)
              const painted = context.getImageData(0, 0, canvas.width, canvas.height).data

              const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number)
              const luminance = (values: number[]) => {
                const linear = values.slice(0, 3).map((n) => {
                  const v = n / 255
                  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
                })
                return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
              }
              const contrast = (a: number[], b: number[]) => {
                const [low, high] = [luminance(a), luminance(b)].sort((a, b) => a - b)
                return (high + 0.05) / (low + 0.05)
              }
              const panels = [...document.querySelectorAll<HTMLElement>('.content-card,.metrics article')]
              return panels.map((panel) => {
                const style = getComputedStyle(panel)
                const fill = rgb(style.backgroundColor)
                const alpha = fill[3] ?? 1
                const rect = panel.getBoundingClientRect()
                const samples: number[][] = []
                for (let y = Math.round(rect.top + scrollY + 6); y < rect.bottom + scrollY - 6; y += 12) {
                  for (let x = Math.round(rect.left + scrollX + 6); x < rect.right + scrollX - 6; x += 12) {
                    const index = (y * image.width + x) * 4
                    if (index >= 0 && index + 3 < pixels.length)
                      samples.push([...pixels.slice(index, index + 3)])
                  }
                }
                const blend = (scene: number[]) =>
                  fill.slice(0, 3).map((v, i) => v * alpha + scene[i] * (1 - alpha))
                const roles = [
                  ...panel.querySelectorAll<HTMLElement>(
                    'h3,h4,.eyebrow,.record-meta,.session-time,.session-summary p,.breathing-room,.legend,.day-heading,.open-time,.week-footnote,strong,small',
                  ),
                ]
                  .filter(
                    (element) =>
                      element.getClientRects().length &&
                      !element.closest('.session-block') &&
                      !element.closest('.primary-action'),
                  )
                  .map((element) => {
                    const fg = rgb(getComputedStyle(element).color)
                    let backing: number[] | undefined
                    // Find a real computed opaque local plate (including selected weekday).
                    for (
                      let parent: HTMLElement | null = element;
                      parent && parent !== panel;
                      parent = parent.parentElement
                    ) {
                      const bg = rgb(getComputedStyle(parent).backgroundColor)
                      if ((bg[3] ?? 1) === 1) {
                        backing = bg.slice(0, 3)
                        break
                      }
                    }
                    const actual = samples.map((sample) => contrast(fg, backing || blend(sample)))
                    const extremes = [
                      [0, 0, 0],
                      [255, 255, 255],
                    ].map((sample) => contrast(fg, backing || blend(sample)))
                    return {
                      selector: element.className || element.tagName,
                      foreground: fg,
                      backing: backing || null,
                      minimumSceneRatio: Math.min(...actual),
                      minimumEnvelopeRatio: Math.min(...extremes),
                    }
                  })
                const sorted = [...samples].sort((a, b) => luminance(a) - luminance(b))
                return {
                  material,
                  panel: panel.className || 'metric',
                  background: style.backgroundColor,
                  filter: style.backdropFilter,
                  opacity: style.opacity,
                  paintedSwatches: [0.25, 0.5, 0.75].map((portion) => {
                    const x = Math.round(rect.right + scrollX - 10)
                    const y = Math.round(rect.top + scrollY + rect.height * portion)
                    return [...painted.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 3)]
                  }),
                  sampleCount: samples.length,
                  darkest: sorted[0],
                  brightest: sorted.at(-1),
                  roles,
                }
              })
            },
            { backdrop, rendered, material },
          )
          for (const panel of evidence) {
            assert.ok(panel.sampleCount > 0)
            assert.equal(panel.opacity, '1')
            if (material !== 'solid')
              assert.ok(panel.background.endsWith(`, ${0.72})`), `${engine}: material uses intended alpha`)

            for (const role of panel.roles) {
              assert.ok(
                role.minimumSceneRatio >= 4.5,
                `${engine} ${width} ${mode} ${material} ${role.selector}: sampled contrast ${role.minimumSceneRatio}`,
              )
              assert.ok(
                role.minimumEnvelopeRatio >= 4.5,
                `${engine} ${material} ${role.selector}: full black/white envelope ${role.minimumEnvelopeRatio}`,
              )
            }
          }
          records.push({ engine, width, mode, view, material, evidence })
        }
      }
    }
  }
  for (let index = 0; index < records.length; index += 2) {
    const swatches = records
      .slice(index, index + 2)
      .map((record) => record.evidence.map((panel) => panel.paintedSwatches))
    assert.notDeepEqual(swatches[0], swatches[1], `${engine}: Solid/Frosted actual pixels differ`)
  }
  // Retention, reduction/restoration, cue and navigation are real controls.
  for (const material of ['solid', 'frosted']) {
    await page.getByLabel('Content material', { exact: true }).selectOption(material)
    await page.getByLabel('Reduce visual effects', { exact: true }).check()
    assert.equal(
      await page
        .locator('.content-card')
        .first()
        .evaluate((el) => getComputedStyle(el).backdropFilter),
      'none',
    )
    assert.match(
      await page
        .locator('.content-card')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      /^rgb\(/,
    )
    assert.equal(await page.getByLabel('Content material', { exact: true }).inputValue(), material)
    await page.getByLabel('Reduce visual effects', { exact: true }).uncheck()
    assert.equal(await page.locator('.audition').getAttribute('data-effective-material'), material)
  }
  await page.getByLabel('Environment', { exact: true }).selectOption('lattice')
  const colors = async () =>
    page.locator('.navigation').evaluate((el) => ({
      glass: getComputedStyle(el).backgroundColor,
      brand: getComputedStyle(el.querySelector('.brand')!).backgroundColor,
      mark: getComputedStyle(el.querySelector('.brand-mark')!).color,
    }))
  await page.getByRole('button', { name: 'Light', exact: true }).click()
  const daylight = await colors()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  const moonlit = await colors()
  assert.equal(moonlit.glass, 'rgba(7, 16, 30, 0.94)')
  assert.equal(moonlit.brand, 'rgb(8, 15, 27)')
  assert.notDeepEqual(daylight, moonlit)
  await page.getByLabel('Reduce visual effects', { exact: true }).check()
  assert.equal(await page.locator('.navigation').evaluate((el) => getComputedStyle(el).boxShadow), 'none')
  assert.equal(await page.locator('.brand').evaluate((el) => getComputedStyle(el).boxShadow), 'none')
  assert.ok(
    !(await page
      .locator('.nav-item.active')
      .evaluate((el) => getComputedStyle(el).boxShadow)
      .then((value) => value.includes('14px'))),
  )
  await page.getByLabel('Reduce visual effects', { exact: true }).uncheck()

  await page.getByRole('heading', { name: 'Moonlit Lattice — Dark', exact: true }).waitFor()
  // Long phone composition: inspect upper, middle and lower real panel bounds.
  const stage = (await page.locator('#preview').boundingBox())!
  for (const portion of [0, 0.5, 1]) {
    await page.evaluate((y) => window.scrollTo(0, y), stage.y + portion * stage.height)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390)
  }
  await fs.writeFile(
    `test-results/material-${engine.toLowerCase()}.json`,
    JSON.stringify({ revision: 'V6', records, daylight, moonlit }, null, 2) + '\n',
  )
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
}
