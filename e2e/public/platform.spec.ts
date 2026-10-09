import { test, expect } from '../support/test'

test.describe('SEO, PWA and headers', () => {
  test('robots keeps shared links and the app out of search', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text()
    expect(body).toMatch(/Disallow: \/shared\//)
    expect(body).toMatch(/Sitemap: https?:\/\//)
  })

  test('sitemap lists the home and trade pages', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('/za/veleprodaju')
    expect(body).not.toContain('/shared/')
  })

  test('the PWA manifest is installable', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest')
    expect(response.status()).toBe(200)
    const manifest = await response.json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBeTruthy()
    expect(Array.isArray(manifest.icons) && manifest.icons.length).toBeTruthy()
  })

  test('link previews have an OG image', async ({ request }) => {
    const response = await request.get('/opengraph-image')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
  })

  test('security headers are sent', async ({ request }) => {
    const headers = (await request.get('/')).headers()
    expect(headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['permissions-policy']).toContain('camera=(self)')
  })
})
