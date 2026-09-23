// Run with an authenticated Playwright page: await checkMobileShell(page).
// Uses the caller's existing browser; no Playwright dependency or credentials are stored here.
module.exports = async function checkMobileShell(page, baseUrl = 'http://localhost:3000') {
  const assert = {
    equal(actual, expected, message = 'Unexpected scanner/dialog state') {
      if (actual !== expected) throw new Error(`${message}: ${actual} !== ${expected}`)
    },
    ok(value) {
      if (!value) throw new Error('Close button must remain inside the landscape viewport')
    },
  }
  const results = []
  const preventWrites = (route) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.request().method())
    ? route.abort('blockedbyclient')
    : route.continue()
  await page.route('**/api/**', preventWrites)
  try {
    await page.goto(`${baseUrl}/dashboard`)
    await page.getByRole('heading', { name: 'Početna', exact: true }).waitFor()
    for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [1023, 768], [1024, 768], [1440, 900], [844, 390]]) {
      await page.setViewportSize({ width, height })
      const layout = await page.evaluate(() => {
        const nav = document.querySelector('nav[aria-label="Glavna navigacija"]')
        const button = nav?.querySelector('[data-quick-scan-trigger]')
        const label = button?.parentElement?.querySelector('span')
        return {
          width: innerWidth,
          overflow: document.documentElement.scrollWidth > innerWidth,
          mobileNav: !!nav?.getClientRects().length,
          overlap: !!button && !!label && button.getBoundingClientRect().bottom > label.getBoundingClientRect().top,
        }
      })
      assert.equal(layout.overflow, false, `Horizontal overflow at ${width}px`)
      assert.equal(layout.mobileNav, width < 1024, `Navigation breakpoint at ${width}px`)
      if (width < 1024) assert.equal(layout.overlap, false, `Scan label overlap at ${width}px`)
      results.push(layout)
    }

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Skeniraj proizvod', exact: true }).first().click()
    await page.getByRole('dialog').waitFor()
    assert.equal(await page.getByRole('dialog').count(), 1)
    assert.equal(await page.locator('#barcode-scanner-region').count(), 1)
    await page.setViewportSize({ width: 1440, height: 900 })
    assert.equal(await page.locator('#barcode-scanner-region').count(), 1)
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal(await page.locator('#barcode-scanner-region').count(), 0)
    await page.waitForFunction(() => document.activeElement?.hasAttribute('data-quick-scan-trigger'))

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('navigation', { name: 'Glavna navigacija' }).getByRole('button', { name: 'Skeniraj proizvod' }).click()
    await page.getByRole('dialog').waitFor()
    assert.equal(await page.locator('#barcode-scanner-region').count(), 1)
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })

    await page.getByRole('button', { name: 'Više', exact: true }).click()
    const sheet = page.getByRole('dialog')
    await sheet.waitFor()
    assert.equal(await sheet.getByRole('button', { name: 'Skeniraj proizvod' }).count(), 0)
    await page.setViewportSize({ width: 844, height: 390 })
    await sheet.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)))
    const closeBounds = await sheet.getByRole('button', { name: 'Zatvori', exact: true }).boundingBox()
    assert.ok(closeBounds && closeBounds.y >= 0 && closeBounds.y + closeBounds.height <= 390)
    await page.setViewportSize({ width: 1024, height: 768 })
    await sheet.waitFor({ state: 'hidden' })
    results.push({ sharedScanner: 'passed', focusRestored: true, landscapeSheet: 'passed', desktopSheetClosed: true })
    return results
  } finally {
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape')
    await page.unroute('**/api/**', preventWrites)
  }
}
