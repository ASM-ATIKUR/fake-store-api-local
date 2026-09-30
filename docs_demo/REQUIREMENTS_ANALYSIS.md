# Requirements Analysis & Specification

> High-level engineering specification for the **E-Commerce Practice API**. Designed as an extended, developer-friendly backend for frontend engineers, students, and full-stack learners practicing real-world store UI and API integrations.

---

## 1. System Overview & Objectives

### 1.1. Purpose
The purpose of this project is to provide a reliable, feature-rich, and realistic e-commerce backend API. Frontend developers practicing with React, Vue, Angular, Next.js, or mobile frameworks (Flutter, React Native) can connect to this backend to build rich storefronts, admin dashboards, carts, and checkout flows without needing to develop a backend from scratch.

### 1.2. User Personas
* **Persona 1: Guest Shopper (Anonymous User)**
  * Browses the catalog, searches and filters products, views product details, and maintains a temporary guest cart.
* **Persona 2: Registered Customer (Customer Role)**
  * Manages personal profile, maintains a saved Address Book (with a default delivery address), maintains an authenticated shopping cart across sessions, applies discount coupons, places orders, views personal order history, and writes product reviews.
* **Persona 3: Store Administrator (Admin Role)**
  * Manages catalog inventory (adds, edits, and removes products, categories, and brands).
  * Manages orders across all customers (views all system orders, filters by status/date/customer, advances fulfillment status: `Pending` -> `Processing` -> `Shipped` -> `Delivered`, attaches tracking numbers, and cancels orders with automatic stock restock).
  * **Strict Restriction**: Cannot maintain shopping carts or place customer orders.
* **Persona 4: System Administrator (SuperAdmin Role)**
  * Has all privileges of the Store Administrator.
  * Manages system users: can promote any Customer to Admin, demote an Admin back to Customer, and activate/deactivate user accounts.
  * Cannot self-demote.
  * **Strict Restriction**: Cannot maintain shopping carts or place customer orders.
* **Persona 5: Frontend Developer (The API Consumer)**
  * Uses the API to test UI states: loading skeletons, empty states, pagination controls, optimistic UI updates, form validation errors, network latency, and server failure handling.

---

## 2. Epics, User Stories & Acceptance Criteria

### Epic 1: Product Catalog & Discovery

#### US-1.1: Paginated Product Browsing
* **As a** shopper,
* **I want to** retrieve a paginated list of products,
* **So that** I can browse items without loading the entire catalog at once.

* **Acceptance Criteria (Given-When-Then):**
  * **Given** a page number `page` and page size `limit` (defaulting to 1 and 10),
  * **When** I request the product list,
  * **Then** the system returns only the items belonging to that page along with metadata: `totalCount`, `page`, `limit`, `totalPages`, `hasNextPage`, and `hasPreviousPage`.
* **Edge Cases & Validation:**
  * If `page` < 1 or `limit` < 1, the system defaults them to 1 and 10 or returns an HTTP 400 Bad Request.
  * If `page` exceeds `totalPages`, the system returns an empty `items` array with `totalCount` preserved and `hasNextPage = false`.
  * `limit` is capped at a maximum of 50 to prevent memory exhaustion.

#### US-1.2: Multi-Facet Product Filtering
* **As a** shopper,
* **I want to** filter products by category, brand, price range, stock status, and minimum rating,
* **So that** I can quickly find the exact items I want to buy.

* **Acceptance Criteria:**
  * **Given** one or more filter parameters (`categorySlug`, `brandSlug`, `minPrice`, `maxPrice`, `minRating`, `inStockOnly`),
  * **When** I query the products endpoint,
  * **Then** the returned products satisfy **all** applied criteria simultaneously (AND logic).
* **Edge Cases:**
  * If `minPrice` > `maxPrice`, the API returns HTTP 400 Bad Request with an explanation.
  * If a non-existent category or brand slug is supplied, the API returns an empty list (`items: []`, `totalCount: 0`) rather than crashing.

#### US-1.3: Keyword Search
* **As a** shopper,
* **I want to** search products by typing a keyword,
* **So that** I can find items matching names, descriptions, or tags.

* **Acceptance Criteria:**
  * **Given** a search term `search` or `q`,
  * **When** the query is executed,
  * **Then** items containing the term in their title, description, or tags are returned using case-insensitive partial matching.

#### US-1.4: Product Sorting
* **As a** shopper,
* **I want to** sort the product listing by price, rating, title, or newest date in ascending or descending order,
* **So that** I can prioritize deals or top-rated items.

* **Acceptance Criteria:**
  * Supports `sortBy = price | rating | title | date` and `order = asc | desc`.
  * Defaults to sorting by newest (`date`, descending) if unspecified.

#### US-1.5: Detailed Product View by ID and Slug
* **As a** shopper,
* **I want to** view complete details of a single product using either its unique ID (UUID) or its SEO-friendly slug,
* **So that** I can see descriptions, stock, image galleries, brand details, category details, and customer reviews.

* **Acceptance Criteria:**
  * `GET /api/v1/products/{id}` returns the product if found, or HTTP 404 Not Found if missing.
  * `GET /api/v1/products/slug/{slug}` resolves the same product by human-readable slug.
  * Includes calculated `discountedPrice` based on `price` and `discountPercentage`.

---

### Epic 2: Shopping Cart Management

#### US-2.1: Guest & Authenticated Customer Carts
* **As a** customer or guest shopper,
* **I want to** add products to my shopping cart,
* **So that** I can prepare multiple items for a single purchase.

* **Acceptance Criteria:**
  * **Guest Users**: Pass an `X-Cart-Id` header (UUID). If omitted on the first call, the server creates a new cart and returns its UUID.
  * **Authenticated Customers**: Cart is bound directly to the user's account (`userId`).
  * Adding an item increments quantity if the item already exists in the cart, or inserts a new line item if it does not.
* **Administrative Role Restriction:**
  * **Given** an authenticated user with role `Admin` or `SuperAdmin`,
  * **When** attempting any cart operation (`GET /api/v1/cart`, `POST /api/v1/cart/items`, `PUT /api/v1/cart/items/{id}`, `DELETE /api/v1/cart/items/{id}`, `POST /api/v1/orders/checkout`),
  * **Then** the server rejects the request with **HTTP 403 Forbidden** and message: *"Administrative accounts (Admin/SuperAdmin) are restricted from using the shopping cart or placing customer orders."*
* **Business Calculation Rules:**
  * Line Total: `Math.Round(unitPrice * quantity, 2)`.
  * Cart Subtotal: Sum of all Line Totals.
  * Grand Total: `Subtotal - DiscountTotal`.

#### US-2.2: Cart Merging on Customer Authentication
* **As a** customer logging in after browsing anonymously,
* **I want to** have my guest cart merged into my customer cart,
* **So that** I do not lose items I selected before logging in.

* **Acceptance Criteria:**
  * **Given** an active guest cart with items and a customer logging in who also has existing cart items,
  * **When** the merge is triggered,
  * **Then** matching products have their quantities combined (capped at product stock limit), unique items are added, and the guest cart is cleared.

#### US-2.3: Cart Quantity Modification & Item Removal
* **As a** customer,
* **I want to** change the quantity of an item in my cart or remove it entirely,
* **So that** I can adjust my prospective order before checkout.

* **Acceptance Criteria:**
  * Updating quantity to 0 or calling the delete endpoint removes the line item.
  * Updating quantity beyond available product stock returns HTTP 400 Bad Request indicating insufficient stock.
  * Emptying the cart sets Subtotal and GrandTotal to 0.00.

---

### Epic 3: Checkout & Orders (Customer & Admin)

#### US-3.1: Customer Order Checkout & Atomic Stock Deduction
* **As a** customer,
* **I want to** convert my active shopping cart into a confirmed order by providing a delivery address,
* **So that** my purchase is officially recorded.

* **Acceptance Criteria:**
  * **Given** a non-empty cart with a valid delivery address (from the customer's address book or entered manually) and payment method,
  * **When** checkout is submitted (`POST /api/v1/orders/checkout`),
  * **Then**:
    1. Inventory stock is validated for every line item in the cart.
    2. If stock is sufficient for all items, stock is decremented immediately.
    3. An immutable `Order` record is generated with initial status `Pending` or `Processing`.
    4. Product details (title, thumbnail, price charged) are snapshotted into `OrderItem` records.
    5. The customer's cart is cleared.
* **Edge Cases & Failure Handling:**
  * If **any single item** in the cart has insufficient stock, the entire checkout transaction fails, no stock is deducted, no order is created, and HTTP 400 is returned detailing the out-of-stock item(s).
  * Admins and SuperAdmins cannot check out (HTTP 403 Forbidden).

#### US-3.2: Promotional Coupon Application
* **As a** customer,
* **I want to** enter a promotional coupon code during checkout,
* **So that** I can receive a discount on my purchase.

* **Acceptance Criteria:**
  * Coupons specify either a `Percentage` (e.g. 20%) or `FixedAmount` (e.g. $15.00).
  * Minimum purchase threshold (`minPurchaseAmount`) must be met before a coupon can be applied.
  * Only one coupon may be applied per order.
  * Expired coupons (`validUntilUtc < DateTime.UtcNow`) or deactivated coupons (`isActive = false`) return HTTP 400.

#### US-3.3: Customer Order History
* **As a** customer,
* **I want to** view my past orders and track their fulfillment status,
* **So that** I can monitor when my package will arrive.

* **Acceptance Criteria:**
  * Customers can list their own orders sorted newest first.
  * Customers cannot view orders belonging to other customers (HTTP 403 / 404).

#### US-3.4: Customer Order Cancellation
* **As a** customer,
* **I want to** cancel my order if it has not yet shipped,
* **So that** I can cancel an unintended purchase.

* **Acceptance Criteria:**
  * A customer can cancel an order **only** if its status is `Pending` or `Processing`.
  * Once an order has reached `Shipped` or `Delivered`, cancellation by a customer is rejected with HTTP 400.
  * Upon cancellation, all deducted inventory is restored back to the product stock count.

#### US-3.5: Admin Order Management (View & Filter All Orders)
* **As an** Admin or SuperAdmin,
* **I want to** view a paginated list of all orders across the entire platform,
* **So that** I can oversee customer purchases and process shipments.

* **Acceptance Criteria:**
  * Admins can query `GET /api/v1/admin/orders` with pagination (`page`, `limit`).
  * Supports filtering by:
    * `status` (`Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`).
    * `paymentStatus` (`Pending`, `Paid`, `Failed`, `Refunded`).
    * `orderNumber` (exact search).
    * `dateFrom` and `dateTo` (UTC date range).
  * Each order in the response includes purchasing customer info (ID, email, name), line items, delivery address, payment summary, and current status.

#### US-3.6: Admin Order Fulfillment & Status Progression
* **As an** Admin or SuperAdmin,
* **I want to** update the fulfillment status of an order and add carrier tracking details,
* **So that** the customer knows their order is in transit.

* **Acceptance Criteria:**
  * Admin submits `PATCH /api/v1/admin/orders/{id}/status` with target status and optional `trackingNumber`.
  * Valid status progression:
    * `Pending` -> `Processing` (Order confirmed, warehouse packing)
    * `Processing` -> `Shipped` (Carrier dispatched; tracking number attached)
    * `Shipped` -> `Delivered` (Package delivered)
  * Transitioning backwards (e.g. `Delivered` -> `Pending`) is rejected with HTTP 400.

#### US-3.7: Admin Order Cancellation & Restock
* **As an** Admin or SuperAdmin,
* **I want to** cancel an order at any stage prior to delivery with an administrative note,
* **So that** damaged, fraudulent, or disputed orders can be halted.

* **Acceptance Criteria:**
  * Admin submits `POST /api/v1/admin/orders/{id}/cancel` with a reason.
  * If the order has not been delivered, status becomes `Cancelled`.
  * All items in the order are automatically restocked into inventory.
  * Payment status is set to `Refunded` (if previously `Paid`).

---

### Epic 4: Catalog Administration (Admin & SuperAdmin)

#### US-4.1: Product Management
* **As an** Admin or SuperAdmin,
* **I want to** create, update, and delete products,
* **So that** I can maintain catalog offerings.

* **Acceptance Criteria:**
  * `POST /api/v1/products`: Creates a new product with title, description, price, stock, SKU, category, brand, and images.
  * `PUT /api/v1/products/{id}`: Modifies an existing product's fields.
  * `DELETE /api/v1/products/{id}`: Physically removes the product. Past order line items retain snapshot copies.

#### US-4.2: Category & Brand Management
* **As an** Admin or SuperAdmin,
* **I want to** create, edit, and delete categories and brands,
* **So that** the catalog taxonomy stays organized.

* **Acceptance Criteria:**
  * Deleting a category or brand is rejected with HTTP 400 if active products are assigned to it.

---

### Epic 5: User Management & SuperAdmin Privileges

#### US-5.1: Registration, Authentication & Profiles
* **As a** new user,
* **I want to** register for an account and log in,
* **So that** I can access customer features.

* **Acceptance Criteria:**
  * Email and Username must be unique across the system. Duplicates return HTTP 409 Conflict.
  * Newly registered users are assigned the `Customer` role by default.
  * Successful login issues a signed JWT containing user ID, email, and assigned `Role`.

#### US-5.2: Address Book Management (Single Address Concept)
* **As a** customer,
* **I want to** maintain an Address Book of delivery destinations with an `isDefault` flag,
* **So that** I can select an address during checkout without re-typing.

* **Acceptance Criteria:**
  * Addresses contain: `street`, `city`, `state`, `postalCode`, `country`, and `isDefault`.
  * **No separate billing vs shipping type**: An address is simply an address.
  * Setting an address as default automatically unsets `isDefault` on all other addresses for that user.

#### US-5.3: SuperAdmin User Management (Role Promotion & Demotion)
* **As a** SuperAdmin,
* **I want to** view all registered users and change their roles between `Customer` and `Admin`,
* **So that** I can delegate store administration responsibilities.

* **Acceptance Criteria:**
  * `GET /api/v1/superadmin/users`: Lists all users with pagination and role filter (`Customer`, `Admin`, `SuperAdmin`).
  * `PATCH /api/v1/superadmin/users/{id}/role`:
    * SuperAdmin can promote a `Customer` to `Admin`.
    * SuperAdmin can demote an `Admin` back to `Customer`.
    * Non-SuperAdmin accounts calling this endpoint receive **HTTP 403 Forbidden**.
  * **Safety Invariant**: A SuperAdmin **cannot** demote themselves or alter another SuperAdmin's role (preventing accidental total administrative lockout).

#### US-5.4: SuperAdmin Account Status Control
* **As a** SuperAdmin,
* **I want to** activate or deactivate user accounts,
* **So that** I can suspend abusive users or former admins.

* **Acceptance Criteria:**
  * `PATCH /api/v1/superadmin/users/{id}/status`: Accepts `{ "isActive": false }`.
  * Deactivated users are blocked from logging in (HTTP 401: *"Account is deactivated"*).

---

### Epic 6: Customer Reviews & Ratings

#### US-6.1: Submitting a Product Review
* **As an** authenticated customer,
* **I want to** submit a star rating (1 to 5) and written feedback on a product page,
* **So that** other shoppers can benefit from my verified experience.

* **Acceptance Criteria:**
  * **Endpoint**: `POST /api/v1/products/{productId}/reviews`
  * **Routing & Identity Binding**:
    * `ProductId` is parsed directly from the URL route parameter (`{productId}`).
    * Reviewer identity (`UserId`, `ReviewerName`, `ReviewerEmail`) is extracted securely on the server from the customer's authenticated **JWT claims**; it is not accepted in the request body to prevent spoofing.
  * **Authorization**:
    * Requires `Customer` role. Unauthenticated requests return **HTTP 401 Unauthorized**.
    * Administrative accounts (`Admin`, `SuperAdmin`) return **HTTP 403 Forbidden**.
  * **Payload & Validation**:
    * Request body only requires `Rating` (integer between 1 and 5) and `Comment` (5 to 1000 characters).
  * **Uniqueness Constraint**:
    * A customer can submit only **one review per product**. Submitting another review for the same product returns **HTTP 409 Conflict**.
  * **Rating Recomputation**:
    * Upon successful creation, the parent product's `ratingCount` is incremented by 1 and average `rating` is recalculated automatically.

#### US-6.2: Updating or Deleting Own Review
* **As an** authenticated customer,
* **I want to** edit or delete my existing review on a product,
* **So that** I can update my feedback if my experience with the item changes.

* **Acceptance Criteria:**
  * `PUT /api/v1/products/{productId}/reviews`: Allows the author customer to update their `rating` and `comment`. Recalculates product average rating.
  * `DELETE /api/v1/products/{productId}/reviews`: Deletes the customer's review and decrements `ratingCount`, recomputing the average rating.


---

### Epic 7: Frontend Developer Practice Tools

#### US-7.1: Artificial Network Latency Simulation
* **As a** frontend developer,
* **I want to** simulate slow mobile 3G or delayed server responses on demand,
* **So that** I can verify my UI loading skeletons, spinners, and disabled buttons.

* **Acceptance Criteria:**
  * Header `X-Simulate-Delay: <ms>` pauses execution for the requested milliseconds (capped at 10,000ms).

#### US-7.2: Artificial Error Status Code Simulation
* **As a** frontend developer,
* **I want to** force the backend to return specific HTTP error codes (e.g. 500, 503, 404, 403),
* **So that** I can test toast error notifications, error boundaries, and retry policies.

* **Acceptance Criteria:**
  * Header `X-Simulate-Status: <code>` forces immediate return of that HTTP status code with RFC 7807 Problem Details.

---

## 3. Non-Functional Requirements (NFRs)

| ID | Category | Requirement Description |
| :--- | :--- | :--- |
| **NFR-01** | **CORS Policy** | CORS must allow all origins (`*`), headers, and methods (`GET, POST, PUT, DELETE, PATCH, OPTIONS`) to permit immediate consumption from local frontends (`localhost:3000`, `localhost:5173`, etc.). |
| **NFR-02** | **Error Format** | All error responses must adhere to **RFC 7807 Problem Details** specification (`type`, `title`, `status`, `errors`, `traceId`). |
| **NFR-03** | **Role Separation** | Cart and Customer Checkout workflows are strictly partitioned from administrative roles (`Admin`, `SuperAdmin`), responding with HTTP 403 Forbidden. |
| **NFR-04** | **Data Integrity** | Hard-deleting a product from the catalog must never break past `Order` records because line items snapshot all critical display fields. |
| **NFR-05** | **Documentation** | Interactive OpenAPI / Swagger UI must be enabled at `/swagger` for manual testing of all Customer, Admin, and SuperAdmin endpoints. |
| **NFR-06** | **Stateless Live Mode** | In Branch 5 (public live demo), mutation operations simulate success responses without altering shared reference seed data. |
