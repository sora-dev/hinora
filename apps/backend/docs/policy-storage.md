# Policy PDF storage (Supabase)

Policy files are stored in **Supabase Storage**, not on the Railway/local disk.

## Setup

1. In the Supabase dashboard, open **Storage** and ensure a private bucket named `policies` exists  
   (the API also tries to create it on boot when credentials are set).
2. Set these env vars on Railway and in `apps/backend/.env`:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Use the **service_role** key (server only). Never expose it to the Next.js/Vercel app.

3. Restart the backend after setting the variables.

## How it works

- Upload: `POST /policies/upload` stores the PDF in the `policies` bucket and saves `filePath` as `storage:<objectKey>` in Postgres.
- Read: the policy reader loads `GET /policies/:id/file`, which redirects to a short-lived signed URL.

## Existing policies uploaded before this change

Rows that still have `filePath` like `/uploads/policies/...` only work if that file exists on the server disk. On Railway/Vercel they will 404 until you **re-upload** those PDFs from Admin → Policy Management.

There is no automatic migration of old local files unless you still have the `uploads/policies` folder and run a custom import.
