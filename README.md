# ABA Virtual

The website and supervision portal behind [abavirtual.net](https://abavirtual.net): ABA-based therapy services, paid training videos and books, learning games for children, a blog, and a portal where BCBA/BCaBA supervisors track their supervisees' fieldwork hours.

## Repository layout

| Folder | What it is | Stack |
| --- | --- | --- |
| `FrontEnd/` | The public site, shop, games and portal (single-page app) | React 18 (Create React App), Tailwind CSS, MUI, React Router 7, GSAP, Phaser, Recharts |
| `BackEnd/` | REST API: accounts, payments, emails, game scores, supervision portal | Node.js, Express 5, MongoDB (Mongoose), Passport (local + Google) |
| `blog-cms/` | Sanity Studio for editing blog posts, authors and resources | Sanity 3 |

`FrontEnd/build/` is committed on purpose: the server serves it directly, so a deploy is a `git pull` (see [Deployment](#deployment)).

## Features

- **Public pages**: home, about, contact, blog (`/blogs`), policies. Public pages are prerendered to static HTML at build time for SEO and link previews.
- **Resources shop** (`/resources`): training videos and books from Sanity, bundles, a cart, and video playback for purchased items. Purchases expire after a year (a daily job in `BackEnd/Routes/gateway.js` removes them).
- **Pricing**: visitors in Pakistan see PKR; everyone else sees whole-euro prices. Both are fixed tables in `BackEnd/Services/pricing.js`. Payments go through PayFast.
- **Games** (`/games`): ten learning games for domain 1, with scores saved per user.
- **Supervision portal** (`/portal`):
  - Supervisors log hours, meetings, assignments, ratings and monthly payments for each supervisee, and can share a read-only view by email.
  - Supervisees see their own hours and progress.
  - Supervisors pay for a Monthly (€30) or Yearly (€350) plan at `/supervision-plans`; supervisees never pay.
  - Certification boards (BACB, IBAO, QABA) are managed from `/portal/boards`.

## Getting started

Requirements: Node.js 18 or newer, npm, and a MongoDB database (Atlas or local).

### 1. Backend

```bash
cd BackEnd
npm install
# create BackEnd/.env (see "Environment variables" below)
node server.js
```

The API listens on `http://localhost:5000`.

### 2. Frontend

```bash
cd FrontEnd
npm install
# create FrontEnd/.env (see below)
npm start
```

The site opens on `http://localhost:3000`.

### 3. Blog CMS (optional)

```bash
cd blog-cms
npm install
npm run dev
```

Sanity Studio runs on `http://localhost:3333`. `npm run deploy` publishes the studio to Sanity's hosting.

## Environment variables

`.env` files are gitignored; never commit them. Ask the project owner for the values.

### `BackEnd/.env`

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_SESSION_SECRET` | Secret for login sessions |
| `FRONTEND_URL` | Site origin, for CORS and links in emails (`http://localhost:3000` locally) |
| `BACKEND_PUBLIC_URL` | Public API URL, used in payment callbacks |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `EMAIL_USER`, `EMAIL_PASS` | Mailbox that sends invites, receipts and reminders |
| `ADMIN_SECRET_KEY` | Protects admin-only endpoints |
| `SANITY_PROJECT_ID`, `SANITY_DATASET` | Read products and resources from Sanity |
| `PAYFAST_ENV` | `sandbox` or `live` |
| `PAYFAST_MERCHANT_ID`, `PAYFAST_SECURED_KEY`, `PAYFAST_MERCHANT_NAME`, `PAYFAST_STORE_ID` | PayFast account |
| `PAYFAST_SANDBOX_MERCHANT_ID`, `PAYFAST_SANDBOX_SECURED_KEY`, `PAYFAST_LIVE_MERCHANT_ID`, `PAYFAST_LIVE_SECURED_KEY` | Per-environment PayFast keys |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `STRIPE_SECRET_KEY` | Older payment providers still referenced by `Routes/gateway.js` |
| `CURRENCY_DEV_COUNTRY` | Optional: pretend to be in this country locally (e.g. `PK`) to test currency |
| `PRICING_TEST_PKR_OVERRIDES` | Optional: override PKR prices for testing |

### `FrontEnd/.env`

| Variable | Purpose |
| --- | --- |
| `REACT_APP_BACKEND_URI` | API base URL with trailing slash: `http://localhost:5000/` locally, `https://abavirtual.net/api/` for production builds |
| `REACT_APP_FRONTEND_URL` | Site origin |
| `REACT_APP_SANITY_PROJECT_ID`, `REACT_APP_SANITY_DATASET`, `REACT_APP_SANITY_TOKEN` | Read blog posts and resources from Sanity |
| `REACT_APP_CLOUD_NAME` | Cloudinary account for media |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Stripe public key (older checkout) |

## Project structure

```
BackEnd/
  server.js          Express app: middleware, sessions, route mounting
  Config/            Passport strategies (local + Google)
  Middleware/        Supervisor/supervisee access checks
  Routes/            /auth /comments /paypal /mail /newsletter /games /scores /payfast /supervision /boards
  Schema/            Mongoose models (User, Order, GameScore, Supervision*, ...)
  Services/          Mailer, PayFast, pricing, supervision plans
  scripts/           One-off admin scripts (seed boards, promote a supervisor)
FrontEnd/
  public/            Static files, game icons, backgrounds and audio
  scripts/prerender.js  Runs after `npm run build`; writes static HTML per public page and sitemap.xml
  src/
    App.js           All routes
    Layout/          Header and Footer
    Pages/           One folder per section (Home, Resources, Games, Portal, ...)
    Utils/           Shared components, MUI theme, SEO, context
blog-cms/
  schemaTypes/       Sanity document types (blog, author, resource, ...)
```

## Design

Colours, type and spacing follow the ABA Virtual design system. The palette is `#FBFBFB`, `#4BB7BA`, `#4B9ABB`, `#265C7E` and `#EC5923`, plus navy `#042539` for dark sections. These are defined in `FrontEnd/tailwind.config.js` and, for MUI screens, `FrontEnd/src/Utils/theme.js`. Headings and body text use Raleway.

## Deployment

Production runs on a Hostinger VPS:

- nginx serves `FrontEnd/build` and proxies `/api/` to the backend on port 5000.
- The backend runs under pm2 as `project-backend`.
- The repo is cloned at `/var/www/autism-therapist-website`.

**1. Build on your machine** (Windows Command Prompt shown):

```cmd
cd FrontEnd
set "REACT_APP_BACKEND_URI=https://abavirtual.net/api/"
npm run build
```

`npm run build` also prerenders the public pages. Set `SKIP_PRERENDER=1` to skip that step.

**2. Commit and push**, including the build folder, which `.gitignore` excludes:

```cmd
cd ..
git add -A FrontEnd/src BackEnd
git add -f FrontEnd/build
git commit -m "Describe the change"
git push origin master
```

**3. Pull on the server:**

```bash
cd /var/www/autism-therapist-website
git pull origin master
pm2 restart project-backend
```

Restarting pm2 is only needed when `BackEnd/` changed. Hard-refresh the site (Ctrl+F5) to check.

## Admin scripts

Run these on the server from `BackEnd/`:

- `node scripts/seedBoards.js`: creates the BACB, IBAO and QABA boards. Already done; boards are now managed from the portal.
- `node scripts/promoteSupervisor.js <email>`: gives an account the supervisor role without a paid plan.

## Notes

- There are no automated tests; check changes by running the site locally.
- Uploaded files live in `BackEnd/uploads` (public) and `BackEnd/private-uploads` (assignment attachments, served only to signed-in users). Both are gitignored, so back them up separately.
