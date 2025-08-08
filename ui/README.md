# Welcome to Remix!

- 📖 [Remix docs](https://remix.run/docs)

## Development

Run the dev server:

```sh
npm run dev
```

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

## Repository specifics

### Scripts

- `npm run dev` — Remix Vite dev server.
- `npm run build` — Build server and client bundles.
- `npm start` — Serve built app in production.
- `npm test` — Vitest (unit/integration), excludes e2e.
- `npm run test:watch` — Vitest watch mode.
- `npm run test:coverage` — Vitest with coverage.
- `npm run test:e2e` — Playwright e2e tests.
- `npm run lint` / `npm run lint:fix` — ESLint.
- `npm run format` — Prettier format.
- `npm run typecheck` — TypeScript.

### Ports

- Dev UI: `5173` (http://localhost:5173)
- Dev API: `3000` (http://localhost:3000)
- Docker dev: UI `5173`, API `3000` (see `docker-compose.yml`)
- Docker prod: UI `3000`, API `3001` (see `docker-compose.prod.yml`)

### Environment variables

The UI reads runtime env via `process.env` and injects them in `root.tsx`.

Create `ui/.env.local` (copied from `.env.example`) and set:

```bash
API_URL=http://localhost:3000
WS_URL=ws://localhost:3000
```

When running with Docker compose (dev), UI talks to API via service DNS:

```yaml
API_URL: http://api:3000
WS_URL: ws://api:3000
```

In production (compose):

```yaml
API_URL: https://baseline-api.aqueous.network
WS_URL: wss://baseline-api.aqueous.network
```

### Testing

- Unit/integration: `npm test` or `npm run test:watch`
- Coverage: `npm run test:coverage`
- E2E: `npm run test:e2e` (requires server running)

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
