# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A locally-runnable clone of [fakestoreapi.com](https://fakestoreapi.com) — an Express + Mongoose REST API serving fake e-commerce data (products, carts, users, auth). Unlike the hosted original, writes here **actually persist** to the local MongoDB. `README.md` is the API contract: every route, field, and query param is documented there; keep it in sync when changing endpoints.

## Commands

```bash
npm start           # node server.js (no watch; nodemon is installed but unscripted)
npm run seed        # wipe + refetch products/carts/users from https://fakestoreapi.com (needs network)
npm test            # jest — seeds the DB first via globalSetup, then runs all specs
npx jest __test__/product.spec.js          # single test file
npx jest -t "get all products"             # single test by name
docker compose up   # app + mongo, using .env
```

## Environment

`.env` holds Docker-oriented defaults (`DB_HOST=db`, auth-enabled Mongo URL). `.env.local`, if present, is loaded **first** and its values win — that's how you point at a plain local mongod (`mongodb://localhost:27017/fake_store`). `dotenv-expand` resolves `$VAR` inside `DATABASE_URL`.

Three entry points each duplicate this same load-`.env.local`-then-`.env` block: `server.js`, `seed.js`, `__test__/setup.js`. Change one, change all three.

## Architecture

`server.js` (env + mongoose connect + listen) → `app.js` (express app, middleware, route mounting; exported unbound so supertest can use it) → `routes/*.js` (thin routers, one per resource) → `controller/*.js` (all logic, promise-`.then` style, no async/await) → `model/*.js` (Mongoose schemas).

Conventions that run through every controller:

- **`id` is an app-level Number field, not `_id`.** All lookups are `findOne({ id })`; all responses `.select(['-_id'])` to hide the Mongo id. New records get their id from `util/id.js` (max existing `id` + 1) — not atomic, fine for fake data.
- **Query params** `?limit=` and `?sort=asc|desc` are re-implemented per handler as `.limit(n).sort({ id: ±1 })`; anything not `desc` sorts ascending.
- **PATCH and PUT map to the same handler.** Partial updates use `util/flatten.js` to turn nested bodies (`name.firstname`, `address.geolocation.lat`) into Mongo dot-paths so `$set` doesn't clobber whole subdocuments.
- **Errors are mostly swallowed** — `.catch(err => console.log(err))` leaves the request hanging. Follow the existing shape when editing nearby code; don't treat it as a pattern worth spreading.

`auth.js` compares plaintext passwords and signs a JWT with the hardcoded literal `'secret_key'`. Deliberate for fake data; no route is actually protected.

`routes/home.js` + `views/` render EJS docs pages; `app.disable('view cache')` keeps them hot in dev.

## Tests

`jest.config.js` wires `__test__/globalSetup.js` (runs the real seeder against the real DB — **destructive**, it `deleteMany`s all three collections) and `__test__/setup.js` (per-suite mongoose connect/disconnect). Tests hit a live MongoDB; there is no in-memory server. Specs use supertest against the exported `app`.
