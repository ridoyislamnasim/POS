# POS Frontend (Next.js)

Standalone UI. Port **3020**. No Prisma. Calls the backend over HTTP.

```bash
cd frontend
pnpm install
# .env দেখো (both REQUIRED): NEXT_PUBLIC_APP_ENV=local|production, NEXT_PUBLIC_API_URL=http://localhost:4000 (backend-এর একমাত্র source)
# env বদলালে `npm run dev` restart দাও (NEXT_PUBLIC_* start-time এ bake হয়)
pnpm dev
```

Open http://localhost:3020
# POS
