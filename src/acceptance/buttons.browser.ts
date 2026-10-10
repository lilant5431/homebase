/** Actual built-app button color pairs and native activation. Preview on 4178. */
import { chromium, webkit, type Locator } from 'playwright'
import { expect } from 'playwright/test'
import { opaqueTextContrast } from './buttonContrast.ts'

async function rendered(button: Locator) {
  return button.evaluate((node) => {
    const style = getComputedStyle(node)
    return {
      foreground: style.color,
      background: style.backgroundColor,
      active: node.matches(':active'),
      shadow: style.boxShadow,
      outline: style.outlineWidth,
    }
  })
}
async function contrast(button: Locator, held = false) {
  const colors = await rendered(button)
  if (held) expect(colors.active).toBe(true)
  const ratio = opaqueTextContrast(colors.foreground, colors.background)
  expect(ratio, JSON.stringify(colors)).toBeGreaterThanOrEqual(4.5)
  return { ...colors, ratio }
}

for (const [engineName, engine] of [
  ['chromium', chromium],
  ['webkit', webkit],
] as const) {
  const browser = await engine.launch()
  try {
    const reductions =
      engineName === 'chromium'
        ? (['standard', 'motion', 'effects', 'forced'] as const)
        : (['standard', 'motion', 'effects'] as const)
    for (const mode of ['light', 'dark'] as const)
      for (const reduction of reductions) {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          colorScheme: mode,
          reducedMotion: reduction === 'motion' ? 'reduce' : 'no-preference',
          forcedColors: reduction === 'forced' ? 'active' : 'none',
        })
        const page = await context.newPage()
        await page.addInitScript(
          ({ mode, reduction }) => {
            localStorage.setItem(
              'homebase.appearance.v1',
              JSON.stringify({
                version: 1,
                environment: 'lattice',
                mode,
                material: 'solid',
                effects: reduction === 'effects' ? 'reduced' : 'system',
                motion: 'system',
              }),
            )
          },
          { mode, reduction },
        )
        await page.goto('http://127.0.0.1:4178')
        await page.getByRole('button', { name: 'Weekly Planner', exact: true }).click()
        const before = await page.evaluate(() => ({
          academic: localStorage.getItem('homebase.academic.v1'),
          schedule: localStorage.getItem('homebase.schedule.v1'),
          appearance: localStorage.getItem('homebase.appearance.v1'),
          reference: document.querySelector('.planner-reference')?.textContent,
        }))
        const results: object[] = []
        for (const selector of ['.shell-secondary', '.page-heading .primary-button', '.nav-item.active']) {
          const button = page.locator(selector)
          await button.evaluate((node) => {
            node.setAttribute('data-native-clicks', '0')
            node.addEventListener('click', () => {
              node.setAttribute(
                'data-native-clicks',
                String(Number(node.getAttribute('data-native-clicks')) + 1),
              )
            })
          })
          await page.mouse.move(0, 0)
          await contrast(button)
          await button.focus()
          await expect(button).toBeFocused()
          await contrast(button)
          await button.hover()
          const hover = await contrast(button)
          await page.mouse.down()
          const pointer = await contrast(button, true)
          if (reduction === 'forced') expect(Number.parseFloat(pointer.outline)).toBeGreaterThan(0)
          else expect(pointer.shadow).not.toBe('none')
          await page.mouse.up()
          await expect(button).toHaveAttribute('data-native-clicks', '1')
          if (selector !== '.nav-item.active') {
            await expect(page.getByRole('dialog')).toHaveCount(1)
            await page.getByRole('button', { name: 'Cancel', exact: true }).click()
          }
          await page.mouse.move(0, 0)
          await button.focus()
          await page.keyboard.down('Space')
          const keyboard = await contrast(button, true)
          await page.keyboard.up('Space')
          await expect(button).toHaveAttribute('data-native-clicks', '2')
          if (selector !== '.nav-item.active') {
            await expect(page.getByRole('dialog')).toHaveCount(1)
            await page.getByRole('button', { name: 'Cancel', exact: true }).click()
          }
          await button.focus()
          await page.keyboard.press('Enter')
          await expect(button).toHaveAttribute('data-native-clicks', '3')
          if (selector !== '.nav-item.active') {
            await expect(page.getByRole('dialog')).toHaveCount(1)
            await page.getByRole('button', { name: 'Cancel', exact: true }).click()
          }
          if (reduction !== 'standard')
            expect(
              await button.locator('.activation-light').evaluate((node) => getComputedStyle(node).display),
            ).toBe('none')
          results.push({ selector, hover, pointer, keyboard })
        }
        // Other shared navigation states use opaque checked semantic backgrounds.
        const other = page.getByRole('button', { name: 'Classes', exact: true })
        await other.hover()
        // Navigation transitions from a transparent exterior to its opaque hover backplate.
        // Measure the settled backplate; opaqueTextContrast deliberately rejects uncomposited alpha.
        await expect.poll(async () => (await rendered(other)).background).toMatch(/^rgb\(/)
        await contrast(other)
        await page.mouse.down()
        await contrast(other, true)
        await page.mouse.move(0, 0)
        await page.mouse.up()
        const after = await page.evaluate(() => ({
          academic: localStorage.getItem('homebase.academic.v1'),
          schedule: localStorage.getItem('homebase.schedule.v1'),
          appearance: localStorage.getItem('homebase.appearance.v1'),
          reference: document.querySelector('.planner-reference')?.textContent,
        }))
        expect(after).toEqual(before)
        console.log(JSON.stringify({ engineName, mode, reduction, results }))
        await context.close()
      }
  } finally {
    await browser.close()
  }
}
