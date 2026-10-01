# TypeScript-only local development and Cloudflare deployment

ZeroMalaria now runs as two TypeScript workspaces:

- `apps/web`: React offline-first PWA.
- `apps/worker`: Cloudflare Worker API with a D1 database.

The PWA performs deterministic RBC triage locally. The Worker handles authentication,
Pindo credentials, referral synchronization, facility status changes, nurse handoff
briefs, and RBC operational aggregates.

## Local setup

From the repository root:

```bash
npm install
npm run db:local
npm run db:seed:local
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
npm run dev
```

Local addresses:

- PWA: `http://localhost:5173` (Vite uses the next free port if occupied).
- Worker API: `http://localhost:8787/api/health`.
- Local D1 state: `apps/worker/.wrangler/state`.

The seeded accounts all use `demo1234`:

- `clarencemutesi`
- `vanessaingabire`
- `augustinshema`

Public Pindo mode needs no token. For authenticated Pindo, set these only in
`apps/worker/.dev.vars`:

```dotenv
PINDO_API_TOKEN=your-real-token
```

A real token automatically selects authenticated mode.

Never use a `VITE_` prefix for private keys because Vite exposes those values to the browser.

## Checks

```bash
npm test
npm run build
```

## First Cloudflare deployment

Authenticate and create the production D1 database:

```bash
npx wrangler login
npx wrangler d1 create zeromalaria
```

Replace `database_id` in `apps/worker/wrangler.jsonc` with the returned ID, then run:

```bash
npx wrangler d1 migrations apply zeromalaria --remote
npx wrangler d1 execute zeromalaria --remote --file=apps/worker/seed.sql
npx wrangler secret put AUTH_SECRET --config apps/worker/wrangler.jsonc
```

For authenticated Pindo:

```bash
npx wrangler secret put PINDO_API_TOKEN --config apps/worker/wrangler.jsonc
```

Finally deploy the built PWA and Worker together:

```bash
npm run deploy
```

Do not deploy real patient data until clinical validation, privacy review, retention
rules, incident response, and Rwanda health-data governance requirements are approved.
