// TypeScript definitions for window.ENV
export interface ENV {
  API_URL: string;
  WS_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
}

declare global {
  interface Window {
    ENV: ENV;
  }
}

export {};
