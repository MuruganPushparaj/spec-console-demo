# Spec Console — Problem & Solution

**Spec Console** is a workspace for specifying software before it is built. It replaces ambiguous spreadsheets, slide decks, and meeting notes with structured tools that capture **what to build** — and, just as importantly, **what is still undecided**.

> Guided spec building. No silent blanks.

---

## The Problem

When product teams hand work to developers, critical details are often left implicit. That gap shows up in two places that cause the most rework:

### 1. Form specifications are incomplete

Form specs usually list fields, but rarely spell out:

- When a field is mandatory, editable, or hidden
- Validation rules and error behavior
- What each button does, when it is enabled, and what happens on success vs failure

Unspecified items become **silent blanks**. Developers fill them with assumptions. Testers find gaps late. Clients say “that’s not what we meant” after build has started.

### 2. Status and workflow logic is hard to capture

Business processes involve entities (patients, orders, appointments) moving through **multiple status dimensions** with transitions, preconditions, integrations, and side effects.

This complexity rarely survives a workshop intact. Teams discover contradictions only after development:

- Dead-end states with no exit
- Duplicate or ambiguous transitions
- Preconditions that reference states that do not exist
- Rules marked as “agreed” that were never validated with the client

### 3. Handoff quality varies by author

Without a shared structure, one analyst produces a thorough spec while another leaves half the decisions open. Developers cannot tell **intentional gaps** from **forgotten details**, and there is no consistent export format for build or review.

### 4. Collaboration lacks project boundaries

Multiple people work across client projects. Access control — who can edit vs review — is often informal, leading to overwritten work or specs shared in the wrong context.

---

## The Solution

Spec Console provides **guided specification modules** inside **project workspaces**. Each module asks the questions that matter, tracks completeness, and exports developer-ready documents where every open decision is explicit.

### Core principles

| Principle | What it means |
|-----------|---------------|
| **No silent blanks** | Unanswered questions export as `(not specified)` — never omitted |
| **Completeness tracking** | A meter shows how much of the spec has been considered |
| **Blocking vs open gaps** | Forms distinguish handoff-blocking issues from deliberate open decisions |
| **Confirmed vs assumed** | Status rules are tagged so teams know what is validated vs still needs client sign-off |
| **Structural checks** | Built-in consistency checks catch contradictions before handoff |
| **Project-scoped access** | Owners, editors, and viewers per project |

---

## What Spec Console Includes

### Projects

The entry point. Each client or product initiative gets its own workspace containing forms, status validation data, and prototypes. Project owners manage membership and permissions.

### Forms

A guided form spec builder with a **completeness contract** per field type. For each field, the tool prompts for label, key, mandatory rules, editability, visibility, validation, and related decisions.

Additional coverage:

- **Buttons** — enabled-when conditions, validation order, actions, success/error behavior
- **Review & export** — completeness meter and blocking-gap list before handoff
- **Exports** — dev handoff markdown, House CSV, SurveyJS JSON, canonical JSON

### Status Validation

Structured capture of status machines: entities, dimensions, statuses, and transitions. For each transition, teams document:

- Trigger and actor (human vs automatic)
- Preconditions, including cross-dimension state
- Personas, communications, integrations
- Data captured and produced, side effects, reversibility, failure handling

Exports include **confirmed** vs **assumed** sections and a **checks to reconcile** list for internal contradictions.

### Prototypes

Upload HTML prototypes, preview in-app, and generate shareable links for client review.

### Team & Access

Organization-level user management with per-project roles:

- **Owner** — full edit access plus member management
- **Read & write** — can edit specs
- **Read only** — can view and export, cannot edit

---

## Who It Is For

| Role | Use |
|------|-----|
| **Product / business analysts** | Capture form and workflow specs with clients; track open vs decided items |
| **Project owners** | Create projects, manage access, oversee spec quality |
| **Developers** | Consume structured exports; see explicit gaps and assumed rules before building |
| **Clients / stakeholders** | Review shared prototypes and exported specs |

Used on software projects across domains such as healthcare and operations — as a personal tool for guided specification and client handoff.

---

## How It Works (Technical Overview)

```
Browser (static HTML modules in public/)
├── Projects dashboard
├── Forms spec builder
├── Status validation
└── Prototype sharing

Next.js (Vercel)
├── Auth middleware + /auth/* session routes
└── Prototype API for shared links

Supabase (production)
├── Auth — email/password sign-in
├── Postgres + RLS — projects, members, forms, status workspaces
└── Storage — form attachments
```

The product UI runs as lightweight HTML/JavaScript modules for fast iteration. Next.js handles deployment, authentication, and server-side features. Supabase provides secure multi-user storage with **Row-Level Security** so permissions are enforced in the database, not only in the UI.

For local development, the app can run entirely in the browser using localStorage — no backend required. In production, Supabase Auth and the database back projects and sessions.

---

## Summary

**Problem:** Software specs leave too much implicit — silent blanks in forms, unvalidated assumptions in workflows, inconsistent handoffs, and weak collaboration boundaries.

**Solution:** Spec Console guides teams through structured form and status specification, surfaces gaps before build, tags confirmed vs assumed decisions, and exports clean handoff documents — all organized by project with role-based access.

**Outcome:** Developers build from explicit specs. Clients validate assumptions early. Teams spend less time fixing misunderstandings that should have been caught in specification.
