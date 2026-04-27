# Docker Local Testing

Flowra can run locally with Docker Compose using production-style frontend and backend builds.

## Start

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

The local compose stack seeds one tenant automatically:

- Tenant ID: `local-tenant`
- API key: `local-flowra-key`

The frontend image is built with `NEXT_PUBLIC_API_URL=http://localhost:8080` and `NEXT_PUBLIC_API_KEY=local-flowra-key`, matching `config/frontend.env`.
The backend allows browser requests from `http://localhost:3000` through `CORS_ALLOWED_ORIGINS` in `config/backend.env`.

## Quick API Check

```bash
curl -H "X-API-Key: local-flowra-key" http://localhost:8080/collections
```

## Reset Local Data

```bash
docker compose down -v
```

## Configuration

Local-only defaults live in:

- `config/backend.env`
- `config/frontend.env`

Change the seeded API key in both files, and in the frontend Docker build args in `docker-compose.yml`, if you want a different local key.

When running outside Docker, copy:

- `backend/.env.example` to `backend/.env`
- `frontend/.env.example` to `frontend/.env.local`

The frontend also falls back to `http://localhost:8080` and `local-flowra-key` during local development, so the default backend connection works even before creating `.env.local`.
