import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Global teardown: Cleaning up after Playwright tests...');
  
  // You can add global cleanup logic here, such as:
  // - Database cleanup
  // - Removing test data
  // - Stopping external services
  
  console.log('✅ Global teardown complete');
}

export default globalTeardown;
