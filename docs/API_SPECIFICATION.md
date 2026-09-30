# REST API Specification & Endpoint Contracts

> Complete REST contract, endpoints, parameters, and schemas for **FakeStoreAPI Local**.

---

## 1. Global Conventions

### 1.1. Base URL & Routing
Base URL: `http://localhost:5000/` (or configured `PORT`).
* `/auth`: Login and token issuance
* `/products`: Catalog browsing, filtering, and admin CRUD
* `/carts`: Customer shopping carts
* `/users`: User registration, profile updates, and admin oversight
* `/`: EJS documentation view

Identifiers are app-level sequential numbers (`1, 2, 3...`).

### 1.2. Payload Format
Endpoints return direct JSON payloads without outer `{ data: ... }` wrappers.

### 1.3. Permissions Matrix
* **Public**: `GET /products/*`, `POST /users` (signup), `POST /auth/login`, `GET /`.
* **Customer**: Own cart management (`/carts/*`) and own profile (`/users/:id`).
* **Admin**: Product CRUD (`/products/*`), user audits (`GET /users`), account deactivation (`PATCH /users/:id/active`), any user profile (`/users/:id`).
* **Cart Restriction**: Admins calling any `/carts` route receive **HTTP 403 Forbidden**.

### 1.4. HTTP Status Codes
| Code | Usage |
| :--- | :--- |
| `200 OK` | Successful GET, PUT, PATCH, DELETE. |
| `400 Bad Request` | Missing required fields or invalid operations (e.g. self-deactivation). |
| `401 Unauthorized` | Missing/invalid bearer token or account deleted. |
| `403 Forbidden` | Access denied (role restriction or deactivated account). |
| `404 Not Found` | Resource does not exist. |
| `500 Internal Error` | Server error. |

### 1.5. Standard Error Format
```json
{
  "status": "error",
  "message": "<error description>"
}
```

---

## 2. Auth API (`/auth`)

### 2.1. Login
* **POST** `/auth/login`
* **Access**: Public
* **Body**:
```json
{
  "username": "admin",
  "password": "123"
}
```
* **Response (200)**:
```json
{
  "token": "<jwt_string>",
  "id": 1,
  "username": "admin",
  "role": "admin"
}
```
* **Errors**: `400` (missing fields), `401` (invalid credentials), `403` (deactivated account).

---

## 3. Products API (`/products`)

### 3.1. List Products
* **GET** `/products`
* **Access**: Public
* **Query**: `limit` (int), `sort` (`asc`|`desc`), `sortby` (`id`|`name`|`title`|`price`).
* **Response (200)**:
```json
[
  {
    "id": 1,
    "title": "Fjallraven - Foldsack No. 1 Backpack",
    "price": 109.95,
    "description": "Your perfect pack for everyday use.",
    "category": "men's clothing",
    "image": "https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_t.png"
  }
]
```

### 3.2. Get Product by ID
* **GET** `/products/:id`
* **Access**: Public
* **Response (200)**: Product object or `null`.

### 3.3. Get Categories
* **GET** `/products/categories`
* **Access**: Public
* **Response (200)**: `["electronics", "jewelery", "men's clothing", "women's clothing"]`.

### 3.4. Get Products in Category
* **GET** `/products/category/:category`
* **Access**: Public
* **Query**: `limit`, `sort`, `sortby`.
* **Response (200)**: Array of matching products.

### 3.5. Create Product
* **POST** `/products`
* **Access**: Admin only (`Bearer <token>`)
* **Body**: `{ "title": "Mouse", "price": 49.99, "description": "...", "category": "electronics", "image": "..." }`
* **Response (200)**: Created product object with new `id`.
* **Errors**: `400` (missing title/price), `401` (unauthorized), `403` (non-admin).

### 3.6. Update Product
* **PUT|PATCH** `/products/:id`
* **Access**: Admin only
* **Body**: Partial or full fields (incoming `id` ignored).
* **Response (200)**: Updated product object.
* **Errors**: `404` (not found).

### 3.7. Delete Product
* **DELETE** `/products/:id`
* **Access**: Admin only
* **Response (200)**: Deleted product object.
* **Errors**: `404` (not found).

---

## 4. Carts API (`/carts`)

> **Note**: All routes require `authenticate` + `requireCustomer`. Admins receive **403 Forbidden**.

### 4.1. Get Caller's Carts
* **GET** `/carts`
* **Access**: Customer only
* **Query**: `limit`, `sort` (`asc`|`desc`), `startdate`, `enddate`.
* **Behavior**: Auto-creates and returns an empty cart if customer owns none.
* **Response (200)**:
```json
[
  {
    "id": 1,
    "userId": 3,
    "date": "2020-01-01T00:00:00.000Z",
    "products": [
      { "productId": 1, "quantity": 4, "priceAtAdd": 109.95 }
    ]
  }
]
```

### 4.2. Get Cart by ID
* **GET** `/carts/:id`
* **Access**: Customer only (owner only)
* **Errors**: `403` (not owner), `404` (not found).

### 4.3. Get Carts by User ID
* **GET** `/carts/user/:userid`
* **Access**: Customer only (`:userid` must match caller).
* **Errors**: `403` (mismatched user).

### 4.4. Add Item to Active Cart
* **POST** `/carts`
* **Access**: Customer only
* **Body**: `{ "productId": 1, "quantity": 2 }`
* **Behavior**: Bumps quantity if product already exists in cart; snapshots catalog price for new items.
* **Response (200)**: Updated cart object.
* **Errors**: `400` (missing productId), `404` (product not found).

### 4.5. Update Quantity in Cart
* **PUT|PATCH** `/carts/products/:productId`
* **Access**: Customer only
* **Body**: `{ "quantity": 5 }`
* **Response (200)**: Updated cart object.
* **Errors**: `400` (missing quantity), `404` (not found).

### 4.6. Remove Item from Cart
* **DELETE** `/carts/products/:productId`
* **Access**: Customer only
* **Response (200)**: Updated cart object.
* **Errors**: `404` (not found).

### 4.7. Delete Cart
* **DELETE** `/carts/:id`
* **Access**: Customer only (owner only)
* **Response (200)**: Deleted cart object.
* **Errors**: `403` (not owner), `404` (not found).

---

## 5. Users API (`/users`)

### 5.1. Signup
* **POST** `/users`
* **Access**: Public
* **Body**:
```json
{
  "email": "sarah@example.com",
  "username": "sarahc",
  "password": "pw",
  "name": { "firstname": "Sarah", "lastname": "Connor" },
  "address": { "city": "LA", "street": "Main", "number": 10, "zipcode": "90001", "geolocation": { "lat": "0", "long": "0" } },
  "phone": "555-0100"
}
```
* **Response (200)**: Created user (`role: "customer"`, `active: true`).
* **Errors**: `400` (missing required fields).

### 5.2. List All Users
* **GET** `/users`
* **Access**: Admin only
* **Query**: `limit`, `sort`.
* **Response (200)**: Array of user objects.

### 5.3. Get User by ID
* **GET** `/users/:id`
* **Access**: Owner or Admin
* **Response (200)**: User object or `null`.
* **Errors**: `403` (unauthorized caller).

### 5.4. Update Profile
* **PUT|PATCH** `/users/:id`
* **Access**: Owner or Admin
* **Body**: User fields. Dot-path flattened to preserve nested keys. Non-admins cannot set `role` or `active`.
* **Response (200)**: Updated user object.
* **Errors**: `403` (unauthorized), `404` (not found).

### 5.5. Toggle Active Status
* **PATCH** `/users/:id/active`
* **Access**: Admin only
* **Body**: `{ "active": false }`
* **Response (200)**: Updated user object.
* **Errors**: `400` (non-boolean or self-deactivation), `403` (non-admin), `404` (not found).

### 5.6. Delete User
* **DELETE** `/users/:id`
* **Access**: Owner or Admin
* **Response (200)**: Deleted user object.
* **Errors**: `403` (unauthorized), `404` (not found).

---

## 6. Home View (`/`)

* **GET** `/`
* **Access**: Public
* **Description**: Serves interactive EJS documentation.
