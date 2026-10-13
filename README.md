This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Volunteer sign-in (Supabase magic links)

Volunteers sign in with a one-time email link; there are no passwords. The flow:

1. `/sign-in` calls `signInWithOtp` (rate limited to 3 links per email per 10 minutes, stored hashed in `SignInAttempt`).
2. The email links to `/auth/confirm`, which calls `verifyOtp` with the `token_hash`.
3. New volunteers (no `Profile` row) go to `/onboarding`; everyone else to the `next` path or `/course`.

`src/proxy.ts` refreshes the session on every request and sends signed-out visitors on `/course/**` and `/onboarding` to `/sign-in?next=<path>`. In server code, use `getCurrentUser()` and `requireVolunteer()` from `src/lib/auth.ts`.

One-time Supabase dashboard setup:

- **Authentication → URL Configuration**: set Site URL to `SITE_URL`, and add `<SITE_URL>/auth/confirm**` and `http://localhost:3000/auth/confirm**` to Redirect URLs.
- **Authentication → Email Templates**: in both **Magic Link** and **Confirm signup**, change the link to:
  ```html
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email"
    >Sign in to KC Volunteers</a
  >
  ```
  (`RedirectTo` already contains `/auth/confirm?next=…`.) This lets links work even when opened in a different browser from the one that requested them. With the default template, links still work but only in the same browser.
- **Authentication → Emails → SMTP**: configure a custom SMTP provider. Supabase's built-in sender is heavily rate limited and only meant for testing.

## Security

All data access goes through the server: route handlers and server code query Postgres via Prisma ([src/lib/prisma.ts](src/lib/prisma.ts)). The browser never talks to the database directly.

Supabase also exposes the `public` schema through its Data API, which anyone holding the anon key could call. To close that off, the `lock_down_supabase_api` migration:

- enables Row Level Security on every table with **no policies**, so API queries see zero rows, and
- revokes all privileges (current and default) on those tables from the `anon` and `authenticated` roles.

Prisma connects as the table owner, which bypasses RLS, so the app is unaffected.

Run `pnpm db:check-rls` after migrating to confirm the anon key is denied on every table. New tables need RLS enabled in their migration too, or rerun the lock-down loop.
