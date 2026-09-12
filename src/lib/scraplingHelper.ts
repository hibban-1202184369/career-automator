/**
 * Scrapling-inspired Adaptive Fetching & Stealth for Puppeteer
 * Ported key concepts from https://github.com/D4Vinci/Scrapling
 * - AutoThrottle, adaptive headers, random delays
 */

export function getScraplingHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const UA_POOL = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  ];
  return {
    'User-Agent': UA_POOL[Math.floor(Math.random() * UA_POOL.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    ...extra,
  };
}

export class ScraplingAdaptiveFetcher {
  private requestCount = 0;
  private lastRequestTime = 0;
  private baseDelay = 1500;

  async throttle() {
    const elapsed = Date.now() - this.lastRequestTime;
    const adaptiveDelay = this.baseDelay + Math.random() * 2000 + this.requestCount * 100;
    if (elapsed < adaptiveDelay) {
      await new Promise(r => setTimeout(r, adaptiveDelay - elapsed));
    }
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  async stealthPageSetup(page: any) {
    // Scrapling-inspired stealth: random viewport, webdriver hiding
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // @ts-ignore
      window.chrome = { runtime: {} };
    });
    await page.setExtraHTTPHeaders(getScraplingHeaders());
  }

  recordResponse(status: number, timeMs: number) {
    // AutoThrottle: increase delay on throttle/429
    if (status === 429 || status === 503) {
      this.baseDelay = Math.min(this.baseDelay * 1.5, 10000);
    } else if (status === 200 && timeMs < 500) {
      this.baseDelay = Math.max(this.baseDelay * 0.9, 800);
    }
  }
}
