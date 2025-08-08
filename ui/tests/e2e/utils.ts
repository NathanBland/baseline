import { Page } from '@playwright/test';

/**
 * Utility functions for Playwright tests
 */

export interface TestUser {
  email: string;
  password: string;
  username: string;
}

export const DEFAULT_TEST_USER: TestUser = {
  email: 'playwright-test@example.com',
  password: 'TestPassword123!',
  username: 'playwrightuser'
};

/**
 * Wait for WebSocket connection to be established
 */
export async function waitForWebSocketConnection(page: Page, timeout = 10000) {
  console.log('🔌 Waiting for WebSocket connection...');
  
  // Wait for WebSocket connection logs or connection indicator
  await page.waitForFunction(
    () => {
      // Check if WebSocket service is connected
      const w = window as unknown as { webSocketService?: { isConnected: () => boolean } };
      return w.webSocketService?.isConnected() === true;
    },
    { timeout }
  );
  
  console.log('✅ WebSocket connected');
}

/**
 * Wait for a specific number of messages to appear
 */
export async function waitForMessageCount(page: Page, count: number, timeout = 10000) {
  console.log(`📊 Waiting for ${count} messages...`);
  
  await page.waitForFunction(
    (expectedCount) => {
      const messages = document.querySelectorAll('.message, [data-testid="message"]');
      return messages.length >= expectedCount;
    },
    count,
    { timeout }
  );
  
  console.log(`✅ Found ${count} messages`);
}

/**
 * Clear browser data between tests
 */
export async function clearBrowserData(page: Page) {
  console.log('🧹 Clearing browser data...');
  
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Clear any IndexedDB data if used
    if ('indexedDB' in window) {
      // Note: This is a simplified clear - real implementation might need more
      indexedDB.databases?.().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
  });
  
  await page.context().clearCookies();
  console.log('✅ Browser data cleared');
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeTestScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
}

/**
 * Wait for network requests to settle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  console.log('🌐 Waiting for network to be idle...');
  await page.waitForLoadState('networkidle', { timeout });
  console.log('✅ Network is idle');
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Should not reach here');
}

/**
 * Generate unique test data to avoid conflicts
 */
export function generateTestUser(prefix = 'test'): TestUser {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return {
    email: `${prefix}-${timestamp}-${random}@example.com`,
    password: 'TestPassword123!',
    username: `${prefix}user${timestamp}${random}`
  };
}

/**
 * Wait for element to be stable (not moving/changing)
 */
export async function waitForElementToBeStable(page: Page, selector: string, timeout = 5000) {
  console.log(`⏸️  Waiting for element to be stable: ${selector}`);
  
  await page.waitForSelector(selector, { timeout });
  
  // Wait for element to stop moving/changing
  let previousRect = await page.locator(selector).boundingBox();
  let stableCount = 0;
  const requiredStableChecks = 3;
  
  while (stableCount < requiredStableChecks) {
    await page.waitForTimeout(100);
    const currentRect = await page.locator(selector).boundingBox();
    
    if (
      previousRect &&
      currentRect &&
      previousRect.x === currentRect.x &&
      previousRect.y === currentRect.y &&
      previousRect.width === currentRect.width &&
      previousRect.height === currentRect.height
    ) {
      stableCount++;
    } else {
      stableCount = 0;
    }
    
    previousRect = currentRect;
  }
  
  console.log('✅ Element is stable');
}
