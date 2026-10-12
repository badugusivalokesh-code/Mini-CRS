# Clientra

Clientra is a full-stack customer relationship manager for organizing customers, sales deals, and follow-up tasks. It includes authenticated, user-scoped data; a dashboard backed by MongoDB aggregation; and a deal pipeline grouped by stage.

## Technology stack

- Frontend: React, TypeScript, Vite, React Router, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: MongoDB with Mongoose
- Validation: Zod
- Authentication: bcrypt password hashing and JWT in an httpOnly cookie
- Hosting configuration: Vercel (frontend) and Render (backend)

## Local setup

### Prerequisites

- Node.js and npm
- A MongoDB connection string

### Backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Set `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL` in `backend/.env`. For local development, the frontend URL is usually `http://localhost:5173`.

```powershell
npm run dev
```

The API listens on the configured `PORT` (default: `4000`; the checked-in backend environment example sets it to `5000`).

### Frontend

In another terminal:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
```

Set `VITE_API_URL` in `frontend/.env` to the backend API origin, then run:

```powershell
npm run dev
```

### Seed demo data

With the required backend settings (`MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL`) and a private `DEMO_PASSWORD` configured:

```powershell
cd backend
npm run seed:demo
```

The seed script creates or updates the demo user and upserts its known sample customers, deals, and tasks using the application's Mongoose models. Rerunning it does not delete unrelated records. It resets the dedicated demo account password to the value of `DEMO_PASSWORD` and reports record counts without printing credentials. Demo credentials for any deployed environment must be distributed securely out of band.

## Environment variables

| Variable | Service | Required | Purpose |
|---|---|---:|---|
| `MONGO_URI` | Backend | Yes | MongoDB connection string |
| `JWT_SECRET` | Backend | Yes | Secret used to sign authentication tokens |
| `DEMO_PASSWORD` | Backend seeding only | Yes, for seeding | Private password for the seeded demo user; do not commit or log it |
| `CLIENT_URL` | Backend | Yes | Exact frontend origin allowed by the CORS policy |
| `NODE_ENV` | Backend | No | Runtime mode; set to `production` on the live server |
| `PORT` | Backend | No | HTTP listening port; hosting platforms may provide this |
| `MONGO_DNS_SERVERS` | Backend | No | Optional comma-separated DNS resolvers for MongoDB SRV lookup |
| `VITE_API_URL` | Frontend | Yes | Backend API origin used when building the frontend |

Never commit `.env` files or put production secrets in frontend variables.

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

Deployment has not been completed or verified. No live URLs are available yet.

| Service | Platform/configuration | Live URL |
|---|---|---|
| Frontend | Vercel; set the project root to `frontend`. `frontend/vercel.json` rewrites application paths to the SPA entry point. | Not deployed |
| Backend | Render blueprint in `render.yaml`; supply `MONGO_URI`, `JWT_SECRET`, and the deployed frontend `CLIENT_URL` in Render. | Not deployed |

For Vercel, import the repository, set the project root to `frontend`, configure `VITE_API_URL` to the deployed backend origin, and deploy. The checked-in rewrite serves the SPA entry point for nested frontend routes. For Render, create a Blueprint deployment from `render.yaml`, set `MONGO_URI`, `JWT_SECRET`, and the exact deployed frontend origin for `CLIENT_URL`, then deploy and confirm `/api/health` responds. Keep `NODE_ENV=production` on the backend. To seed a demo deployment, configure `DEMO_PASSWORD` privately in the backend environment before explicitly running the seed command; share any demo credentials securely rather than committing them here.

### Demo login

The login page identifies `demo@clientra.app` but does not embed its password. Set `DEMO_PASSWORD` privately before seeding; each seed run updates the dedicated demo user's password to that configured value. No live demo account has been seeded or verified; distribute any deployed password securely out of band.

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
