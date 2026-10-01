# StockSense frontend

Responsive React and TypeScript client for the StockSense inventory backend.

## Configuration

Copy `.env.example` to `.env.local` and set:

- `VITE_API_BASE_URL` — FastAPI base URL
- `VITE_SUPABASE_URL` — StockSense Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — browser-safe publishable key

Never put Groq, Supabase secret, or service-role keys in frontend environment variables.

## Commands

```powershell
npm install
npm run dev
npm test
npm run lint
npm run build
```

Authentication is handled by Supabase, while the authenticated FastAPI `GET /api/me` response is the source of truth for Manager/Staff routing and permissions.
