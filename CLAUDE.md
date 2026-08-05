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

**Auth lives in `util/auth.js`** — `authenticate` (Bearer header → `jwt.verify` → `req.user = { id, username, role }`), `requireAdmin`, and `isOwnerOrAdmin(req, userId)` / `forbidden(res, msg)` for the checks that need a DB read first. Product writes are admin-only, every `/carts` route is token-gated, and `/users` writes require owner-or-admin; reads of products/users and `POST /users` (signup) stay public. Ownership on carts is enforced *inside* the controllers — `deleteCart` deliberately `findOne`s before mutating, since `findOneAndDelete` would write before the check could run.

**Carts are a shopping cart, not a CRUD resource.** Writes are **customer-only** — every one returns 403 for an admin (`CUSTOMER_ONLY` in `controller/cart.js`), while admin *reads* still span all users. A write never takes a cart id, a `userId` or a `date` from the client: `findMyCart(userId)` resolves the caller's own cart (most recent by `date`, newest `id` as tie-break) and `POST /carts` / `PUT|PATCH /carts/products/:productId` / `DELETE /carts/products/:productId` all act on that. `POST` adds one product and *increments* the quantity if it's already there, since `model/cart.js` rejects a duplicate `productId`. `GET /carts` creates an empty cart for a customer who owns none — the "owns none" count is deliberately unfiltered by date, or the handler's own `enddate` default would hide the cart it just made.

The signing secret reads `process.env.JWT_SECRET` **lazily** (falling back to `'secret_key'`) because `server.js` requires `app.js` before calling `dotenv.config()`. `model/user.js` carries `role: 'customer' | 'admin'`; `seed.js` seeds only two users out of the upstream list — `johnd` / `m38rmF$` (id 1, admin) and `kevinryan` / `kev02937@` (id 3, customer); seeded carts may therefore reference userIds that no longer exist, which is fine for fake data. Passwords are still stored and compared in plaintext — deliberate, matching the upstream fake data.

`routes/home.js` + `views/` render EJS docs pages; `app.disable('view cache')` keeps them hot in dev.

## Tests

`__test__/helpers/login.js` hands out admin (`johnd`) and customer (`kevinryan`) tokens — use it rather than logging in inline. Those two are the only seeded users, so never mutate or delete them in a spec — `user.spec.js` creates its own throwaway user via `POST /users` and rewrites/deletes that instead. Jest gives no cross-file ordering guarantee, so don't assume a fixed user count either.

Same helper exports `createThrowawayUser()` (signup + login in one call). **Any spec that mutates a cart must use it rather than `kevinryan`**: jest runs spec files in parallel workers, and two files pushing to the same cart document race on mongoose's `$push` — both append the same `productId`, and the next `save()` then fails the schema's duplicate validator. A fresh user id can still collide with a seeded cart's `userId` (only users 1 and 3 are seeded, but carts exist for userIds 1, 2, 3, 4 and 8), so a spec that needs a genuinely cartless user has to delete what it inherited first.

`jest.config.js` wires `__test__/globalSetup.js` (runs the real seeder against the real DB — **destructive**, it `deleteMany`s all three collections) and `__test__/setup.js` (per-suite mongoose connect/disconnect). Tests hit a live MongoDB; there is no in-memory server. Specs use supertest against the exported `app`.
