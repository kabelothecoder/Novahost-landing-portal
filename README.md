# NovaHost web

npm-workspace monorepo. Origin: `github.com/kabelothecoder/Novahost-landing-portal`.

Three apps that used to be one. Each is deployed as its own Vercel project, from
its own root directory, on its own domain — a landing deploy cannot break the
admin console, and the admin console is not reachable from the marketing site.

| Dir | App | Stack | Audience | Domain |
| --- | --- | --- | --- | --- |
| `apps/landing` | Marketing site | Vite 5, React 18, Tailwind 3 | Anyone. The app, and only the app. | `novahost-ea.app` |
| `apps/portal` | Mentor portal | Vite 5, React 18, Tailwind 3, shadcn | Approved mentors | TBD |
| `apps/admin` | Admin console | Vite 5, React 18, Tailwind 3, shadcn | Accounts in `admin_users` | TBD |
| `packages/shared` | `@novahost/shared` — brand tokens, formatters, generated DB types | — | — | — |

All three talk to the same Supabase project (`epulmnfbxjmaimefhofp`).

## What lives where, and why

**`apps/landing` sells the app.** No mentor signup, no mentor login, no Supabase
client at all. If this app ever needs a session, something has been put on the
wrong domain. Set `VITE_PORTAL_URL` and one discreet footer link to the portal
appears; leave it unset and nothing mentor-facing renders.

**`apps/portal` is for mentors.** Signing in, issuing licence keys, dispatching
trades. The root path is a login wall now, not a landing page.

**`apps/admin` is the business.** Revenue, subscriptions and expiry dates, comp
access, mentor approvals, the licence and device fleet, and signal pipeline
health. Everything it reads comes from `admin-analytics` on the service role,
because most of these tables are owner-scoped by RLS and an admin is nobody's
owner — a direct `select` would return an empty list rather than an error, which
is the most dangerous failure a dashboard can have.

### Where revenue comes from

There is no orders table. `itn_logs` holds the raw PayFast ITN payloads, written
only after the signature, source IP and server-to-server validation have all
passed, so it is the one authentic record of money received. The admin console
reads it as a ledger, with two rules:

- Old sandbox tests live in there under a different merchant id. They are shown
  separately, never counted, and never deleted.
- Money out is not in there at all. `payment_adjustments` carries refunds and
  chargebacks; realised revenue is net less those.

## Develop

```bash
npm install          # one lockfile at the root
npm run dev:landing  # Vite on :3000
npm run dev:portal   # Vite on :8080
npm run dev:admin    # Vite on :8081
npm run build        # builds all three
```

`apps/portal/vite.config.ts` and the other two set `resolve.dedupe:
["react","react-dom"]`. The workspace root hoists React for the sibling apps;
without dedupe an app can pick up a second React instance and hooks throw. Don't
remove it.

## Environment

Copy each app's `.env.example`. The portal and admin need
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; the landing needs
nothing (every var it reads falls back to the real production value).

On Vercel these must be set as **Config**, not **Secret** — a Vite build inlines
them at build time and a Secret-typed var arrives empty, which breaks the bundle
silently.

## Edge functions

Each app keeps the functions it owns under `<app>/supabase/functions`. Deploying
is separate from deploying the app.

| Function | Owner | Notes |
| --- | --- | --- |
| `admin-analytics` | admin | Every read on the console, plus the adjustments ledger |
| `admin-grant-access` | admin | Comp access grant / revoke / list |
| `admin-approve-mentor` | admin | Mentor approvals |
| `admin-licenses` | portal | Misleading name — a **mentor** page (Re-activate Key) uses it |
| `broadcast-signal`, `generate-license`, `manage-eas`, … | portal | Mentor-facing |

Every admin function checks `auth.getUser()` and then `admin_users` in its own
body. `verify_jwt` alone is not enough: the project's anon key is itself a valid
signed JWT and ships inside the mobile app.

This folder sits inside the `Nova Edge` working tree but is its own git repo; the
parent repo does not track it.
