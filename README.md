# Spec Console — Local Demo

**Spec Console** is a workspace for specifying software before it is built — forms, status machines, and shareable prototypes, with guided questions and no silent blanks.

This repository is a **standalone, clone-and-run demo** for evaluators, contributors, and anyone who wants to explore the product locally. It is intentionally separate from the production deployment on Vercel (which uses Supabase auth and team credentials).

---

## Why this repo exists

| Goal | What you get |
|------|----------------|
| **Try before adopting** | Run the full UI locally in minutes — no Supabase account required |
| **See a real spec** | Pre-loaded **Clinic Booking Platform** sample with forms, status flows, and a prototype |
| **Share safely** | Public-friendly credentials; no production secrets or private data |
| **Learn the product** | Walk through modules the way a BA / PM / developer would during discovery |

Production Spec Console (private, Vercel + Supabase) stays untouched. This repo is a **snapshot configured for open local use**.

---

## What's included

The demo ships with one complete project: **Clinic Booking Platform** (`demo-clinic`).

| Module | Contents |
|--------|----------|
| **Forms** | Appointment booking form with all 15 field types, buttons, validations, and review/export |
| **Status validation** | Appointment lifecycle + payment & insurance state machines with transition questions |
| **Prototype** | Client-ready booking UI mockup with share link |

Data is stored in your **browser localStorage** — each machine gets an isolated copy when you run locally.

---

## Requirements

- **Node.js 20+** (LTS recommended)
- **npm** 10+
- A modern browser (Chrome, Edge, Firefox, Safari)

No Supabase, Postgres, or Vercel account is required for the demo.

---

## Quick start

```bash
git clone https://github.com/MuruganPushparaj/spec-console-demo.git
cd spec-console-demo
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Demo login

When you first open the app you are redirected to the sign-in page. Use:

| Field | Value |
|-------|-------|
| **Email** | `user@example.com` |
| **Password** | `demo` |

The login form is pre-filled in demo mode. On first visit the **Clinic Booking** sample project is installed automatically.

> **Note:** Credentials are for local evaluation only. They are not connected to any real user directory.

---

## Tour — what to click

1. **Projects** (`/index.html`) — see **Clinic Booking Platform** on the dashboard  
2. **Open project** — choose Forms, Status validation, or Prototype from the project hub  
3. **Forms → Review & export** — completeness meter, gap list, dev handoff markdown, CSV, SurveyJS JSON  
4. **Status validation** — switch entities (Appointment, Payment & insurance), expand transitions, export markdown  
5. **Prototype** — preview the booking mockup; use **Share** to copy a read-only link  
6. **Team** (`/settings/team.html`) — add users and assign project access (stored locally)

**Reload demo data:** visit `/demo/load.html` and click **Load demo project**.

---

## Team, users, and projects (fully interactive)

The demo is **not read-only**. Anyone who clones and runs it gets the full product UI, including:

| Feature | Where | What you can do |
|---------|--------|-----------------|
| **New projects** | Projects dashboard → **New project** | Create, edit, and delete projects |
| **Add users** | **Team** → Add team member | Set name, email, org role (admin/member), and **initial password** |
| **Sign in as another user** | Sign out → sign in with that email/password | Test read-only vs write access per project |
| **Invite to project** | Project → **Settings** → Manage members | Assign existing users, invite new users, set read/write, transfer ownership |
| **Forms / status / prototype** | Per project | Full create, edit, export — same as production UI |

Example workflow on a local install:

1. Sign in as `user@example.com` / `demo` (admin).
2. Go to **Team** → add `analyst@example.com` with password `analyst1`.
3. Create a new project (or open Clinic Booking).
4. **Project settings** → invite `analyst@example.com` with **Read only** or **Read & write**.
5. Sign out → sign in as `analyst@example.com` / `analyst1` → confirm access matches what you assigned.

### Important limitation (local demo)

All org, user, project, forms, and status data lives in **that browser’s localStorage** on **that machine**.

- ✅ Multiple users on the **same install** (same URL, same browser profile): works — add users, set passwords, switch accounts via sign out / sign in.
- ❌ **Shared org across different people’s laptops**: not supported in demo mode — each person who clones and runs gets their **own isolated copy** (their own demo org).
- ❌ **Email invites**: passwords are set manually when adding a user; no invite emails are sent.

For a **shared team on the internet** (one org, many real users), you need the production setup: deploy with **Supabase** auth and Postgres (see optional section below). The open-source demo repo is designed for **evaluation and learning**, not hosted multi-tenant SaaS.

---

## How it works (architecture)

```
Next.js (App Router)
  ├── Serves static UI from public/
  ├── Auth API routes (/auth/*) — optional Supabase when env vars are set
  └── Demo mode: localStorage auth + org + forms/status/prototype data
```

| File | Role |
|------|------|
| `public/lib/runtime-config.js` | `demoMode: true`, demo user, auto-seed flag |
| `public/lib/auth.js` | Sign-in; uses localStorage when Supabase is not configured |
| `public/lib/org.js` | Organization, projects, team access |
| `public/lib/demo-bootstrap.js` | Loads Clinic Booking JSON + mockup into localStorage |
| `public/demo/*.json` | Sample forms and status machine definitions |

When **no** `NEXT_PUBLIC_SUPABASE_URL` is set, the app runs entirely in the browser with seeded demo credentials.

---

## Optional: Supabase (advanced)

The codebase supports Supabase for production-style auth and Postgres. **You do not need this for the demo.**

If you want to experiment:

```bash
cp .env.local.example .env.local
# Fill in Supabase URL, anon key, and service role key
npm run db:migrate   # requires Supabase project + SQL migration
```

With Supabase configured, sign-in uses your Supabase users instead of `user@example.com`.

---

## Project structure

```
public/
  index.html              Projects dashboard
  login.html              Sign-in (demo credentials shown)
  forms.html              Form specification module
  status-validation.html  Status / process validation module
  prototype.html          HTML prototype upload & share
  demo/
    load.html             Manual demo loader
    clinic-booking-demo.json
    clinic-status-demo.json
    clinic-booking-mockup.html
  lib/
    runtime-config.js     Demo flags (demoMode: true in this repo)
    auth.js, org.js, shell.js, demo-bootstrap.js
app/                      Next.js routes + optional Supabase auth API
docs/PROBLEM_AND_SOLUTION.md   Product brief (problem → solution)
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank projects after login | Open `/demo/load.html` → **Load demo project**, then sign in again |
| Port 3000 in use | Run `npm run dev -- -p 3001` and open `http://localhost:3001` |
| Stale data | Clear site data for `localhost` in browser DevTools → Application → Local Storage |
| `npm install` errors | Use Node 20+; delete `node_modules` and retry |

---

## Production vs this demo

| | **Production** (Vercel) | **This demo repo** |
|---|-------------------------|---------------------|
| URL | `spec-console.vercel.app` | Your machine (`localhost:3000`) |
| Auth | Supabase + team accounts | `user@example.com` / `demo` |
| Data | Auth in Supabase; specs in localStorage per browser | All localStorage |
| Purpose | Personal / deployed instance | Public evaluation & learning |

---

## License

MIT — see [LICENSE](LICENSE).

---

## Feedback

Open an issue on [GitHub](https://github.com/MuruganPushparaj/spec-console-demo) or reach out via the repo owner’s contact channels.
