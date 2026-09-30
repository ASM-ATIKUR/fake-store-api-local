# Entity & Schema Field Specifications

> Schemas, constraints, payloads, parameters, and serialization contracts for **FakeStoreAPI Local**.

---

## 1. Product Catalog Domain

### 1.1. Product

#### Mongoose Schema: `Product` (`model/product.js`)
| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Number` | **Yes** | Sequential integer via `util/id.js`. | Public ID. |
| `title` | `String` | **Yes** | Non-empty. | Product name. |
| `price` | `Number` | **Yes** | Min: 0. | Retail price. |
| `description`| `String` | No | — | Product description. |
| `image` | `String` | No | URL string. | Image URL. |
| `category` | `String` | No | — | Category name. |

*Seed Fixtures*: May include optional `rating: { rate: Number, count: Number }`.

#### Request Payloads: Product
* **Create (`POST /products`)**: Requires `title` (String), `price` (Number). Optional: `description`, `image`, `category`.
* **Update (`PUT|PATCH /products/:id`)**: Any product fields. Incoming `id` is stripped (`delete req.body.id`).

#### Query Parameters: Products (`GET /products`, `GET /products/category/:category`)
| Parameter | Type | Default | Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `limit` | `Number` | `0` (all) | Positive integer | Max items returned. |
| `sort` | `String` | `'asc'` | `'asc'`, `'desc'` | Sort order (`desc` = descending; otherwise ascending). |
| `sortby` | `String` | `'id'` | `'id'`, `'name'`, `'title'`, `'price'` | Sort field. `name`/`title` uses case-insensitive `en` collation. |

#### Response: Product
```json
{
  "id": 1,
  "title": "Fjallraven - Foldsack No. 1 Backpack",
  "price": 109.95,
  "description": "Your perfect pack for everyday use.",
  "category": "men's clothing",
  "image": "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png"
}
```
*Note*: `_id` and `__v` are stripped via `.select(['-_id'])`.

---

## 2. Shopping Cart Domain

### 2.1. Cart & CartProduct

#### Subdocument Schema: `CartProduct` (`model/cart.js`, `_id: false`)
| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `productId` | `Number` | **Yes** | References `Product.id`. | Product ID. |
| `quantity` | `Number` | **Yes** | Whole integer >= 1. | Unit count. |
| `priceAtAdd`| `Number` | Optional | Min: 0. Set server-side from catalog. | Price snapshot. |

*Virtuals*: `product` (populates `Product`), `subtotal` (getter: `priceAtAdd * quantity`).

#### Parent Schema: `Cart` (`model/cart.js`)
| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Number` | **Yes** | Unique integer via `saveWithFreshId()`. | Cart ID. |
| `userId` | `Number` | **Yes** | Indexed. References `User.id`. | Owner ID. |
| `date` | `Date` | **Yes** | Default: `Date.now`. | Cart timestamp. |
| `products` | `[CartProduct]` | No | Must not contain duplicate `productId` entries. | Line items. |

*Virtuals*: `user` (populates `User`).

#### Request Payloads: Cart
* **Add Item (`POST /carts`)**: `{ productId: Number, quantity?: Number }` (default quantity: 1).
  * 404 if product not in catalog.
  * If item already exists in cart, increments quantity and preserves `priceAtAdd`.
  * If new, appends item with `priceAtAdd = product.price`.
* **Update Quantity (`PUT|PATCH /carts/products/:productId`)**: `{ quantity: Number }` (integer >= 1).

#### Query Parameters: Carts (`GET /carts`)
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `limit` | `Number` | `0` (all) | Max carts returned. |
| `sort` | `String` | `'asc'` | Sorts by cart `id` (`desc` or `asc`). |
| `startdate` | `Date` | `'1970-01-01'` | Start filter (`date >= startdate`). |
| `enddate` | `Date` | `new Date()` | End filter (`date < enddate`). |

#### Response: Cart
```json
{
  "id": 1,
  "userId": 3,
  "date": "2020-01-01T00:00:00.000Z",
  "products": [
    { "productId": 1, "quantity": 4, "priceAtAdd": 109.95 }
  ]
}
```
*Note*: `_id` removed from cart and lines. If customer has no carts, `GET /carts` returns `[ newEmptyCart ]`.

---

## 3. Users & Auth Domain

### 3.1. User

#### Mongoose Schema: `User` (`model/user.js`)
| Field | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `Number` | **Yes** | Unique integer via `saveWithFreshId()`. | User ID. |
| `email` | `String` | **Yes** | — | User email. |
| `username` | `String` | **Yes** | — | Login username. |
| `password` | `String` | **Yes** | Plaintext. | Password. |
| `name` | `Subdocument` | **Yes** | `{ firstname: String, lastname: String }`. | User name. |
| `address` | `Subdocument` | No | `{ city, street, number, zipcode, geolocation }`. | Address. |
| `phone` | `String` | No | — | Phone number. |
| `role` | `String` | No | Enum: `['customer', 'admin']`. Default: `'customer'`. | User role. |
| `active` | `Boolean` | No | Default: `true`. | Account state. |

#### Request Payloads: Users & Auth
* **Signup (`POST /users`)**: `{ email, username, password, name: { firstname, lastname }, address?, phone? }`. Default: `role: 'customer'`, `active: true`.
* **Update Profile (`PUT|PATCH /users/:id`)**: Any user fields. Flattened to dot-paths (`toDotPaths`). Non-admin edits strip `role` and `active`.
* **Set Active (`PATCH /users/:id/active`)**: `{ active: Boolean }` (Admin only; cannot deactivate self).
* **Login (`POST /auth/login`)**: `{ username, password }`. Returns token and user summary.

#### Responses: Login & User
```json
// POST /auth/login
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id": 1,
  "username": "admin",
  "role": "admin"
}
```
```json
// GET /users/:id
{
  "id": 3,
  "email": "kevin@gmail.com",
  "username": "customer",
  "name": { "firstname": "kevin", "lastname": "ryan" },
  "address": { "city": "Cullman", "street": "Frances Ct", "number": 86, "zipcode": "29567-1452" },
  "phone": "1-567-094-1345",
  "role": "customer",
  "active": true
}
```

---

## 4. Sanitization & Transformation Summary

| Mechanism | Implementation | Location | Purpose |
| :--- | :--- | :--- | :--- |
| **ID Stripping** | `.select(['-_id'])` / `delete cart._id` | Controllers | Hides MongoDB ObjectIds. |
| **Dot-Paths** | `toDotPaths(req.body)` | `util/flatten.js` | Prevents `$set` from erasing sibling nested keys. |
| **Privilege Guard** | `delete req.body.role; delete req.body.active;` | `controller/user.js` | Prevents non-admin self-promotion. |
| **ID Guard** | `delete req.body.id;` | Controllers | Blocks primary key mutation. |
| **Price Snapshot** | `priceAtAdd: product.price` | `controller/cart.js` | Enforces catalog pricing on cart add. |
