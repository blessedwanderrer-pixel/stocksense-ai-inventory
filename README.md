# StockSense AI Inventory

StockSense is a role-secured inventory system for a shopping mall. It combines a FastAPI backend, a Supabase Postgres ledger, a responsive React dashboard, and a Groq-powered assistant whose factual answers come from authenticated inventory services.

## Capabilities

- Shared Supabase authentication with Manager and Staff roles
- Product catalog and low-stock monitoring
- Append-only stock-in, sale, and damaged-stock movements
- Database-enforced prevention of negative stock
- Inventory summary and date-filtered best-selling reports
- Grounded AI stock queries
- Server-controlled AI stock-action preview, Confirm, and Cancel flow
- Manager-only product management and protected cost data

## Repository layout

- `backend/` — FastAPI application and backend tests
- `frontend/` — React, TypeScript, Vite, TanStack Query, and frontend tests
- `supabase/migrations/` — reproducible database schema and security migrations
- `supabase/seed.development.sql` — idempotent development data seed

## Local configuration

Copy the example files and provide local values without committing them:

```text
backend/.env.example  -> backend/.env
frontend/.env.example -> frontend/.env.local
```

The frontend uses only the Supabase publishable key. Never expose a Supabase secret/service-role key or the Groq API key in frontend configuration.

## Run the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`. Health check: `GET /health`.

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

The development frontend runs at `http://localhost:3000`.

## Verification

Backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Frontend:

```powershell
cd frontend
npm test
npm run lint
npm run build
```

## Security notes

- Authorization is based on the authenticated backend profile, never a client-selected role.
- Staff responses exclude protected cost information.
- Stock changes use database triggers and an append-only movement ledger.
- Groq has no direct database-write capability.
- AI-generated stock changes require explicit server-side confirmation and execute exactly once.
