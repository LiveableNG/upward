
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteerPath = require.resolve('puppeteer-core', { paths: ['./server/apps/api', process.cwd()] });
const puppeteer = require(puppeteerPath);
const chromiumPath = require.resolve('@sparticuz/chromium', { paths: ['./server/apps/api', process.cwd()] });
const chromium = require(chromiumPath);

// Config & Credentials
const AUTH_TOKEN = process.env.TWITTER_AUTH_TOKEN || '';
const CT0 = process.env.TWITTER_CT0 || '';

const SEARCH_QUERY =
  '("house rent" OR "pay rent" OR "rent is due" OR "rent wahala" OR "rent increase") lang:en';
const TARGET_URL = `https://x.com/search?q=${encodeURIComponent(SEARCH_QUERY)}&f=live`;

const NIGERIAN_GEO_REGEX =
  /\b(nigeria|nigerian|lagos|abuja|ibadan|port[\s-]harcourt|phc|enugu|benin|warri|kano|abeokuta|ilorin|asaba|uyo|calabar|owerri|ng)\b/i;

const SLANG_REGEX =
  /\b(wahala|shege|naira|kobo|na\s+so|wetin|japa|carry\s+rent|don\s+due|hustle|lasan)\b/i;

function isLikelyNigerian(text = '', location = '') {
  const locStr = typeof location === 'string' ? location : '';
  const textStr = typeof text === 'string' ? text : '';

  const hasGeo = NIGERIAN_GEO_REGEX.test(locStr);
  const hasSlang = SLANG_REGEX.test(textStr);

  return hasGeo || hasSlang;
}

let savedSample = false;

function findValueByKey(obj, targetKey) {
  if (!obj || typeof obj !== 'object') return null;
  if (targetKey in obj && obj[targetKey]) return obj[targetKey];
  for (const key of Object.keys(obj)) {
    const res = findValueByKey(obj[key], targetKey);
    if (res) return res;
  }
  return null;
}

function parseSearchTimelineResponse(json) {
  const extracted = [];
  try {
    const instructions =
      json?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions || [];

    for (const instruction of instructions) {
      const entries = instruction?.entries || [];
      for (const entry of entries) {
        const itemContent = entry?.content?.itemContent;
        const tweetResult = itemContent?.tweet_results?.result;
        if (!tweetResult) continue;

        // Handle normal tweets and tweetWithVisibilityResults wrappers
        const tweetData = tweetResult?.tweet || tweetResult;
        const legacy = tweetData?.legacy;
        if (!legacy || !legacy.id_str) continue;

        const userResult = tweetData?.core?.user_results?.result || tweetResult?.core?.user_results?.result;

        const tweetId = legacy.id_str;
        const content = legacy.full_text || '';
        const authorUsername = userResult?.core?.screen_name || userResult?.legacy?.screen_name || findValueByKey(userResult, 'screen_name') || '';
        const authorName = userResult?.core?.name || userResult?.legacy?.name || findValueByKey(userResult, 'name') || '';
        const rawLoc = userResult?.location?.location ?? userResult?.location ?? userResult?.legacy?.location ?? '';
        const authorLocation = typeof rawLoc === 'string' ? rawLoc : (rawLoc?.location || '');
        const tweetCreatedAt = legacy.created_at || '';

        extracted.push({
          tweetId,
          content,
          tweetUrl: `https://x.com/${authorUsername}/status/${tweetId}`,
          author: {
            username: authorUsername,
            name: authorName,
            location: authorLocation,
          },
          tweetCreatedAt: new Date(tweetCreatedAt).toISOString(),
          isNigerianCandidate: isLikelyNigerian(content, authorLocation),
        });
      }
    }
  } catch (err) {
    console.error('Error parsing timeline JSON:', err.message);
  }
  return extracted;
}

async function run() {
  console.log('🚀 Initializing Twitter/X Rent Lead Scraper Prototype...');

  if (!AUTH_TOKEN || !CT0) {
    console.warn('\n⚠️  WARNING: TWITTER_AUTH_TOKEN and/or TWITTER_CT0 are not set.');
    console.warn('   To run authenticated with your burner account:');
    console.warn('   export TWITTER_AUTH_TOKEN="your_token"');
    console.warn('   export TWITTER_CT0="your_ct0"');
    console.warn('   node scripts/scrape-twitter-rent-leads.mjs\n');
  }

  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  // Inject session cookies if provided
  if (AUTH_TOKEN && CT0) {
    await page.setCookie(
      {
        name: 'auth_token',
        value: AUTH_TOKEN,
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true,
      },
      {
        name: 'ct0',
        value: CT0,
        domain: '.x.com',
        path: '/',
        secure: true,
      },
      {
        name: 'auth_token',
        value: AUTH_TOKEN,
        domain: '.twitter.com',
        path: '/',
        httpOnly: true,
        secure: true,
      },
      {
        name: 'ct0',
        value: CT0,
        domain: '.twitter.com',
        path: '/',
        secure: true,
      }
    );
    console.log('✅ Injected auth_token & ct0 session cookies.');
  }

  const capturedTweets = new Map();

  // Intercept X internal GraphQL SearchTimeline responses
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/SearchTimeline') && response.ok()) {
      try {
        const json = await response.json();
        const tweets = parseSearchTimelineResponse(json);
        console.log(`📡 Intercepted SearchTimeline response: parsed ${tweets.length} tweets.`);
        for (const t of tweets) {
          if (!capturedTweets.has(t.tweetId)) {
            capturedTweets.set(t.tweetId, t);
          }
        }
      } catch (err) {
        console.error('Error in SearchTimeline handler:', err.message);
      }
    } else if (url.includes('/graphql/') && response.ok()) {
      const endpoint = url.split('/graphql/')[1]?.split('?')[0] || '';
      console.log(`🔍 Intercepted GraphQL query: ${endpoint}`);
    }
  });

  console.log(`🌐 Navigating to query: ${TARGET_URL}`);
  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 18000 });
  } catch {
    // Normal for SPA with streaming sockets
  }

  // Perform 4 gentle scrolls to trigger pagination
  for (let i = 1; i <= 4; i++) {
    console.log(`📜 Scrolling page down (batch ${i}/4)...`);
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
    // Randomized human delay: 2500ms - 4000ms
    const delay = 2500 + Math.floor(Math.random() * 1500);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  await browser.close();

  const results = Array.from(capturedTweets.values());
  const nigerianCandidates = results.filter((r) => r.isNigerianCandidate);

  console.log('\n================ SCRAPE SUMMARY ================');
  console.log(`Total Unique Tweets Captured: ${results.length}`);
  console.log(`Nigerian Candidates:          ${nigerianCandidates.length}`);
  console.log('================================================\n');

  if (nigerianCandidates.length > 0) {
    console.log('Sample Candidate Tweet:');
    console.log(JSON.stringify(nigerianCandidates[0], null, 2));
  }

  const outDir = path.resolve(process.cwd(), 'scratch');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'scraped-rent-leads.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`💾 Saved all captured results to: ${outFile}`);
}

run().catch((err) => {
  console.error('Fatal error during scrape run:', err);
  process.exit(1);
});
