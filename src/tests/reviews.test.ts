jest.retryTimes(3)

describe('Reviews', () => {
  beforeEach(async () => {
    await page.setViewport({ width: 1920, height: 1080 })
    await page.goto('https://sisu.aalto.fi/student/courseunit/aalto-CU-1150973070-20240801')
    await fetch('http://localhost:3001/api/testing/reset', { method: 'POST' })

    // @ts-ignore
    const workerTarget = await browser.waitForTarget(
      (target: any) => target.type() === 'service_worker' && target.url().endsWith('background.js')
    )

    const worker = await workerTarget.worker()

    worker.evaluate(() => chrome.storage.sync.clear())
  })

  it('Should contain correct data when empty"', async () => {
    await expect(page).toClick('li', { text: 'Reviews' })
    await expect(page).toMatchTextContent('Quality')
    await expect(page).toMatchTextContent('0.0')
    await expect(page).toMatchTextContent('Workload')
    await expect(page).toMatchTextContent('Difficulty')
    await expect(page).toMatchTextContent('+ Write a Review')
    await expect(page).toMatchTextContent('0 Reviews')
  })

  it('Should have correct tab behaviour"', async () => {
    await expect(page).toMatchElement('li.active', { text: 'Esite' })
    await expect(page).toMatchElement('li:not(.active)', { text: 'Reviews' })

    await expect(page).toClick('li', { text: 'Reviews' })
    await expect(page).toMatchElement('li.active', { text: 'Reviews' })
    await expect(page).toMatchElement('li:not(.active)', { text: 'Esite' })

    await expect(page).toClick('li', { text: 'Ristiinopiskelu' })
    await expect(page).toMatchElement('li.active', { text: 'Ristiinopiskelu' })
    await expect(page).toMatchElement('li:not(.active)', { text: 'Reviews' })
  })

  it('Should be able to register a new user"', async () => {
    await expect(page).toClick('li', { text: 'Reviews' })
    await expect(page).toClick('button', { text: '+ Write a Review' })

    await expect(page).toMatchTextContent('- Cancel')

    await expect(page).toMatchTextContent('Looks like this is your first time making a review!')

    await expect(page).toMatchTextContent('Your user ID is:')

    await expect(page).toClick('button', { text: 'Understood, I have saved my user ID' })

    await expect(page).toMatchTextContent('Publish review')
  })

  it('Should be able to register as an old user"', async () => {
    await fetch('http://localhost:3001/api/users', {
      method: 'POST',
      body: JSON.stringify({
        id: '3',
        hash: 350307021737,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    await expect(page).toClick('li', { text: 'Reviews' })
    await expect(page).toClick('button', { text: '+ Write a Review' })

    await expect(page).toMatchTextContent('- Cancel')

    await expect(page).toMatchTextContent('Looks like this is your first time making a review!')

    await expect(page).toMatchTextContent('Your user ID is:')

    await expect(page).toFill('input[placeholder="Paste your user ID here"]', '3')

    await expect(page).toClick('button', { text: 'Submit' })

    await expect(page).not.toMatchTextContent('- Cancel')
  })

  it('Should be able to make a review, edit it and delete it"', async () => {
    await expect(page).toClick('li', { text: 'Reviews' })
    await expect(page).toClick('button', { text: '+ Write a Review' })

    await expect(page).toMatchTextContent('- Cancel')
    await expect(page).toClick('button', { text: 'Understood, I have saved my user ID' })

    await expect(page).toMatchTextContent('- Cancel')
    await expect(page).toFill('input[name="reviewTitle"]', 'Test review title')
    await expect(page).toFill('textarea[name="content"]', 'Test review content')

    await expect(page).toClick('button', { text: 'Publish review' })
    await expect(page).not.toMatchTextContent('- Cancel')

    await expect(page).toMatchTextContent('Your review:')
    await expect(page).toMatchTextContent('Test review title')
    await expect(page).toMatchTextContent('Test review content')

    await expect(page).toMatchTextContent('3')
    await expect(page).toMatchTextContent('3.0')

    await expect(page).toMatchTextContent('1 Reviews')

    await expect(page).toClick('button', { text: '+ Edit your review' })

    await expect(page).toMatchTextContent('- Cancel')

    await expect(page).toFill('input[name="reviewTitle"]', 'Test another title')
    await expect(page).toFill('textarea[name="content"]', 'Test another content')

    await expect(page).toClick('button', { text: 'Publish edit' })

    await expect(page).not.toMatchTextContent('- Cancel')

    await expect(page).toMatchTextContent('Your review:')
    await expect(page).toMatchTextContent('Test another title')
    await expect(page).toMatchTextContent('Test another content')

    await expect(page).toMatchTextContent('3')
    await expect(page).toMatchTextContent('3.0')

    await expect(page).toMatchTextContent('1 Reviews')

    await expect(page).toClick('button', { text: '+ Edit your review' })

    await expect(page).toMatchTextContent('- Cancel')

    const dialog = await expect(page).toDisplayDialog(async () => {
      await expect(page).toClick('button', { text: 'Delete review' })
    })

    expect(dialog.message()).toBe('Are you sure you want to delete your review?')

    dialog.dismiss()

    await expect(page).toMatchTextContent('- Cancel')

    const dialogAgain = await expect(page).toDisplayDialog(async () => {
      await expect(page).toClick('button', { text: 'Delete review' })
    })

    expect(dialogAgain.message()).toBe('Are you sure you want to delete your review?')

    dialogAgain.accept()

    await expect(page).toMatchTextContent('0')
    await expect(page).toMatchTextContent('0.0')

    await expect(page).toMatchTextContent('0 Reviews')

    await expect(page).not.toMatchTextContent('- Cancel')
  })

  it('Course list should show averages"', async () => {
    await fetch('http://localhost:3001/api/users', {
      method: 'POST',
      body: JSON.stringify({
        id: '3',
        hash: 350307021737,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    await fetch('http://localhost:3001/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        title: 'test',
        content: 'test',
        workloadScore: 3,
        qualityScore: 1,
        difficultyScore: 5,
        courseCode: 'CS-A1110',
        userId: '3',
        timestampCreated: 1620000000000,
        hash: 15005318265153,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    await page.goto('https://sisu.aalto.fi/student/search/main')

    await expect(page).toFill('#search-main-university-input', 'Ohjelmointi 1')

    await expect(page).toClick('button', { text: 'Hae' })

    await expect(page).toMatchTextContent('FITech 101: Johdatus ohjelmointiin (2 op)')
    await expect(page).toMatchTextContent('Ohjelmointi 1 (5 op)')

    await expect(page).toMatchTextContent('4 hakutulosta')

    await expect(page).toMatchElement('.review-root', {
      text: 'Quality0.0Workload0.0Difficulty0.0',
    })
    await expect(page).toMatchElement('.review-root', {
      text: 'Quality1.0Workload3.0Difficulty5.0',
    })
  })
})
