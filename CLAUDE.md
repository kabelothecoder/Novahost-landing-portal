# NovaHost web — working brief

This repo is the **web** side of NovaHost: three React apps and the edge
functions they own. The Android app, the iOS web app and the shared Supabase
migrations live in the `Nova Edge` parent tree, not here.

An earlier version of this file described a single Vue "Admin / Mentor Portal"
and mandated a light neumorphic theme. Both were aspirational and neither was
ever true of this code. What follows is what is actually here.

## The product, in one paragraph

A trading mentor hosts their robot on NovaHost and issues licence keys to their
students. A student buys the app once (PayFast, in Rand), enters that key, and
connects their own MT4/MT5 broker account. When the mentor sends a trade it is
executed server-side against each subscribed account — the handset is where you
watch and configure, not where the trading happens. An optional AI chart scanner
reads a screenshot and returns entry, stop and target scored against the user's
own risk rules.

## The three apps

| Dir | Who it is for | Auth |
| --- | --- | --- |
| `apps/landing` | Prospective app users | None. No Supabase client at all. |
| `apps/portal` | Approved mentors | Supabase auth + `profiles.approval_status = 'approved'` |
| `apps/admin` | The operator | Supabase auth + a row in `public.admin_users` |

They deploy independently, to separate Vercel projects and separate domains. See
`README.md` for the table and the env rules.

### Design systems — there are two, deliberately

1. **Marketing** (`apps/landing`): one theme, always dark. Deep indigo-black
   ground `#07070E`, and the robot mark's magenta→violet→cyan visor gradient as
   the only accent. Tokens in `@novahost/shared/brand`, mirrored into Tailwind
   colours in the landing's own config.

2. **Console** (`apps/portal`, `apps/admin`): neutral dual-theme. Every surface
   is a pure grey; depth comes from lightness steps and 1px borders. Colour is
   semantic only — the blue accent marks the single primary action on a screen,
   green and red mean long and short. Defined in each app's `src/index.css`.

Do not pull a console toward the marketing gradient. A saturated ground makes a
red number harder to tell from a green one, and these screens exist to be read.

## Rules that are load-bearing

**Every admin edge function re-checks authority in its own body.** `verify_jwt`
is not enough: the project's anon key is itself a valid signed JWT and it ships
inside the mobile app. The pattern is `auth.getUser(jwt)` and then a lookup in
`admin_users` — copy it, do not invent a shorter one.

**Admins are not owners.** `licenses`, `profiles` and `trade_logs` are
owner-scoped by RLS. A direct browser `select` from an admin account returns an
empty list, not an error, so admin reads go through an edge function on the
service role. An empty table that should have rows is the failure mode to watch
for here.

**Revenue is derived, not stored.** There is no orders table. `itn_logs` is the
ledger; sandbox rows (different merchant id) are excluded but shown;
`payment_adjustments` is the only record of money going back out.

**Marketing prices and charged prices differ by design.** R599 / R349 / R150 are
advertised; PayFast collects R600 / R350 / R150 to absorb the card fee. Keep
`generate-payfast-checkout`, `payfast-webhook` and the landing's `PRICES` in
step, and do not "fix" one to match another.

**The app cannot send push notifications.** No Web Push anywhere, and
`new Notification()` is illegal in an iOS standalone web app. Never write copy
that promises an alert.

**Commission is counted in SQL, never in an app.** The affiliate programme's
definition of a sale lives in `affiliate_license_sales` and the two scoreboard
views on top of it. The portal and the admin console both read those through
their own edge function, so a mentor and an admin cannot be shown two different
numbers for the same month. Do not reimplement the arithmetic in TypeScript.

The attribution chain is the licence key the buyer typed at checkout:
`itn_logs.payload->>'custom_str4'` → `licenses.license_key` → `licenses.user_id`.
Payments taken before the key-first checkout carry an empty `custom_str4` and
cannot be attributed to anybody; they surface in
`affiliate_unattributed_payments` and are shown on the admin screen rather than
guessed at. `licenses.owner_email` is not a fallback — five licences of eighty-six
have one and none of them match a payer.

**Generating a licence key is not a sale.** A key qualifies only once the money
has cleared at PayFast, which for most mentors is a small fraction of what they
have issued. Any screen that reports "keys" must say which kind it means.

**The mentor agreement holds bank details.** `mentor_agreements` is never read
from a browser; the signed PDF lives in the private `mentor-documents` bucket
under the mentor's own uid prefix. The account number is returned masked
everywhere except the admin agreements screen, which is where somebody has to
type it into a banking app. Do not widen that.

**Programme terms are data, not constants.** Rates, targets and the website
threshold live in `affiliate_settings` and are editable from the admin console.
An approved agreement carries the rate it was approved at, so renegotiating the
programme never rewrites terms somebody already signed.

**One install origin for iOS.** `https://app.novahost-ea.app`. A handset that
installs from any other origin gets a second device id and burns its licence
binding.

## Before you change something here

- Run the build for every app you touched: `npm run build` does all three.
- If you change a shared type, regenerate rather than hand-editing
  `packages/shared/src/db.types.ts`.
- Schema changes go in the owning app's `supabase/migrations` and are applied
  deliberately — say what you are about to run before you run it.
- Wrap network calls so a failure surfaces as a readable message, not a raw
  stack trace. On the admin console especially: say *why* a table is empty.
