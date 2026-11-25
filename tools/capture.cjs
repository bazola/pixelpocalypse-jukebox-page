// Re-takes the site's screenshots from a running app.
//
//   1. uv run --directory <the app's repo> python tools/site_server.py      (port 8002)
//   2. node tools/capture.cjs                 every shot
//      node tools/capture.cjs mixer piano     only shots whose name contains one of these words
//
// Playwright comes from the app's own web/node_modules (SMS_DIR, default ../pixelpocalypse-jukebox, else ../super-music-sound),
// so this repository installs nothing. The target is SMS_URL (default http://127.0.0.1:8002).
//
// The LLM: the app's /api/llm answers with whatever server and models the machine running it uses.
// The shots show the README's Ollama example instead, so no one's own setup ends up on the site.

const path = require('path')
const fs = require('fs')
const SMS = process.env.SMS_DIR || ['pixelpocalypse-jukebox', 'super-music-sound']
  .map((d) => path.resolve(__dirname, '..', '..', d)).find((d) => fs.existsSync(path.join(d, 'web'))) || path.resolve(__dirname, '..', '..', 'pixelpocalypse-jukebox')
const { chromium } = require(path.join(SMS, 'web', 'node_modules', '@playwright', 'test'))

const URL = process.env.SMS_URL || 'http://127.0.0.1:8002'
const OUT = path.resolve(__dirname, '..', 'img')
const LLM = { base_url: 'http://localhost:11434/v1', default: 'qwen3:14b', models: ['qwen3:14b', 'gemma3:27b', 'mistral-small3.2'] }

const NOIR = 'moody_bass_heavy_funk_track_with_minimal' // Pocket Noir: 6 tracks, critics' rounds
const RESORT = 'simcity_09_resort_steel_drums' // Beachfront Resort: 8 tracks
const RAG = 'simcity_06_old_town_ragtime' // City Planner's Ragtime

async function open(page, song) {
  await page.goto(`/?song=${song}`)
  await page.getByTestId('play').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForTimeout(1500) // clips, waveforms and meters settle
}
const tid = (page, id) => page.getByTestId(id)
const settle = (page) => page.waitForTimeout(800)

const SHOTS = {
  async arrangement(page) { await open(page, RESORT) },
  async pianoroll(page) {
    await open(page, NOIR)
    await tid(page, 'clip-bass-2').click()
    await tid(page, 'pianoroll').waitFor()
    await page.waitForTimeout(20_000) // the audition note set renders the first time
    await settle(page)
  },
  async drumgrid(page) {
    await open(page, NOIR)
    await tid(page, 'clip-drums-2').click()
    await tid(page, 'drumgrid').waitFor()
    await settle(page)
  },
  async ai(page) {
    await open(page, NOIR)
    await tid(page, 'ai-toggle').click()
    await tid(page, 'ai-panel').waitFor()
    await settle(page)
  },
  async critics(page) {
    await open(page, NOIR)
    await tid(page, 'ai-toggle').click()
    await tid(page, 'ai-panel').getByTestId('critics-open').click()
    await tid(page, 'critics').waitFor()
    await settle(page)
  },
  async jukebox(page) {
    await open(page, NOIR)
    await tid(page, 'jukebox-toggle').click()
    await tid(page, 'jukebox').waitFor()
    await settle(page)
  },
  async mixer(page) {
    await open(page, RESORT)
    await tid(page, 'mixer-toggle').click()
    await tid(page, 'mixer').waitFor()
    await settle(page)
  },
  async library(page) {
    await open(page, NOIR)
    await tid(page, 'library-toggle').click()
    await tid(page, 'library').waitFor()
    await tid(page, 'lib-list').locator('.sp-row').first().waitFor({ timeout: 120_000 })
    await tid(page, 'lib-role-bass').click()
    await settle(page)
  },
  async tagreview(page) {
    await open(page, NOIR)
    await tid(page, 'library-toggle').click()
    await tid(page, 'library').getByTestId('lib-review').click()
    await tid(page, 'tag-review').waitFor()
    await settle(page)
  },
  async keys(page) {
    await open(page, RAG)
    await tid(page, 'keys-toggle').click()
    await tid(page, 'kb-sound').waitFor()
    await settle(page)
  },
  async songs(page) {
    await open(page, NOIR)
    await tid(page, 'song-button').click()
    await tid(page, 'songs-panel').waitFor()
    await settle(page)
  },
  async chords(page) {
    await open(page, NOIR)
    await tid(page, 'tl-chord-5').click()
    await tid(page, 'chord-input').waitFor()
    await settle(page)
  },
}

// Live shots: they ask the LLM (minutes each), so they run only when named:
//   node tools/capture.cjs live            both (the revise shot revises the song the generate made)
//   node tools/capture.cjs live revise     only the revision, of SMS_SONG (default: the newest song)
const LIVE = {
  async generate(page) {
    await open(page, NOIR)
    await tid(page, 'ai-toggle').click()
    const panel = tid(page, 'ai-panel')
    await panel.getByTestId('ai-mode-new').click()
    await panel.getByTestId('prompt').fill('a deep funky groove in C minor with a fat bass and chord stabs')
    await panel.getByTestId('quick-draft').check()
    await panel.getByTestId('generate').click()
    await panel.getByTestId('generate-log').getByText('done:').waitFor({ timeout: 1_500_000 })
    await page.waitForTimeout(3000)
  },
  async revise(page) {
    const songs = await (await page.request.get(`${URL}/api/songs`)).json()
    const song = process.env.SMS_SONG || songs.slice().sort((a, b) => (b.created || '').localeCompare(a.created || ''))[0].name
    await open(page, song)
    await tid(page, 'ai-toggle').click()
    const panel = tid(page, 'ai-panel')
    await panel.getByTestId('revise-input').fill(REVISION)
    await panel.getByTestId('propose').click()
    await panel.getByTestId('proposal').waitFor({ timeout: 900_000 })
    await settle(page)
    await panel.getByTestId('proposal').scrollIntoViewIfNeeded()
  },
}
const REVISION = process.env.SMS_REVISION || 'make the drums busier in both choruses'

;(async () => {
  const want = process.argv.slice(2)
  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: URL, viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'dark' })
  await context.route('**/api/llm', (route) => route.fulfill({ json: LLM }))
  // the shown model is the example's; the request goes to the real server's own default
  const serverDefault = async (route) => {
    const body = route.request().postDataJSON() || {}
    route.continue({ postData: JSON.stringify({ ...body, model: null }) })
  }
  await context.route('**/api/generate', serverDefault)
  await context.route('**/api/songs/*/revise/job', serverDefault)
  // job progress names the model the server used: say the example's there too. The names to
  // replace are whatever the real server offers, read from it, so none is written here.
  const real = await (await fetch(`${URL}/api/llm`)).json().catch(() => ({ models: [] }))
  const names = [real.default, ...(real.models || [])].filter((m) => m && !LLM.models.includes(m))
    .sort((a, b) => b.length - a.length)
  const neutral = (text) => names.reduce((t, m) => t.split(m).join(LLM.default), text)
  await context.routeWebSocket(/\/api\/jobs\/[^/]+\/events$/, (ws) => {
    const server = ws.connectToServer()
    server.onMessage((m) => ws.send(typeof m === 'string' ? neutral(m) : m))
  })
  const live = want.includes('live')
  const all = live ? LIVE : SHOTS
  const words = want.filter((w) => w !== 'live')
  for (const [name, shot] of Object.entries(all)) {
    if (words.length && !words.some((w) => name.includes(w))) continue
    const page = await context.newPage()
    try {
      await shot(page)
      await page.screenshot({ path: path.join(OUT, `${name}.png`) })
      console.log('ok  ', name)
    } catch (e) {
      console.log('FAIL', name, String(e).split('\n')[0])
      await page.screenshot({ path: path.join(__dirname, `_fail-${name}.png`) }).catch(() => {})
    }
    await page.close()
  }
  await browser.close()
})()
