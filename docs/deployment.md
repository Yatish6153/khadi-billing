# Going live (Phase 8)

```
Phone / PC browser ──▶ Vercel (frontend, Next.js) ──/api/*──▶ Render (backend, Express) ──▶ Supabase (PostgreSQL)
```

| Part     | Host     | Plan | Notes |
| -------- | -------- | ---- | ----- |
| Code     | GitHub (`Yatish6153/khadi-billing`, **private**) | Free | `.env` files are never uploaded |
| Database | Supabase | Free | Use the **Session pooler** connection string (port 5432) |
| Backend  | Render (`render.yaml`) | Free | Sleeps after 15 min idle; first request then takes ~50 s |
| Frontend | Vercel, root directory `frontend` | Free | Env `BACKEND_URL` = Render URL |

## Environment variables

**Render (backend)**

| Key | Value |
| --- | ----- |
| `DATABASE_URL` | Supabase Session pooler string, password URL-encoded (`@` → `%40`) |
| `FRONTEND_URL` | `https://<project>.vercel.app` |
| `JWT_SECRET` | generated automatically by the blueprint |
| `NODE_ENV` | `production` (blueprint) |

**Vercel (frontend)**

| Key | Value |
| --- | ----- |
| `BACKEND_URL` | `https://khadi-billing-api.onrender.com` (the Render service URL) |

## Moving the shop's data

The local database (Prisma Dev on the shop PC) is copied once into Supabase with
`backend/scripts/copy-to-cloud.ts` after the cloud database has its tables
(`npx prisma migrate deploy`). After that, use only the live link.

## Known limits on the free plans

- **Product photos** are stored on the Render server's disk, which is wiped on every redeploy.
  Move uploads to Supabase Storage before relying on photos.
- Render's free server sleeps when unused; the first page load after a quiet period is slow.
  Railway (~$5/month) or Render's paid plan avoids this.
