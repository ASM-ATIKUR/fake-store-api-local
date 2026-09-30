# Requirements Analysis & Specification

> High-level engineering specification for **FakeStoreAPI Local** (Node.js/Express + MongoDB/Mongoose).

---

## 1. System Overview & Objectives

### 1.1. Purpose
**FakeStoreAPI Local** is a local clone of FakeStoreAPI with real MongoDB persistence. Unlike the public mock API, all mutations persist. It provides REST endpoints, JWT authentication, role-based authorization, and deterministic fixtures for frontend development.

### 1.2. User Personas
* **Guest (Anonymous)**: Browses catalog, categories, and products. Can register (`POST /users`) and log in (`POST /auth/login`).
* **Customer (`customer` role)**: Authenticated shopper. Manages own profile and private cart. Restricted from catalog writes and other users' carts.
* **Admin (`admin` role)**: Catalog manager. Product CRUD, user auditing (`GET /users`), and user activation/deactivation. Blocked from `/carts` (HTTP 403).
* **Frontend Developer**: Consumes the API to build storefronts, test auth states, and verify persistent mutations.

---

## 2. Epics & User Stories

### Epic 1: Product Catalog & Discovery

#### US-1.1: Product Browsing & Pagination Limit
* **As a** shopper, **I want to** list products with `limit` and `sort`, **so that** I can control result size and order.
* **Acceptance Criteria:**
  * `GET /products?limit={n}` returns at most `n` products (0 or omitted = all).
  * `sort=desc` sorts descending; otherwise defaults to ascending (`asc`).
  * Responses return integer `id` and strip MongoDB `_id` and `__v`.

#### US-1.2: Multi-Field Sorting
* **As a** shopper, **I want to** sort by `price`, `title`, or `id`, **so that** I can order products as needed.
* **Acceptance Criteria:**
  * `sortby=price`: Sorts numerically by price.
  * `sortby=name` or `title`: Case-insensitive alphabetical sort (`en` collation, strength 2).
  * Unrecognized or missing `sortby`: Defaults to `id`.

#### US-1.3: Category Taxonomy & Filter
* **As a** shopper, **I want to** list categories and filter items by category, **so that** I can browse by department.
* **Acceptance Criteria:**
  * `GET /products/categories` returns unique category names.
  * `GET /products/category/:category` returns matching products, supporting `limit`, `sort`, and `sortby`.

#### US-1.4: Single Product Lookup
* **As a** shopper, **I want to** fetch a product by ID, **so that** I can view its details.
* **Acceptance Criteria:**
  * `GET /products/:id` returns the product or `null` (404 if deleted/missing).

---

### Epic 2: Shopping Cart Management (Customer Only)

#### US-2.1: Active Cart Resolution & Auto-Creation
* **As a** customer, **I want to** use my cart without passing a cart ID, **so that** cart operations are seamless.
* **Acceptance Criteria:**
  * Requires `authenticate` + `requireCustomer`.
  * Resolves the caller's latest cart by `date: -1, id: -1`.
  * If the customer has no cart, `GET /carts` auto-creates and returns an empty cart (`products: []`).

#### US-2.2: Add Item with Catalog Price Snapshot
* **As a** customer, **I want to** add products to my cart, **so that** I can prepare an order.
* **Acceptance Criteria:**
  * `POST /carts` accepts `{ productId, quantity }` (default quantity: 1).
  * Checks catalog product exists (404 if missing).
  * If item exists in cart, increments `quantity` and keeps initial `priceAtAdd`.
  * If new, appends item and sets `priceAtAdd` from catalog price.
  * Client cannot set `priceAtAdd`, `userId`, or cart `id`.

#### US-2.3: Modify Quantity & Remove Item
* **As a** customer, **I want to** change unit quantities or remove items, **so that** my cart stays accurate.
* **Acceptance Criteria:**
  * `PUT|PATCH /carts/products/:productId` updates line `quantity` (must be integer >= 1).
  * `DELETE /carts/products/:productId` removes the line item.
  * Returns 404 if cart or product is missing.

#### US-2.4: Cart History & Cart Deletion
* **As a** customer, **I want to** inspect past carts and delete old ones, **so that** I can manage my history.
* **Acceptance Criteria:**
  * `GET /carts?startdate=&enddate=` filters caller's carts by date.
  * `GET /carts/:id` and `DELETE /carts/:id` enforce ownership (`cart.userId === req.user.id`). Other users' carts return 403.

#### US-2.5: Admin Cart Restriction
* **As a** security maintainer, **I want to** block admins from carts, **so that** admin accounts do not hold shopping baskets.
* **Acceptance Criteria:**
  * All `/carts` endpoints apply `requireCustomer`.
  * Requests with `role: 'admin'` return **HTTP 403** (`carts are customer-only`).

---

### Epic 3: User Profiles & Self-Service

#### US-3.1: Public Registration
* **As a** visitor, **I want to** sign up, **so that** I can get an account.
* **Acceptance Criteria:**
  * `POST /users` creates a user with `role: 'customer'` and `active: true`.
  * Generates a unique numeric `id` via `saveWithFreshId()`.
  * Requires `email`, `username`, `password`, and `name: { firstname, lastname }`.

#### US-3.2: Profile Read & Partial Update
* **As a** user or admin, **I want to** view and update profile data, **so that** account details remain current.
* **Acceptance Criteria:**
  * `GET /users/:id` allowed for owner or admin (403 otherwise).
  * `PUT|PATCH /users/:id` updates fields using dot-paths (`toDotPaths`) to preserve sibling nested keys.

#### US-3.3: Privilege Escalation Guard
* **As a** security maintainer, **I want to** prevent users from elevating roles, **so that** authorization is intact.
* **Acceptance Criteria:**
  * Non-admin callers attempting to set `role` or `active` have those fields silently stripped.
  * Only admins can change `role` or toggle `active`.

---

### Epic 4: Platform Administration (Admin Role)

#### US-4.1: Product Catalog Management
* **As an** admin, **I want to** create, update, and delete products, **so that** inventory is current.
* **Acceptance Criteria:**
  * `POST /products`: Validates `title` and `price`, assigns sequential `id`, creates product.
  * `PUT|PATCH /products/:id`: Updates fields (incoming `id` stripped). 404 if not found.
  * `DELETE /products/:id`: Removes product and returns deleted object.
  * Non-admins receive **HTTP 403**.

#### US-4.2: User Directory Audit
* **As an** admin, **I want to** list all users, **so that** I can audit accounts.
* **Acceptance Criteria:**
  * `GET /users` requires admin role; supports `limit` and `sort`.

#### US-4.3: User Deactivation & Self-Lockout Guard
* **As an** admin, **I want to** toggle user active status, **so that** I can suspend accounts safely.
* **Acceptance Criteria:**
  * `PATCH /users/:id/active` accepts `{ active: Boolean }`.
  * Deactivated users cannot log in, and active sessions fail on the next request.
  * Admin deactivating self (`req.user.id === req.params.id`) returns **HTTP 400** (`you cannot deactivate your own account`).

---

### Epic 5: Authentication & Security

#### US-5.1: Login & Token Issuance
* **As a** user, **I want to** log in with credentials, **so that** I receive a JWT token.
* **Acceptance Criteria:**
  * `POST /auth/login` checks username/password.
  * Invalid credentials return 401; deactivated accounts return 403.
  * Success returns `{ token, id, username, role }`.

#### US-5.2: Per-Request Database Account Verification
* **As a** security maintainer, **I want to** verify accounts on every call, **so that** revocations apply immediately.
* **Acceptance Criteria:**
  * `authenticate` middleware re-reads `User` by `id` on each call.
  * Deleted accounts return 401; `active: false` accounts return 403.
  * Populates `req.user = { id, username, role }` from the live database.

---

### Epic 6: Seeding & Reproducibility

#### US-6.1: Deterministic Offline Seed
* **As a** developer/tester, **I want to** reload fixtures offline, **so that** tests start from a clean state.
* **Acceptance Criteria:**
  * `npm run seed` drops collections, syncs indexes, and loads `data/seed-data.json`.
  * Seeds 20 products, 2 users (`admin` / `123`, `customer` / `123`), and 1 customer cart.

#### US-6.2: Upstream Sync with Fixed Credentials
* **As a** maintainer, **I want to** refresh from upstream FakeStoreAPI, **so that** fixtures stay updated without breaking logins.
* **Acceptance Criteria:**
  * `npm run seed:fetch` pulls upstream data, applies fixed credentials (`SEED_USERS`), stamps `priceAtAdd`, and writes `data/seed-data.json`.

