import 'expect-puppeteer'
import { setDefaultOptions } from 'expect-puppeteer'
import type { Page } from 'puppeteer'

jest.retryTimes(1)
/** E2E hits live Sisu + localhost API; allow time for navigation and shadow-root rendering. */
jest.setTimeout(120_000)
setDefaultOptions({ timeout: 45_000 })

async function resetTestingBackend(): Promise<void> {
  try {
    const res = await fetch('http://localhost:3001/api/testing/reset', { method: 'POST' })
    if (!res.ok) {
      throw new Error(
        res.status === 404 ? '404 (is ALLOW_RESET=true set for the backend?)' : `HTTP ${res.status}`
      )
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    throw new Error(
      `Reviews E2E needs the API at http://localhost:3001 with /api/testing/reset (${detail}). ` +
        'Start: docker compose -f packages/backend/docker-compose.yml up -d'
    )
  }
}

async function waitForCourseReviewPanelReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#review-root-host')?.shadowRoot?.textContent ?? ''
      return t.includes('Quality') || t.includes('Course code not found') || t.includes('Error:')
    },
    { timeout: 45_000 }
  )
}

/** Course review UI lives under this host; pierce with Puppeteer's >>> combinator. */
const COURSE_REVIEW = '#review-root-host >>>'

function courseReviewPText(label: string): string {
  return `${COURSE_REVIEW} ::-p-text(${JSON.stringify(label)})`
}

async function clickInCourseReviewShadow(page: Page, label: string): Promise<void> {
  await page.locator(courseReviewPText(label)).click()
}

async function clickDeleteReviewInCourseShadow(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const sr = document.querySelector('#review-root-host')?.shadowRoot
    if (!sr) {
      return false
    }
    return [...sr.querySelectorAll('button')].some((b) =>
      (b.textContent || '').includes('Delete review')
    )
  })
  await page.evaluate(() => {
    const sr = document.querySelector('#review-root-host')?.shadowRoot
    for (const b of sr?.querySelectorAll('button') ?? []) {
      if ((b as HTMLButtonElement).textContent?.includes('Delete review')) {
        ;(b as HTMLButtonElement).click()
        return
      }
    }
    throw new Error('Delete review button not found after wait')
  })
}

/**
 * `locator.fill()` often times out on fields inside shadow roots (visibility / actionability).
 * The review form is uncontrolled; submit reads DOM values, so setting .value + events is enough.
 */
async function fillInCourseReviewShadow(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const sr = document.querySelector('#review-root-host')?.shadowRoot
      return Boolean(sr?.querySelector(sel))
    },
    { timeout: 30_000 },
    selector
  )
  await page.evaluate(
    (sel, val) => {
      const sr = document.querySelector('#review-root-host')?.shadowRoot
      const el = sr?.querySelector(sel) as HTMLTextAreaElement | HTMLInputElement | null
      if (!el) {
        throw new Error(`fillInCourseReviewShadow: missing ${sel}`)
      }
      el.focus()
      el.value = val
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    },
    selector,
    value
  )
}

async function submitCourseReviewForm(page: Page): Promise<void> {
  await page.locator(`${COURSE_REVIEW} form button[type="submit"]`).click()
}

/** Search hits mount only a plain div in shadow (no `.review-root` class — that is course-page only). */
async function expectSearchResultReviewText(page: Page, condensedNeedle: string): Promise<void> {
  await page.waitForFunction(
    (sub: string) => {
      const n = (s: string) => s.replace(/\s+/g, '')
      const target = n(sub)
      for (const h of document.querySelectorAll('.kurssikone-shadow-host')) {
        const panel = h.shadowRoot?.querySelector('div')
        const t = panel?.textContent ?? ''
        if (n(t).includes(target)) {
          return true
        }
      }
      return false
    },
    { timeout: 30_000 },
    condensedNeedle
  )
}

describe('Reviews', () => {
  beforeEach(async () => {
    await resetTestingBackend()

    const workerTarget = await browser.waitForTarget(
      (target) => target.type() === 'service_worker' && target.url().endsWith('background.js'),
      { timeout: 60_000 }
    )
    const worker = await workerTarget.worker()
    await worker?.evaluate(() => chrome.storage.sync.clear())
    await worker?.evaluate(() => chrome.storage.local.clear())

    await page.setViewport({ width: 1920, height: 1080 })
    await page.goto('https://sisu.aalto.fi/student/courseunit/aalto-CU-1150973070-20240801', {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    })
  })

  it('Should contain correct data when empty', async () => {
    await expect(page).toClick('li', { text: 'Reviews' })
    await waitForCourseReviewPanelReady(page)
    await expect(page).toMatchTextContent('Quality', { traverseShadowRoots: true })
    await expect(page).toMatchTextContent('0.0', { traverseShadowRoots: true })
    await expect(page).toMatchTextContent('Workload', { traverseShadowRoots: true })
    await expect(page).toMatchTextContent('+ Write a Review', { traverseShadowRoots: true })
    await expect(page).toMatchTextContent('0 Reviews', { traverseShadowRoots: true })
  })

  it('Should have correct tab behaviour', async () => {
    await expect(page).toMatchElement('li.active', { text: 'Esite' })
    await expect(page).toMatchElement('li:not(.active)', { text: 'Reviews' })

    await expect(page).toClick('li', { text: 'Reviews' })
    await expect(page).toMatchElement('li.active', { text: 'Reviews' })
    await expect(page).toMatchElement('li:not(.active)', { text: 'Esite' })

    await expect(page).toClick('li', { text: 'Ristiinopiskelu' })
    await expect(page).toMatchElement('li.active', { text: 'Ristiinopiskelu' })
    await expect(page).toMatchElement('li:not(.active)', { text: 'Reviews' })
  })

  it('Should be able to register a new user', async () => {
    await expect(page).toClick('li', { text: 'Reviews' })
    await waitForCourseReviewPanelReady(page)
    await clickInCourseReviewShadow(page, '+ Write a Review')

    await expect(page).toMatchTextContent('- Cancel', { traverseShadowRoots: true })

    await expect(page).toMatchTextContent('Looks like this is your first time making a review!', {
      traverseShadowRoots: true,
    })

    await expect(page).toMatchTextContent('Your user ID is:', { traverseShadowRoots: true })

    await clickInCourseReviewShadow(page, 'Understood, I have saved my user ID')

    await expect(page).toMatchTextContent('Publish review', { traverseShadowRoots: true })
  })

  it('Should be able to register as an old user', async () => {
    const userRes = await fetch('http://localhost:3001/api/users', {
      method: 'POST',
      body: JSON.stringify({
        id: '3',
        hash: 350307021737,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (!userRes.ok) {
      throw new Error(`Seed user failed: HTTP ${userRes.status}`)
    }

    await expect(page).toClick('li', { text: 'Reviews' })
    await waitForCourseReviewPanelReady(page)
    await clickInCourseReviewShadow(page, '+ Write a Review')

    await expect(page).toMatchTextContent('- Cancel', { traverseShadowRoots: true })

    await expect(page).toMatchTextContent('Looks like this is your first time making a review!', {
      traverseShadowRoots: true,
    })

    await expect(page).toMatchTextContent('Your user ID is:', { traverseShadowRoots: true })

    await fillInCourseReviewShadow(page, 'input[placeholder="Paste your user ID here"]', '3')

    await clickInCourseReviewShadow(page, 'Submit')

    await expect(page).not.toMatchTextContent('- Cancel', { traverseShadowRoots: true })
  })

  it('Should be able to make a review, edit it and delete it', async () => {
    await expect(page).toClick('li', { text: 'Reviews' })
    await waitForCourseReviewPanelReady(page)
    await clickInCourseReviewShadow(page, '+ Write a Review')

    await expect(page).toMatchTextContent('- Cancel', { traverseShadowRoots: true })
    await clickInCourseReviewShadow(page, 'Understood, I have saved my user ID')

    await expect(page).toMatchTextContent('- Cancel', { traverseShadowRoots: true })
    await fillInCourseReviewShadow(page, 'textarea[name="otherInfo"]', 'Test review content')

    await submitCourseReviewForm(page)
    await expect(page).not.toMatchTextContent('- Cancel', { traverseShadowRoots: true })

    await expect(page).toMatchTextContent('Your review:', { traverseShadowRoots: true })
    await expect(page).toMatchTextContent('Test review content', { traverseShadowRoots: true })

    await expect(page).toMatchTextContent('3', { traverseShadowRoots: true })
    await expect(page).toMatchTextContent('3.0', { traverseShadowRoots: true })

    await expect(page).toMatchTextContent('1 Reviews', { traverseShadowRoots: true })

    await clickInCourseReviewShadow(page, '+ Edit your review')

    await expect(page).toMatchTextContent('- Cancel', { traverseShadowRoots: true })

    await fillInCourseReviewShadow(page, 'textarea[name="otherInfo"]', 'Test another content')

    await submitCourseReviewForm(page)

    await expect(page).not.toMatchTextContent('- Cancel', { traverseShadowRoots: true })

    await expect(page).toMatchTextContent('Your review:', { traverseShadowRoots: true })
    await expect(page).toMatchTextContent('Test another content', { traverseShadowRoots: true })

    await expect(page).toMatchTextContent('3', { traverseShadowRoots: true })
    await expect(page).toMatchTextContent('3.0', { traverseShadowRoots: true })

    await expect(page).toMatchTextContent('1 Reviews', { traverseShadowRoots: true })

    await clickInCourseReviewShadow(page, '+ Edit your review')

    await expect(page).toMatchTextContent('- Cancel', { traverseShadowRoots: true })

    const dialog = await expect(page).toDisplayDialog(async () => {
      await clickDeleteReviewInCourseShadow(page)
    })

    expect(dialog.message()).toBe('Are you sure you want to delete your review?')

    dialog.dismiss()

    await expect(page).toMatchTextContent('- Cancel', { traverseShadowRoots: true })

    const dialogAgain = await expect(page).toDisplayDialog(async () => {
      await clickDeleteReviewInCourseShadow(page)
    })

    expect(dialogAgain.message()).toBe('Are you sure you want to delete your review?')

    dialogAgain.accept()

    await expect(page).toMatchTextContent('0', { traverseShadowRoots: true })
    await expect(page).toMatchTextContent('0.0', { traverseShadowRoots: true })

    await expect(page).toMatchTextContent('0 Reviews', { traverseShadowRoots: true })

    await expect(page).not.toMatchTextContent('- Cancel', { traverseShadowRoots: true })
  })

  it('Course list should show averages', async () => {
    const userRes = await fetch('http://localhost:3001/api/users', {
      method: 'POST',
      body: JSON.stringify({
        id: '3',
        hash: 350307021737,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (!userRes.ok) {
      throw new Error(`Seed user failed: HTTP ${userRes.status}`)
    }

    const reviewRes = await fetch('http://localhost:3001/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        otherInfo: 'test',
        workloadScore: 3,
        qualityScore: 1,
        courseCode: 'CS-A1110',
        userId: '3',
        timestampCreated: 1620000000000,
        hash: 15005318265153,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (!reviewRes.ok) {
      throw new Error(`Seed review failed: HTTP ${reviewRes.status}`)
    }

    await page.goto('https://sisu.aalto.fi/student/search/main', {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    })

    await expect(page).toFill('#full-text-query-input', 'Ohjelmointi 1')

    await expect(page).toClick('button', { text: 'Hae' })

    await expect(page).toMatchTextContent('FITech 101: Johdatus ohjelmointiin (2 op)', {
      traverseShadowRoots: true,
    })
    await expect(page).toMatchTextContent('Ohjelmointi 1 (5 op)', { traverseShadowRoots: true })

    await expect(page).toMatchTextContent('4 hakutulosta', { traverseShadowRoots: true })

    await expectSearchResultReviewText(page, 'Quality0.0Workload0.0')
    await expectSearchResultReviewText(page, 'Quality1.0Workload3.0')
  })
})
