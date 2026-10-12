# Clientra

Clientra is a full-stack customer relationship manager for organizing customers, sales deals, and follow-up tasks. It includes authenticated, user-scoped data; a dashboard backed by MongoDB aggregation; and a deal pipeline grouped by stage.

## Technology stack

- Frontend: React, TypeScript, Vite, React Router, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: MongoDB with Mongoose
- Validation: Zod
- Authentication: bcrypt password hashing and JWT in an httpOnly cookie
- Hosting configuration: Vercel (frontend) and Render (backend)

## Demo login

The login page displays demo credentials directly so that reviewers and team leads can access the application immediately.

| Field | Value |
|---|---|
| Email | `demo@clientra.app` |
| Password | `Clientra@123` |

A **Copy Credentials** button on the login page copies both values to the clipboard at once.

> **Note:** Production login works only after the demo account has been seeded against the correct database. See [Seed the demo account](#seed-the-demo-account) below.

## Local setup

### Prerequisites

- Node.js and npm
- A MongoDB connection string (MongoDB Atlas or a local instance)

### Backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Open `backend/.env` and fill in the required variables:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/mini-crm
JWT_SECRET=replace-with-a-long-random-string
CLIENT_URL=http://localhost:5173
DEMO_PASSWORD=Clientra@123
```

> `DEMO_PASSWORD` must match the password displayed on the login page. Set it here before running the seed script. Do not commit this file — `.gitignore` already excludes `.env`.

Start the backend:

```powershell
npm run dev
```

The API listens on the `PORT` configured in `backend/.env` (default: `4000`; the checked-in example sets it to `5000`).

### Frontend

In a separate terminal:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
```

Open `frontend/.env` and set the backend origin:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```powershell
npm run dev
```

The Vite dev server runs on `http://localhost:5173` by default.

### Seed the demo account

With `MONGO_URI` and `DEMO_PASSWORD` set in `backend/.env`, run the seed script from the `backend` directory:

```powershell
cd backend
npm run seed:demo
```

This is equivalent to running `npx tsx src/scripts/seed-demo.ts` directly. What the script does:

- Creates or updates the `demo@clientra.app` user with a bcrypt hash of `DEMO_PASSWORD`.
- Upserts sample customers, deals, and tasks owned by that account.
- Does **not** delete or modify records belonging to other users.
- Is safe to re-run; subsequent runs reset the demo user's password and refresh its sample data.

Setting `DEMO_PASSWORD` alone does not create the account. You must run the seed script for the account to exist in the database.

Read `backend/src/scripts/seed-demo.ts` before running it against a production database to confirm it targets only the intended records.

## Environment variables

| Variable | Service | Required | Purpose |
|---|---|---:|---|
| `MONGO_URI` | Backend | Yes | MongoDB connection string |
| `JWT_SECRET` | Backend | Yes | Secret used to sign authentication tokens |
| `DEMO_PASSWORD` | Backend (seeding only) | Yes, for seeding | Password for the demo account; must match the value displayed on the login page |
| `CLIENT_URL` | Backend | Optional on initial deploy | Exact frontend origin allowed by the CORS policy; when unset, backend starts but blocks browser origins |
| `NODE_ENV` | Backend | No | Runtime mode; set to `production` on the live server |
| `PORT` | Backend | No | HTTP listening port; hosting platforms may provide this automatically |
| `MONGO_DNS_SERVERS` | Backend | No | Optional comma-separated DNS resolvers for MongoDB SRV lookup |
| `VITE_API_URL` | Frontend | Yes | Backend API origin used when building the frontend |

**Security rules:**

- Never commit `.env` files. The `.gitignore` excludes them already.
- Never put `DEMO_PASSWORD`, `MONGO_URI`, or `JWT_SECRET` in frontend environment variables (`VITE_*`). Anything prefixed with `VITE_` is embedded in the browser bundle.
- Do not log `DEMO_PASSWORD` in application output or scripts.

## API endpoints

All endpoints are prefixed with `/api`. Customer, deal, task, and dashboard endpoints require an authenticated httpOnly cookie, except where noted.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | API health check |
| `POST` | `/api/auth/register` | Register an account (rate limited) |
| `POST` | `/api/auth/login` | Authenticate and set the cookie (rate limited) |
| `POST` | `/api/auth/logout` | Clear the authentication cookie |
| `GET` | `/api/auth/me` | Return the current authenticated user |
| `POST` | `/api/customers` | Create a customer |
| `GET` | `/api/customers` | List customers; supports `search`, `status`, `page`, and `limit` query parameters |
| `GET` | `/api/customers/:id` | Get a customer and its related deals/tasks |
| `PATCH` | `/api/customers/:id` | Update a customer |
| `DELETE` | `/api/customers/:id` | Delete a customer |
| `POST` | `/api/deals` | Create a deal |
| `GET` | `/api/deals` | List deals; supports the `stage` query parameter |
| `GET` | `/api/deals/:id` | Get a deal |
| `PATCH` | `/api/deals/:id` | Update a deal, including its pipeline stage |
| `DELETE` | `/api/deals/:id` | Delete a deal |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks` | List tasks |
| `GET` | `/api/tasks/:id` | Get a task |
| `PATCH` | `/api/tasks/:id` | Update task fields or completion |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `GET` | `/api/dashboard` | Get user-scoped dashboard metrics and pipeline values by stage |

There is no password-reset endpoint in the current application.

## Deployment

### Overview

| Service | Platform | Configuration |
|---|---|---|
| Frontend | Vercel | Set project root to `frontend`; `frontend/vercel.json` rewrites all paths to the SPA entry point |
| Backend | Render | Blueprint defined in `render.yaml`; supply secrets in Render dashboard |

### Frontend — Vercel

1. Import the repository in Vercel.
2. Set the **Project Root** to `frontend`.
3. Add the environment variable `VITE_API_URL` pointing to the deployed backend origin (e.g. `https://mini-crm-api.onrender.com`).
4. Deploy. The `frontend/vercel.json` rewrite handles all SPA routes.

### Backend — Render

1. Create a new **Blueprint** deployment in Render from `render.yaml`.
2. In the initial Blueprint setup form, supply the required secrets:

   | Variable | Value |
   |---|---|
   | `MONGO_URI` | Your MongoDB Atlas connection string |
   | `JWT_SECRET` | A long random secret (e.g. output of `openssl rand -hex 32`) |

   > `CLIENT_URL` is optional on initial deployment. The backend starts and passes health checks without it. Once you deploy the frontend to Vercel and know its URL, add `CLIENT_URL` in the Render dashboard under **Environment** (e.g. `https://your-crm.vercel.app`) to enable browser access.

3. Deploy and confirm `GET /api/health` returns `200`.

### Production demo setup

After the backend is deployed and healthy:

1. Add `DEMO_PASSWORD=Clientra@123` to the backend environment in the Render dashboard (under **Environment**). This value must match what the login page displays.
2. Confirm `MONGO_URI` points to the intended Atlas database (not a local instance).
3. Run the seed script. The safest method is to use the Render **Shell** tab for the backend service:

   ```bash
   npm run seed:demo
   ```

   Alternatively, run it locally with `MONGO_URI` pointed at the production Atlas cluster and `DEMO_PASSWORD` set:

   ```powershell
   # backend/.env temporarily contains the production MONGO_URI and DEMO_PASSWORD
   cd backend
   npm run seed:demo
   ```

   > Review `backend/src/scripts/seed-demo.ts` before running against production. The script only upserts the demo user's own records and does not touch other users' data.

4. Open the deployed frontend URL and sign in with `demo@clientra.app` / `Clientra@123`.
5. Confirm the dashboard metrics and pipeline chart load correctly.

> **Production login status:** The demo account has not been seeded or verified against a live deployment as part of this repository. Complete the steps above to enable it.

## Checks

Run backend checks from `backend/`:

```powershell
npm test
npm run build
npm run lint
```

Run frontend checks from `frontend/`:

```powershell
npm run build
npm run lint
```

## Troubleshooting

**Demo login returns "Email or password is incorrect"**
The demo account has not been seeded yet, or it was seeded against a different database. Confirm `MONGO_URI` points to the correct Atlas cluster, then run `npm run seed:demo` from `backend/`.

**Login page password does not work despite seeding**
`DEMO_PASSWORD` at seed time must exactly match the password shown on the login page (`Clientra@123`). If the account was seeded with a different value, re-run `npm run seed:demo` after correcting `DEMO_PASSWORD` in the backend environment.

**Seed script exits with "DEMO_PASSWORD environment variable is required"**
`DEMO_PASSWORD` is not set in `backend/.env` (local) or the Render environment (production). Add it before running the seed script.

**API requests return CORS errors in the browser**
`CLIENT_URL` in the backend environment does not match the exact origin of the frontend (including the scheme and port). Update `CLIENT_URL` to match (e.g. `https://your-app.vercel.app`) and redeploy the backend.

**Frontend shows a blank page after navigating directly to a route**
The Vercel rewrite in `frontend/vercel.json` must be present and the Vercel project root must be set to `frontend`. Confirm the rewrite is deployed via the Vercel dashboard.

**Dashboard loads but shows zeros**
The demo account exists but the seed data was not created, or the account is connected to an empty database. Re-run `npm run seed:demo` to populate customers, deals, and tasks.
