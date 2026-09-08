# NovaHost web

Monorepo for the two public web surfaces. One domain, path-routed:

| Path | App | Stack | Deploy |
| --- | --- | --- | --- |
| `/` (apex) | `apps/landing` | Next.js 16, React 19, Tailwind 4 | Vercel project, root `apps/landing` |
| `/mentor/*` | `apps/portal` | Vite 5, React 18, Tailwind 3, react-router 6 | Vercel project, root `apps/portal`, no domain — reached via the landing's rewrite |
| `/super-admin/*` | `apps/landing` | (same as landing) | platform-owner console, part of the landing app |

`packages/shared` (`@novahost/shared`) — marketing brand tokens + framework-agnostic
helpers + Supabase-generated DB types. Not for portal functional UI.

Both apps talk to one Supabase project (`epulmnfbxjmaimefhofp`). Env var names differ
by framework: `NEXT_PUBLIC_SUPABASE_*` (landing) vs `VITE_SUPABASE_*` (portal).

## Develop

```bash
npm install            # one lockfile at the root (npm workspaces)
npm run dev:landing    # Next on :3000
npm run dev:portal     # Vite on :8080
npm run build          # builds both
```

## Repo

Origin: `github.com/kabelothecoder/Novahost-landing-portal`. This folder sits inside
the `Nova Edge` working tree but is its own git repo; the parent repo does not track
it (pre-split history is in `Nova-Edge.git` through `abb8b07`).
