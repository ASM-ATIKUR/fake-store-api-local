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
- **Query params** `?limit=` and `?sort=asc|desc` are re-implemented per handler as `.limit(n).sort({ id: ±1 })`; anything not `desc` sorts ascending. Products additionally take `?sortby=name|price|id` — `controller/product.js` maps that through `SORT_FIELDS` (`name` → `title`) in one `applySort` helper shared by `getAllProducts` and `getProductsInCategory`, and adds an `en`/strength-2 collation for title sorts so case doesn't split the alphabet. Users and carts still sort by `id` only.
- **PATCH and PUT map to the same handler.** Partial updates use `util/flatten.js` to turn nested bodies (`name.firstname`, `address.geolocation.lat`) into Mongo dot-paths so `$set` doesn't clobber whole subdocuments.
- **Errors are mostly swallowed** — `.catch(err => console.log(err))` leaves the request hanging. Follow the existing shape when editing nearby code; don't treat it as a pattern worth spreading.

**Auth lives in `util/auth.js`** — `authenticate`, `requireAdmin`, `requireCustomer`, and `isOwnerOrAdmin(req, userId)` / `forbidden(res, msg)` for the checks that need a DB read first. `authenticate` verifies the Bearer token and then **re-reads the user from Mongo on every request** (401 if the account is gone, 403 if `active === false`), so `req.user = { id, username, role }` always reflects the database, not the token payload — nothing here sets an expiry, so a stale token would otherwise outlive the account forever. That costs one lookup per authenticated request; it is what makes deactivation take effect immediately. Product writes are admin-only, every `/carts` route is `authenticate` + `requireCustomer`, `GET /users` and `PATCH /users/:id/active` are admin-only, and the rest of `/users/:id` (read, write, delete) is owner-or-admin; product reads and `POST /users` (signup) stay public. Ownership on carts is enforced *inside* the controllers — `deleteCart` deliberately `findOne`s before mutating, since `findOneAndDelete` would write before the check could run.

**Carts are a shopping cart, not a CRUD resource.** The whole resource is **customer-only** — `requireCustomer` on `routes/cart.js` 403s an admin on reads as well as writes, so the controllers never branch on role and ownership is a plain `isMine` check (`isOwnerOrAdmin` is for `/users`, not carts). A write never takes a cart id, a `userId` or a `date` from the client: `findMyCart(userId)` resolves the caller's own cart (most recent by `date`, newest `id` as tie-break) and `POST /carts` / `PUT|PATCH /carts/products/:productId` / `DELETE /carts/products/:productId` all act on that. `POST` adds one product and *increments* the quantity if it's already there, since `model/cart.js` rejects a duplicate `productId`. `GET /carts` creates an empty cart for a customer who owns none — the "owns none" count is deliberately unfiltered by date, or the handler's own `enddate` default would hide the cart it just made.

The signing secret reads `process.env.JWT_SECRET` **lazily** (falling back to `'secret_key'`) because `server.js` requires `app.js` before calling `dotenv.config()`. `POST /auth/login` returns `{ token, id, username, role }` — the extra fields exist so a UI can gate admin features without decoding the JWT, and are never trusted on the way back in. `model/user.js` carries `role: 'customer' | 'admin'` and `active` (default `true`); both are admin-only, stripped from an edit body when the caller isn't an admin, and `active` is only settable through `PATCH /users/:id/active`, which refuses to let an admin switch off their own account (`authenticate` would lock them out on the next request). `seed.js` seeds only two users out of the upstream list — `johnd` / `m38rmF$` (id 1, admin) and `kevinryan` / `kev02937@` (id 3, customer); seeded carts may therefore reference userIds that no longer exist, which is fine for fake data. Passwords are still stored and compared in plaintext — deliberate, matching the upstream fake data.

`routes/home.js` + `views/` render EJS docs pages; `app.disable('view cache')` keeps them hot in dev.

## Tests

`__test__/helpers/login.js` hands out admin (`johnd`) and customer (`kevinryan`) tokens — use it rather than logging in inline. The admin token is no use against `/carts` at all now, so cart specs read *and* write as a customer. Those two are the only seeded users, so never mutate or delete them in a spec — `user.spec.js` creates its own throwaway user via `POST /users` and rewrites/deletes that instead. Jest gives no cross-file ordering guarantee, so don't assume a fixed user count either.

`product.spec.js` edits and deletes catalog entries in a parallel worker, so a spec that needs a product to still be there a moment later must **create its own** rather than picking one out of `GET /products` — that is what `cart.spec.js` does in `beforeAll`, and why its cart assertions are all relative (the whole file shares that one product, so quantities accumulate).

Same helper exports `createThrowawayUser()` (signup + login in one call). **Any spec that mutates a cart must use it rather than `kevinryan`**: jest runs spec files in parallel workers, and two files pushing to the same cart document race on mongoose's `$push` — both append the same `productId`, and the next `save()` then fails the schema's duplicate validator. A fresh user id can still collide with a seeded cart's `userId` (only users 1 and 3 are seeded, but carts exist for userIds 1, 2, 3, 4 and 8), so a spec that needs a genuinely cartless user has to delete what it inherited first.

`jest.config.js` wires `__test__/globalSetup.js` (runs the real seeder against the real DB — **destructive**, it `deleteMany`s all three collections) and `__test__/setup.js` (per-suite mongoose connect/disconnect). Tests hit a live MongoDB; there is no in-memory server. Specs use supertest against the exported `app`.
