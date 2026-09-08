# NovaHost web

npm-workspace monorepo. Origin:
`github.com/kabelothecoder/Novahost-landing-portal`.

| Dir | App | Stack | Status |
| --- | --- | --- | --- |
| `apps/portal` | Mentor portal **+ its own marketing page** | Vite 5, React 18, Tailwind 3, react-router 6 | **Deployed** — serves `novahost.co` at the root (`/` = `src/pages/Landing.tsx`, `/login`, `/generate`, the dashboard, …) |
| `apps/landing` | Standalone marketing hero | Next.js 16, React 19, Tailwind 4 | **In the repo, not deployed.** Kept for a possible future front page. |
| `packages/shared` | `@novahost/shared` — marketing brand tokens, framework-agnostic helpers, generated Supabase DB types | — | — |

Both apps talk to one Supabase project (`epulmnfbxjmaimefhofp`). Env var names
differ by framework: `VITE_SUPABASE_*` (portal) vs `NEXT_PUBLIC_SUPABASE_*`
(landing).

`apps/portal/vite.config.ts` sets `resolve.dedupe: ["react","react-dom"]` — the
workspace also has React 19 (for the landing) hoisted at the root; without dedupe
the portal picks up a second React and hooks throw. Don't remove it.

## Develop

```bash
npm install            # one lockfile at the root
npm run dev:portal     # Vite on :8080  — the deployed app
npm run dev:landing    # Next on :3000  — not deployed
npm run build          # builds both
```

This folder sits inside the `Nova Edge` working tree but is its own git repo; the
parent repo does not track it (pre-split history is in `Nova-Edge.git`).
