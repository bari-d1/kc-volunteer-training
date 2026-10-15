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

## Sample data

`pnpm db:seed` loads the onboarding course (12 modules with sample blocks), branches and teams, placeholder leaders, site settings and five quiz questions. It's safe to rerun: records are matched by slug, key or name and only created when missing, so it never duplicates rows or overwrites admin edits, and blocks are only added to modules that have none. Every block, setting and question is validated against the app's Zod schemas first (`prisma/seed-data.ts`), and the seed stops before writing anything if one is invalid.

## Data access

Pages, server actions, route handlers and components never import Prisma; ESLint enforces this. They call server-only functions in `src/server/`:

- `courses.ts` and `progress.ts`: volunteer reads and writes. They take a `VolunteerId`, which only `requireVolunteer()` produces, so a profile id from a form or URL won't typecheck. Writes re-check the unlock rules (`unlock.ts`), and knowledge checks are graded on the server; answers are stripped from blocks sent to volunteers.
- `profiles.ts`, `health.ts`: onboarding and the health check.
- `admin/*.ts`: admin reads and writes. Each calls `requireAdmin()` first (a test checks every export) and logs writes to `ContentChange`.

## Volunteer sign-in (Supabase magic links)

Volunteers sign in with a one-time email link; there are no passwords. The flow:

1. `/sign-in` calls `signInWithOtp` (rate limited to 3 links per email per 10 minutes, stored hashed in `SignInAttempt`).
2. The email links to `/auth/confirm`, which calls `verifyOtp` with the `token_hash`.
3. New volunteers (no `Profile` row) go to `/onboarding`; everyone else to the `next` path or `/course`.

`src/proxy.ts` refreshes the session on every request and sends signed-out visitors on `/course/**` and `/onboarding` to `/sign-in?next=<path>`. In server code, use `getCurrentUser()` and `requireVolunteer()` from `src/lib/auth.ts`.

Supabase's auth settings (site URL, redirect URLs, email templates) are applied by `pnpm auth:configure`; see below.

## Supabase Auth setup

`pnpm auth:configure` sets this project's Supabase Auth config through the Management API, so it's repeatable rather than clicked by hand. It:

- keeps email sign-in on and requires email confirmation (no auto-confirm),
- sets the Site URL to `SITE_URL` (default `http://localhost:3000`),
- adds `SITE_URL/**` and `http://localhost:3000/**` to the redirect allow list, keeping existing entries,
- sets the KC sign-in email (subject and template) and uses it for "Confirm signup" too, since first-time volunteers get that one. The email has a **Sign in** button (the `token_hash` link to `/auth/confirm`) and a **6-digit code** to type on another device,
- makes codes 6 digits and links and codes valid for 15 minutes,
- raises the project-wide limit to 100 sign-in emails an hour (Supabase's default is 2). The app's own limit of 3 links per email every 10 minutes still applies,
- when `RESEND_API_KEY` is set, sends auth emails through Resend's SMTP (`smtp.resend.com`, port 465, user `resend`, the API key as the password), from `EMAIL_FROM` with the sender name "KC Volunteers".

It fetches the current config, prints what will change (the SMTP password always shows as "set (hidden)"), then applies it.

**Locally**

1. Create a personal access token at <https://supabase.com/dashboard/account/tokens> and add it to `.env` as `SUPABASE_ACCESS_TOKEN`. It can manage every project on your account, so keep it out of git and out of your hosting provider's env vars. `SUPABASE_PROJECT_REF` is optional; it defaults to the ref in `NEXT_PUBLIC_SUPABASE_URL`.
2. For Resend, add `RESEND_API_KEY` (a sending-access key is enough) and `EMAIL_FROM`, a bare address on a domain verified in Resend, for example `EMAIL_FROM="volunteers@yourdomain.org"`.
3. `pnpm auth:configure --dry-run` to see the changes, then `pnpm auth:configure` to apply.

**At launch**, run it again against the production project with the real domain:

```bash
SITE_URL=https://volunteers.yourdomain.org pnpm auth:configure --dry-run
SITE_URL=https://volunteers.yourdomain.org pnpm auth:configure
```

**Flags**

| Flag                     | Does                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--dry-run`              | Shows the changes without applying them.                                                                                                                 |
| `--update-smtp-password` | Sends `RESEND_API_KEY` again. Supabase never returns the saved password, so it's otherwise only sent when none is saved. Use it after replacing the key. |
| `--skip-templates`       | Applies everything except the email templates.                                                                                                           |

**Resend notes**

- Without `EMAIL_FROM`, emails come from `onboarding@resend.dev`, Resend's testing sender. That only delivers to the email address of the Resend account, even when a domain is verified, so everyone else gets "We couldn't send your link". Set `EMAIL_FROM` to an address on your verified domain.
- To check a key without emailing anyone, send to Resend's test inbox `delivered@resend.dev`.
- There's no switch back to Supabase's own mailer yet. If Resend has problems, turn off custom SMTP in the dashboard (Authentication → Emails → SMTP). Bear in mind Supabase's mailer is limited to a few emails an hour and won't use the KC template.

Notes:

- On Supabase's free plan, email templates can't be changed until custom SMTP is set up. Without `RESEND_API_KEY`, use `pnpm auth:configure --skip-templates` to apply everything else.
- The email links to `{{ .SiteURL }}/auth/confirm`, which works in any browser but doesn't carry a `next` path; volunteers land on `/course` (or `/onboarding` the first time). Signing in with the code keeps the page they were heading to.
- Supabase has no separate switch for password sign-in; the app simply never offers passwords.

## Security

All data access goes through the server: route handlers and server code query Postgres via Prisma ([src/lib/prisma.ts](src/lib/prisma.ts)). The browser never talks to the database directly.

Supabase also exposes the `public` schema through its Data API, which anyone holding the anon key could call. To close that off, the `lock_down_supabase_api` migration:

- enables Row Level Security on every table with **no policies**, so API queries see zero rows, and
- revokes all privileges (current and default) on those tables from the `anon` and `authenticated` roles.

Prisma connects as the table owner, which bypasses RLS, so the app is unaffected.

Run `pnpm db:check-rls` after migrating to confirm the anon key is denied on every table. New tables need RLS enabled in their migration too, or rerun the lock-down loop.
