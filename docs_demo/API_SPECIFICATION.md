# REST API Specification & Endpoint Contracts

This document specifies the complete REST API contract, endpoints, query parameters, request/response JSON schemas, and error conventions for the **E-Commerce Practice API**.

---

## 1. Global Conventions

### 1.1. Base URL & Routing
All API routes are prefixed with `/api/v1`. Resource identifiers use **GUIDs** (e.g. `550e8400-e29b-41d4-a716-446655440000`):
```text
https://localhost:7123/api/v1/...
https://api.yourdomain.com/api/v1/...
```

### 1.2. Direct REST Payloads
In alignment with FakeStoreAPI & DummyJSON, endpoints return **direct payloads** without an unnecessary outer `data: { ... }` wrapper:
* Single resource: returns the object directly (`{ "id": "...", "title": "..." }`).
* Paged collections: returns `{ "items": [...], "totalCount": 100, "page": 1, "limit": 10, "totalPages": 10, "hasNextPage": true, "hasPreviousPage": false }`.

### 1.3. Role-Based Permissions Summary
* **Customer**: Browses catalog, manages own cart, submits orders, views personal order history, writes reviews, manages personal address book.
* **Admin**: Catalog CRUD (products, categories, brands), Admin Order Management (view all orders, update fulfillment status, attach tracking numbers, cancel orders with restock). Cart operations return **HTTP 403 Forbidden**.
* **SuperAdmin**: All Admin privileges + User Management (view all users, promote Customer to Admin, demote Admin to Customer, activate/deactivate accounts). Cart operations return **HTTP 403 Forbidden**.

### 1.4. HTTP Status Codes
| Code | Meaning | Usage |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Standard response for GET, PUT, PATCH, DELETE |
| `201 Created` | Resource created | Returned on successful POST with `Location` header |
| `204 No Content` | Success with no body | Optional for DELETE operations |
| `400 Bad Request` | Client validation failure | Invalid payload, missing fields, invalid ranges |
| `401 Unauthorized` | Missing / Invalid Token | Endpoint requires valid JWT bearer token |
| `403 Forbidden` | Insufficient permissions / Role restriction | e.g. Customer attempting Admin action, or Admin attempting Cart action |
| `404 Not Found` | Resource doesn't exist | Invalid ID or slug |
| `409 Conflict` | Resource conflict | e.g. Email already registered, duplicate slug |
| `500 Internal Error` | Unhandled server error | Exception in backend |

### 1.5. Standard Error Response (RFC 7807 Problem Details)
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Email": ["The Email field is required."],
    "Price": ["Price must be greater than zero."]
  },
  "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00"
}
```

---

## 2. Authentication & Users API (`/api/v1/auth`, `/api/v1/users`)

### 2.1. Register User
* **Endpoint**: `POST /api/v1/auth/register`
* **Access**: Public
* **Request Body**:
```json
{
  "email": "sarah.connor@example.com",
  "username": "sarahc",
  "password": "Password123!",
  "firstName": "Sarah",
  "lastName": "Connor",
  "phoneNumber": "+1234567890"
}
```
* **Response (201 Created)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "rf_9f8e7d6c5b4a",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "id": "e4b6c310-91bc-4e2b-b4f0-4fa2c92150a1",
    "email": "sarah.connor@example.com",
    "username": "sarahc",
    "firstName": "Sarah",
    "lastName": "Connor",
    "role": "Customer"
  }
}
```

### 2.2. Login
* **Endpoint**: `POST /api/v1/auth/login`
* **Access**: Public
* **Request Body**:
```json
{
  "email": "sarah.connor@example.com",
  "password": "Password123!"
}
```
* **Response (200 OK)**: Returns tokens and user summary.

### 2.3. Get Current User Profile & Saved Addresses
* **Endpoint**: `GET /api/v1/users/me`
* **Access**: Authenticated (`Bearer <token>`)
* **Response (200 OK)**:
```json
{
  "id": "e4b6c310-91bc-4e2b-b4f0-4fa2c92150a1",
  "email": "sarah.connor@example.com",
  "username": "sarahc",
  "firstName": "Sarah",
  "lastName": "Connor",
  "phoneNumber": "+1234567890",
  "avatarUrl": "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
  "role": "Customer",
  "addresses": [
    {
      "id": "c20ad411-6677-4b89-a2e5-39d1ff04d193",
      "street": "100 Market St, Apt 4B",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94105",
      "country": "USA",
      "isDefault": true
    }
  ]
}
```

### 2.4. Add Address to Address Book
* **Endpoint**: `POST /api/v1/users/me/addresses`
* **Access**: Authenticated (Customer)
* **Request Body**:
```json
{
  "street": "200 Pine Street, Suite 500",
  "city": "San Francisco",
  "state": "CA",
  "postalCode": "94104",
  "country": "USA",
  "isDefault": false
}
```

---

## 3. SuperAdmin User Management API (`/api/v1/superadmin/users`)

### 3.1. List All System Users
* **Endpoint**: `GET /api/v1/superadmin/users`
* **Access**: SuperAdmin only
* **Query Parameters**: `page`, `limit`, `role` (`Customer`, `Admin`, `SuperAdmin`), `search`, `isActive`
* **Response (200 OK)**:
```json
{
  "items": [
    {
      "id": "e4b6c310-91bc-4e2b-b4f0-4fa2c92150a1",
      "email": "sarah.connor@example.com",
      "username": "sarahc",
      "firstName": "Sarah",
      "lastName": "Connor",
      "role": "Customer",
      "isActive": true,
      "createdAtUtc": "2026-08-10T14:30:00Z",
      "orderCount": 5
    }
  ],
  "totalCount": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

### 3.2. Promote or Demote User Role
* **Endpoint**: `PATCH /api/v1/superadmin/users/{id}/role`
* **Access**: SuperAdmin only
* **Request Body**:
```json
{
  "role": "Admin"
}
```
* **Response (200 OK)**:
```json
{
  "id": "e4b6c310-91bc-4e2b-b4f0-4fa2c92150a1",
  "username": "sarahc",
  "role": "Admin",
  "message": "User sarahc was successfully promoted to Admin."
}
```

### 3.3. Toggle User Account Status (Activate/Deactivate)
* **Endpoint**: `PATCH /api/v1/superadmin/users/{id}/status`
* **Access**: SuperAdmin only
* **Request Body**:
```json
{
  "isActive": false
}
```

---

## 4. Products Catalog API (`/api/v1/products`)

### 4.1. Get All Products (Filtered & Paginated)
* **Endpoint**: `GET /api/v1/products`
* **Access**: Public
* **Query Parameters**:
  * `page`, `limit` (default: 1, 10)
  * `search`, `categorySlug`, `brandSlug`
  * `minPrice`, `maxPrice`, `minRating`
  * `inStockOnly`, `isFeatured`
  * `sortBy` (`price`, `rating`, `title`, `date`), `order` (`asc`, `desc`)
* **Response (200 OK)**:
```json
{
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "title": "Sony WH-1000XM5 Wireless Headphones",
      "slug": "sony-wh-1000xm5-wireless-headphones",
      "description": "Industry-leading noise canceling with two processors and 8 microphones.",
      "price": 399.99,
      "discountPercentage": 15.0,
      "discountedPrice": 339.99,
      "rating": 4.8,
      "ratingCount": 248,
      "stock": 42,
      "sku": "SONY-WH1000XM5-BLK",
      "thumbnail": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
      "images": [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
        "https://images.unsplash.com/photo-1484704849700-f032a568e944"
      ],
      "tags": ["audio", "bluetooth", "noise-canceling"],
      "isFeatured": true,
      "category": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Audio",
        "slug": "audio"
      },
      "brand": {
        "id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
        "name": "Sony",
        "slug": "sony"
      }
    }
  ],
  "totalCount": 60,
  "page": 1,
  "limit": 10,
  "totalPages": 6,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

### 4.2. Create Product
* **Endpoint**: `POST /api/v1/products`
* **Access**: Admin or SuperAdmin
* **Response (201 Created)**: Returns created product.

### 4.3. Delete Product
* **Endpoint**: `DELETE /api/v1/products/{id}`
* **Access**: Admin or SuperAdmin
* **Response (200 OK)**: `{ "success": true, "message": "Product deleted successfully." }`

---

## 5. Shopping Cart API (`/api/v1/cart`)

> ⚠️ **Administrative Access Restriction**:
> If an authenticated `Admin` or `SuperAdmin` attempts to access any `/api/v1/cart/*` endpoint, the API immediately responds with:
> **HTTP 403 Forbidden**:
> ```json
> {
>   "type": "https://tools.ietf.org/html/rfc7231#section-6.5.3",
>   "title": "Forbidden",
>   "status": 403,
>   "detail": "Administrative accounts (Admin/SuperAdmin) are restricted from using the shopping cart or placing customer orders."
> }
> ```

### 5.1. Get Cart
* **Endpoint**: `GET /api/v1/cart`
* **Access**: Customer or Guest (`X-Cart-Id: <UUID>`)
* **Response (200 OK)**:
```json
{
  "id": "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
  "userId": "e4b6c310-91bc-4e2b-b4f0-4fa2c92150a1",
  "items": [
    {
      "id": "11223344-5566-7788-99aa-bbccddeeff00",
      "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "productTitle": "Sony WH-1000XM5 Wireless Headphones",
      "productThumbnail": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
      "unitPrice": 339.99,
      "quantity": 2,
      "lineTotal": 679.98
    }
  ],
  "subtotal": 679.98,
  "discountTotal": 0.00,
  "grandTotal": 679.98,
  "totalQuantity": 2,
  "updatedAtUtc": "2026-09-04T12:15:00Z"
}
```

### 5.2. Add Item to Cart
* **Endpoint**: `POST /api/v1/cart/items`
* **Request Body**: `{ "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "quantity": 1 }`

---

## 6. Customer Checkout & Orders API (`/api/v1/orders`)

### 6.1. Customer Checkout
* **Endpoint**: `POST /api/v1/orders/checkout`
* **Access**: Customer (Admins receive 403 Forbidden)
* **Request Body**:
```json
{
  "address": {
    "street": "100 Market St, Apt 4B",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94105",
    "country": "USA"
  },
  "paymentMethod": "CreditCard",
  "couponCode": "SAVE20"
}
```
* **Response (201 Created)**: Returns order confirmation with `orderNumber`, status, and snapshotted line items.

### 6.2. Customer Order History
* **Endpoint**: `GET /api/v1/orders`
* **Access**: Authenticated Customer (returns personal orders only)

### 6.3. Customer Cancel Order
* **Endpoint**: `POST /api/v1/orders/{id}/cancel`
* **Access**: Authenticated Customer (Allowed only if status is `Pending` or `Processing`)

---

## 7. Admin Order Management API (`/api/v1/admin/orders`)

### 7.1. View All Orders Across Platform
* **Endpoint**: `GET /api/v1/admin/orders`
* **Access**: Admin or SuperAdmin
* **Query Parameters**:
  * `page`, `limit` (default: 1, 10)
  * `status` (`Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`)
  * `paymentStatus` (`Pending`, `Paid`, `Failed`, `Refunded`)
  * `orderNumber` (string)
  * `customerEmail` (string)
  * `dateFrom`, `dateTo` (UTC)
* **Response (200 OK)**:
```json
{
  "items": [
    {
      "id": "77889900-aabb-ccdd-eeff-001122334455",
      "orderNumber": "ORD-2026-84192",
      "createdAtUtc": "2026-09-04T12:20:00Z",
      "status": "Processing",
      "paymentStatus": "Paid",
      "paymentMethod": "CreditCard",
      "totalAmount": 587.50,
      "trackingNumber": null,
      "customer": {
        "id": "e4b6c310-91bc-4e2b-b4f0-4fa2c92150a1",
        "email": "sarah.connor@example.com",
        "firstName": "Sarah",
        "lastName": "Connor"
      },
      "deliveryAddress": {
        "street": "100 Market St, Apt 4B",
        "city": "San Francisco",
        "state": "CA",
        "postalCode": "94105",
        "country": "USA"
      },
      "itemCount": 2
    }
  ],
  "totalCount": 18,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

### 7.2. Update Order Fulfillment Status & Tracking Number
* **Endpoint**: `PATCH /api/v1/admin/orders/{id}/status`
* **Access**: Admin or SuperAdmin
* **Request Body**:
```json
{
  "status": "Shipped",
  "trackingNumber": "TRK-FEDEX-984128"
}
```
* **Response (200 OK)**:
```json
{
  "id": "77889900-aabb-ccdd-eeff-001122334455",
  "orderNumber": "ORD-2026-84192",
  "status": "Shipped",
  "trackingNumber": "TRK-FEDEX-984128",
  "updatedAtUtc": "2026-09-04T16:00:00Z"
}
```

### 7.3. Admin Order Cancellation (With Restock)
* **Endpoint**: `POST /api/v1/admin/orders/{id}/cancel`
* **Access**: Admin or SuperAdmin
* **Request Body**:
```json
{
  "cancellationReason": "Customer requested cancellation via support ticket."
}
```
* **Response (200 OK)**:
```json
{
  "id": "77889900-aabb-ccdd-eeff-001122334455",
  "status": "Cancelled",
  "paymentStatus": "Refunded",
  "message": "Order was cancelled and inventory restored to stock."
}
```

---

## 8. Customer Reviews API (`/api/v1/products/{productId}/reviews`)

> 💡 **Note on Identity & Route Parameters**:
> * `productId` is passed in the **URL route** (`/api/v1/products/{productId}/reviews`).
> * `userId`, `reviewerName`, and `reviewerEmail` are extracted directly on the server from the customer's authenticated **JWT token claims**. The client does NOT pass them in the request body, preventing identity spoofing.
> * Requires `Customer` role. Unauthenticated requests receive **HTTP 401 Unauthorized**; Admin/SuperAdmin accounts receive **HTTP 403 Forbidden**.
> * A customer may only review a product once. Repeated calls return **HTTP 409 Conflict**.

### 8.1. Get Product Reviews
* **Endpoint**: `GET /api/v1/products/{productId}/reviews`
* **Access**: Public
* **Query Parameters**: `page` (int, default: 1), `limit` (int, default: 5)
* **Response (200 OK)**:
```json
{
  "items": [
    {
      "id": "99887766-5544-3322-1100-aabbccddeeff",
      "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "userId": "e4b6c310-91bc-4e2b-b4f0-4fa2c92150a1",
      "reviewerName": "Sarah Connor",
      "rating": 5,
      "comment": "Incredible sound quality and active noise cancellation. Battery lasts for days.",
      "createdAtUtc": "2026-08-20T14:30:00Z"
    }
  ],
  "totalCount": 24,
  "page": 1,
  "limit": 5,
  "totalPages": 5,
  "averageRating": 4.8
}
```

### 8.2. Submit Product Review
* **Endpoint**: `POST /api/v1/products/{productId}/reviews`
* **Access**: Authenticated Customer (`Authorization: Bearer <token>`)
* **Request Body**:
```json
{
  "rating": 5,
  "comment": "Incredible sound quality and active noise cancellation. Battery lasts for days."
}
```
* **Response (201 Created)**:
```json
{
  "id": "99887766-5544-3322-1100-aabbccddeeff",
  "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "userId": "e4b6c310-91bc-4e2b-b4f0-4fa2c92150a1",
  "reviewerName": "Sarah Connor",
  "rating": 5,
  "comment": "Incredible sound quality and active noise cancellation. Battery lasts for days.",
  "createdAtUtc": "2026-09-04T16:50:00Z"
}
```

### 8.3. Update Own Review
* **Endpoint**: `PUT /api/v1/products/{productId}/reviews`
* **Access**: Authenticated Customer (`Authorization: Bearer <token>`)
* **Request Body**:
```json
{
  "rating": 4,
  "comment": "Revised: Sound is still great, but ear cups get slightly warm after 4 hours."
}
```
* **Response (200 OK)**: Returns updated review object.

### 8.4. Delete Own Review
* **Endpoint**: `DELETE /api/v1/products/{productId}/reviews`
* **Access**: Authenticated Customer
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Your review was successfully removed and product rating recalculated."
}
```

---

## 9. Frontend Developer Simulation Controls

Pass special HTTP headers to any endpoint to test client states:

| Header | Example Value | Effect |
| :--- | :--- | :--- |
| `X-Simulate-Delay` | `1500` | Introduces an artificial 1500ms delay to test UI skeletons/spinners. |
| `X-Simulate-Status`| `500` | Forces the server to respond with HTTP 500 to test UI error toasts. |
| `X-Simulate-Status`| `404` | Forces an HTTP 404 response to test Not Found UI screens. |

