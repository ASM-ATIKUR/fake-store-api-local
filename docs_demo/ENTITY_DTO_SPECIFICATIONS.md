# Entity & DTO Field Specifications

> Language-agnostic specification of fields, data types, validation constraints, and contracts for all **Domain Entities** and **Data Transfer Objects (DTOs)**.

---

## 1. Catalog & Taxonomy

### 1.1. Product

#### Domain Entity: `Product`
| Field Name | Conceptual Type | Nullability | Constraints & Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | UUID | Mandatory | Primary Key, auto-generated | Unique product ID. |
| `Title` | String | Mandatory | Max 200 characters, non-empty | Commercial name of the product. |
| `Slug` | String | Mandatory | Max 250 characters, unique, URL-safe | SEO-friendly URL identifier (e.g. `sony-wh-1000xm5`). |
| `Description` | String | Mandatory | Max 2000 characters | Full product marketing and technical description. |
| `Price` | Decimal | Mandatory | Precision (18, 2), Min > 0.00 | Standard retail selling price before discounts. |
| `DiscountPercentage` | Decimal | Mandatory | Range: 0.00 to 99.99, default: 0.00 | Promotional discount percentage. |
| `DiscountedPrice` | Decimal | Computed | Formula: `Price * (1 - DiscountPercentage / 100)` | Effective selling price after discount. |
| `Rating` | Decimal | Mandatory | Precision (3, 2), Range: 0.00 to 5.00 | Average rating score from customer reviews. |
| `RatingCount` | Integer | Mandatory | Min: 0, default: 0 | Total number of approved reviews. |
| `Stock` | Integer | Mandatory | Min: 0, default: 0 | Current warehouse available inventory. |
| `SKU` | String | Mandatory | Max 50 characters, unique alphanumeric | Stock Keeping Unit inventory code. |
| `Thumbnail` | String | Mandatory | Valid URL format | Primary display image for cards and lists. |
| `Images` | List of Strings | Mandatory | Array of valid image URLs, min: 0, max: 10 | Secondary gallery images for product detail views. |
| `Tags` | List of Strings | Mandatory | Array of keyword strings (e.g. `["audio", "bass"]`) | Search keywords and filter facets. |
| `IsFeatured` | Boolean | Mandatory | Default: `false` | Flag to display item on homepage banners. |
| `IsActive` | Boolean | Mandatory | Default: `true` | Visibility toggle (active vs archived). |
| `CategoryId` | UUID | Mandatory | Foreign key referencing `Category.Id` | Assigned classification category. |
| `BrandId` | UUID | Mandatory | Foreign key referencing `Brand.Id` | Manufacturing brand reference. |
| `CreatedAtUtc` | DateTime | Mandatory | UTC timestamp, immutable | Timestamp when product was initially listed. |
| `UpdatedAtUtc` | DateTime | Optional | Nullable UTC timestamp | Timestamp of last catalog edit. |

#### Request DTO: `CreateProductRequest` (Admin & SuperAdmin only)
| Field Name | Type | Presence | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Title` | String | Required | 3 to 200 characters | Name of the product to create. |
| `Description` | String | Required | 10 to 2000 characters | Detailed product overview. |
| `Price` | Decimal | Required | Greater than 0.00 | Retail price. |
| `DiscountPercentage` | Decimal | Optional | 0.00 to 99.99 (default: 0) | Initial discount. |
| `Stock` | Integer | Required | Greater than or equal to 0 | Starting inventory count. |
| `SKU` | String | Required | 3 to 50 alphanumeric characters | Unique SKU. |
| `Thumbnail` | String | Required | Valid image URL | Primary image. |
| `Images` | List of Strings | Optional | Max 10 valid image URLs | Gallery photos. |
| `Tags` | List of Strings | Optional | Max 15 tags | Search keywords. |
| `IsFeatured` | Boolean | Optional | Default: `false` | Featured badge. |
| `CategoryId` | UUID | Required | Must reference an existing Category | Target category ID. |
| `BrandId` | UUID | Required | Must reference an existing Brand | Target brand ID. |

#### Request DTO: `ProductFilterParams` (Query Parameters)
| Parameter | Type | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | Integer | 1 | Min: 1 | Requested page index. |
| `limit` | Integer | 10 | Min: 1, Max: 50 | Items per page. |
| `search` | String | null | Max 100 characters | Free text search across title, description, tags. |
| `categorySlug` | String | null | Alphanumeric slug | Filter by category. |
| `brandSlug` | String | null | Alphanumeric slug | Filter by brand. |
| `minPrice` | Decimal | null | Greater than or equal to 0 | Lower price boundary. |
| `maxPrice` | Decimal | null | Greater than or equal to `minPrice` | Upper price boundary. |
| `minRating` | Decimal | null | Range: 1.0 to 5.0 | Minimum average rating threshold. |
| `inStockOnly` | Boolean | false | Boolean flag | If true, only returns items with `Stock > 0`. |
| `isFeatured` | Boolean | null | Boolean flag | Filter by featured flag. |
| `sortBy` | String | `date` | Enum: `price`, `rating`, `title`, `date` | Sort attribute. |
| `order` | String | `desc` | Enum: `asc`, `desc` | Sort direction. |

#### Response DTO: `ProductResponse`
| Field Name | Type | Always Present | Description |
| :--- | :--- | :--- | :--- |
| `Id` | UUID | Yes | Product unique identifier. |
| `Title` | String | Yes | Product name. |
| `Slug` | String | Yes | URL slug. |
| `Description` | String | Yes | Full description. |
| `Price` | Decimal | Yes | Retail price. |
| `DiscountPercentage` | Decimal | Yes | Discount percentage applied. |
| `DiscountedPrice` | Decimal | Yes | Computed final price. |
| `Rating` | Decimal | Yes | Average star score (0 - 5). |
| `RatingCount` | Integer | Yes | Count of customer reviews. |
| `Stock` | Integer | Yes | Current units in stock. |
| `SKU` | String | Yes | SKU code. |
| `Thumbnail` | String | Yes | Image URL. |
| `Images` | List of Strings | Yes | Array of gallery image URLs. |
| `Tags` | List of Strings | Yes | Array of tags. |
| `IsFeatured` | Boolean | Yes | Featured status. |
| `Category` | CategorySummary | Optional | Embedded category object (`Id`, `Name`, `Slug`). |
| `Brand` | BrandSummary | Optional | Embedded brand object (`Id`, `Name`, `Slug`). |

---

### 1.2. Category & Brand

#### Domain Entity: `Category`
| Field Name | Conceptual Type | Nullability | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | UUID | Mandatory | Primary Key | Unique category ID. |
| `Name` | String | Mandatory | Max 100 characters | Category display name. |
| `Slug` | String | Mandatory | Max 120 characters, unique | SEO slug (e.g. `smartphones`). |
| `Description` | String | Optional | Max 500 characters | Category summary. |
| `ImageUrl` | String | Optional | Valid image URL | Promotional banner or icon. |
| `ParentCategoryId` | UUID | Optional | Self-referencing FK | Parent category ID for nested subcategories. |

#### Domain Entity: `Brand`
| Field Name | Conceptual Type | Nullability | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | UUID | Mandatory | Primary Key | Unique brand ID. |
| `Name` | String | Mandatory | Max 100 characters | Official company/brand name. |
| `Slug` | String | Mandatory | Max 120 characters, unique | SEO slug (e.g. `apple`). |
| `LogoUrl` | String | Optional | Valid image URL | Brand logo image. |
| `Website` | String | Optional | Valid URL | Brand official homepage. |

---

## 2. Customer Reviews

> **Context & Authorization**:
> Reviews are submitted to the nested endpoint `POST /api/v1/products/{productId}/reviews`.
> * **`ProductId`** is obtained directly from the **URL Route Parameter** (`{productId}`).
> * **`UserId`**, **`ReviewerName`**, and **`ReviewerEmail`** are extracted securely on the server from the authenticated customer's **JWT Token Claims** (`NameIdentifier`, `Name`, `Email`). Clients cannot spoof or tamper with reviewer identity.
> * Reviews require an authenticated `Customer` account (HTTP 401 if unauthenticated, HTTP 403 if Admin).
> * Uniqueness: A customer can submit only **one review per product** (duplicate submissions return HTTP 409 Conflict).

#### Domain Entity: `Review`
| Field Name | Conceptual Type | Nullability | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | UUID | Mandatory | Primary Key | Unique review ID. |
| `ProductId` | UUID | Mandatory | Foreign Key referencing `Product.Id` | Target product being reviewed. |
| `UserId` | UUID | Mandatory | Foreign Key referencing `User.Id` | Author customer account. |
| `ReviewerName` | String | Mandatory | Copied from `User.FirstName + LastName` | Reviewer display name. |
| `ReviewerEmail` | String | Mandatory | Copied from `User.Email` | Reviewer contact email. |
| `Rating` | Integer | Mandatory | Range: 1 to 5 | Star score awarded (1 to 5). |
| `Comment` | String | Mandatory | Max 1000 characters | Textual review comments. |
| `CreatedAtUtc` | DateTime | Mandatory | UTC timestamp | Date and time review was posted. |

*Unique Composite Constraint*: `(ProductId, UserId)` must be unique.

#### Request DTO: `SubmitReviewRequest` (Request Body)
| Field Name | Type | Presence | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Rating` | Integer | Required | Integer between 1 and 5 | Star score (1 = poor, 5 = excellent). |
| `Comment` | String | Required | 5 to 1000 characters | Text review feedback. |

*(Note: `ProductId` is passed via URL route; `UserId`, `ReviewerName`, and `ReviewerEmail` are supplied via the user's JWT token).*

#### Request DTO: `UpdateReviewRequest` (Request Body for `PUT /api/v1/products/{productId}/reviews`)
| Field Name | Type | Presence | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Rating` | Integer | Required | Integer between 1 and 5 | Updated star score. |
| `Comment` | String | Required | 5 to 1000 characters | Updated text feedback. |

#### Response DTO: `ReviewResponse`
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `Id` | UUID | Review unique identifier. |
| `ProductId` | UUID | Target product ID. |
| `UserId` | UUID | Author customer account ID. |
| `ReviewerName` | String | Author display name. |
| `Rating` | Integer | Star rating (1 - 5). |
| `Comment` | String | Review comment text. |
| `CreatedAtUtc` | DateTime | Timestamp posted. |

---

## 3. Shopping Cart (Customer & Guest Only)

> **Access Policy**: Cart endpoints are disabled for administrative roles (`Admin`, `SuperAdmin`), returning HTTP 403 Forbidden.

#### Domain Entity: `Cart`
| Field Name | Conceptual Type | Nullability | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | UUID | Mandatory | Primary Key | Unique cart ID. |
| `UserId` | UUID | Optional | Unique, FK referencing `User.Id` | Owning customer (null for guest cart). |
| `Subtotal` | Decimal | Mandatory | Computed: sum of item line totals | Gross cart total before discounts. |
| `DiscountTotal` | Decimal | Mandatory | Default: 0.00 | Savings applied via coupon. |
| `GrandTotal` | Decimal | Mandatory | Formula: `Max(0, Subtotal - DiscountTotal)` | Payable amount. |
| `UpdatedAtUtc` | DateTime | Optional | UTC timestamp | Last modification timestamp. |

#### Domain Entity: `CartItem`
| Field Name | Conceptual Type | Nullability | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | UUID | Mandatory | Primary Key | Unique cart line item ID. |
| `CartId` | UUID | Mandatory | Foreign Key referencing `Cart.Id` | Parent cart. |
| `ProductId` | UUID | Mandatory | Foreign Key referencing `Product.Id` | Selected product. |
| `ProductTitle` | String | Mandatory | Copied from `Product.Title` | Cached product name. |
| `ProductThumbnail` | String | Mandatory | Copied from `Product.Thumbnail` | Cached thumbnail URL. |
| `UnitPrice` | Decimal | Mandatory | Price at time added to cart | Unit selling price. |
| `Quantity` | Integer | Mandatory | Range: 1 to 99 | Number of units. |
| `LineTotal` | Decimal | Computed | Formula: `UnitPrice * Quantity` | Total price for this line item. |

#### Request DTO: `AddCartItemRequest`
| Field Name | Type | Presence | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ProductId` | UUID | Required | Must reference an active Product | Product to add. |
| `Quantity` | Integer | Optional | Min: 1, Max: 99 (default: 1) | Quantity to add. |

#### Request DTO: `UpdateCartItemQuantityRequest`
| Field Name | Type | Presence | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Quantity` | Integer | Required | Min: 1, Max: 99 | New target quantity. |

#### Response DTO: `CartResponse`
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `Id` | UUID | Cart identifier. |
| `UserId` | UUID (nullable) | Owner user ID if authenticated. |
| `Items` | List of `CartItemResponse` | Array of items currently in the cart. |
| `Subtotal` | Decimal | Sum of all line item totals. |
| `DiscountTotal` | Decimal | Total coupon discount amount. |
| `GrandTotal` | Decimal | Final payable total. |
| `TotalQuantity` | Integer | Sum of all individual item quantities. |
| `UpdatedAtUtc` | DateTime | Timestamp of last modification. |

---

## 4. Orders & Checkout (Customer & Admin Operations)

#### Domain Entity: `Order`
| Field Name | Conceptual Type | Nullability | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | UUID | Mandatory | Primary Key | Unique order record ID. |
| `OrderNumber` | String | Mandatory | Unique, formatted (e.g. `ORD-2026-94812`) | Customer-facing invoice tracking code. |
| `UserId` | UUID | Mandatory | Foreign Key referencing `User.Id` | Customer who placed the order. |
| `CreatedAtUtc` | DateTime | Mandatory | UTC timestamp | Date and time order was placed. |
| `Status` | Enum: `OrderStatus` | Mandatory | Default: `Pending` | Lifecycle status (`Pending`, `Processing`, etc.). |
| `PaymentStatus` | Enum: `PaymentStatus` | Mandatory | Default: `Pending` | Payment gateway state (`Pending`, `Paid`, etc.). |
| `PaymentMethod` | Enum: `PaymentMethod` | Mandatory | `CreditCard`, `PayPal`, `CashOnDelivery` | Chosen payment channel. |
| `Subtotal` | Decimal | Mandatory | Sum of all item line totals | Gross purchase amount. |
| `TaxAmount` | Decimal | Mandatory | Calculated tax | Sales tax. |
| `ShippingFee` | Decimal | Mandatory | Delivery fee | Flat or calculated rate. |
| `DiscountAmount` | Decimal | Mandatory | Value deducted from coupons | Savings applied. |
| `TotalAmount` | Decimal | Mandatory | `Subtotal - Discount + Tax + Shipping` | Final charged total. |
| `ShippingAddressJson` | String | Mandatory | Serialized JSON snapshot of delivery address | Permanent address snapshot. |
| `TrackingNumber` | String | Optional | Carrier tracking code | Package carrier tracking identifier. |

#### Domain Entity: `OrderItem`
| Field Name | Conceptual Type | Nullability | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | UUID | Mandatory | Primary Key | Unique line item ID. |
| `OrderId` | UUID | Mandatory | Foreign Key referencing `Order.Id` | Parent order. |
| `ProductId` | UUID | Mandatory | Foreign Key referencing `Product.Id` | Original catalog item. |
| `ProductTitle` | String | Mandatory | Snapshot | Title at purchase time. |
| `ProductThumbnail` | String | Mandatory | Snapshot | Thumbnail at purchase time. |
| `UnitPrice` | Decimal | Mandatory | Snapshot | Unit price charged. |
| `Quantity` | Integer | Mandatory | Min: 1 | Units bought. |
| `LineTotal` | Decimal | Computed | `UnitPrice * Quantity` | Line amount billed. |

#### Request DTO: `CheckoutRequest` (Customer Only)
| Field Name | Type | Presence | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Address` | AddressInput | Required | Valid street, city, state, postal code, country | Delivery address destination. |
| `PaymentMethod` | Enum: `PaymentMethod` | Required | Valid supported payment method | Gateway choice. |
| `CouponCode` | String | Optional | Max 30 characters | Voucher code to redeem. |

#### Request DTO: `AdminOrderFilterParams` (Admin & SuperAdmin Query)
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | Integer | 1 | Requested page index. |
| `limit` | Integer | 10 | Items per page (max 50). |
| `status` | Enum: `OrderStatus` | null | Filter by order fulfillment status. |
| `paymentStatus` | Enum: `PaymentStatus` | null | Filter by payment status. |
| `orderNumber` | String | null | Search by order tracking number. |
| `customerEmail` | String | null | Search by customer email. |
| `dateFrom` | DateTime (UTC) | null | Orders placed after this timestamp. |
| `dateTo` | DateTime (UTC) | null | Orders placed before this timestamp. |

#### Request DTO: `UpdateOrderStatusRequest` (Admin & SuperAdmin Only)
| Field Name | Type | Presence | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Status` | Enum: `OrderStatus` | Required | Must be valid progressive transition | Target fulfillment state. |
| `TrackingNumber` | String | Optional | Max 100 characters | Carrier package tracking code. |

#### Request DTO: `AdminCancelOrderRequest` (Admin & SuperAdmin Only)
| Field Name | Type | Presence | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `CancellationReason`| String | Required | 5 to 500 characters | Administrative explanation for cancellation. |

#### Response DTO: `AdminOrderResponse`
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `Id` | UUID | Order unique record ID. |
| `OrderNumber` | String | Tracking number. |
| `CreatedAtUtc` | DateTime | Timestamp placed. |
| `Status` | Enum: `OrderStatus` | Current status. |
| `PaymentStatus` | Enum: `PaymentStatus`| Current payment state. |
| `PaymentMethod` | Enum: `PaymentMethod`| Payment channel. |
| `Subtotal` | Decimal | Subtotal amount. |
| `TaxAmount` | Decimal | Tax. |
| `ShippingFee` | Decimal | Shipping fee. |
| `DiscountAmount` | Decimal | Discount savings. |
| `TotalAmount` | Decimal | Total charged. |
| `TrackingNumber` | String (nullable) | Carrier tracking code. |
| `Customer` | UserSummary | Customer details (`Id`, `Email`, `Username`, `FirstName`, `LastName`). |
| `DeliveryAddress` | AddressResponse | Final destination address. |
| `Items` | List of `OrderItemResponse` | Line items purchased. |

---

## 5. Identity, Roles & User Management

### 5.1. User & Address Models

#### Domain Entity: `User`
| Field Name | Conceptual Type | Nullability | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | UUID | Mandatory | Primary Key | Unique account ID. |
| `Email` | String | Mandatory | Max 150 characters, unique, valid email | Login credential and contact email. |
| `Username` | String | Mandatory | Max 50 characters, unique, alphanumeric | Public handle or username. |
| `PasswordHash` | String | Mandatory | Hashed string | Securely hashed password. |
| `FirstName` | String | Mandatory | Max 50 characters | User's first name. |
| `LastName` | String | Mandatory | Max 50 characters | User's last name. |
| `PhoneNumber` | String | Optional | Max 20 characters | Contact phone number. |
| `AvatarUrl` | String | Optional | Valid image URL | Profile photo. |
| `Role` | Enum: `UserRole` | Mandatory | `Customer`, `Admin`, `SuperAdmin` | Access authorization role. |
| `IsActive` | Boolean | Mandatory | Default: `true` | Account active status. |
| `CreatedAtUtc` | DateTime | Mandatory | UTC timestamp | Registration date. |

#### Domain Entity: `UserAddress` (No Billing/Shipping Distinction)
| Field Name | Conceptual Type | Nullability | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | UUID | Mandatory | Primary Key | Address record ID. |
| `UserId` | UUID | Mandatory | Foreign Key referencing `User.Id` | Owning customer. |
| `Street` | String | Mandatory | Max 200 characters | Street address and apartment/suite. |
| `City` | String | Mandatory | Max 100 characters | City name. |
| `State` | String | Optional | Max 100 characters | State / Province / Region. |
| `PostalCode` | String | Mandatory | Max 20 characters | Postal / ZIP code. |
| `Country` | String | Mandatory | Max 100 characters | Country name or ISO code. |
| `IsDefault` | Boolean | Mandatory | Default: `false` | Indicates whether this is the customer's primary address. |

---

### 5.2. Address Input & Response DTOs

#### Request DTO: `AddressInput`
| Field Name | Type | Presence | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Street` | String | Required | 5 to 200 characters | Street address. |
| `City` | String | Required | 2 to 100 characters | City. |
| `State` | String | Optional | Max 100 characters | State / Province. |
| `PostalCode` | String | Required | 2 to 20 characters | Postal code. |
| `Country` | String | Required | 2 to 100 characters | Country. |
| `IsDefault` | Boolean | Optional | Default: `false` | Set as primary default. |

#### Response DTO: `AddressResponse`
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `Id` | UUID | Address ID. |
| `Street` | String | Street address. |
| `City` | String | City. |
| `State` | String (nullable) | State / Province. |
| `PostalCode` | String | Postal code. |
| `Country` | String | Country. |
| `IsDefault` | Boolean | Primary address flag. |

---

### 5.3. SuperAdmin Role & Status Management DTOs

#### Request DTO: `UpdateUserRoleRequest` (SuperAdmin Only)
| Field Name | Type | Presence | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Role` | Enum: `UserRole` | Required | Allowed values: `Customer` or `Admin` | Target role to assign. |

#### Request DTO: `UpdateUserStatusRequest` (SuperAdmin Only)
| Field Name | Type | Presence | Validation Rules | Description |
| :--- | :--- | :--- | :--- | :--- |
| `IsActive` | Boolean | Required | Boolean flag | Account status toggle. |

#### Response DTO: `SuperAdminUserDetailResponse`
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `Id` | UUID | User unique identifier. |
| `Email` | String | Email address. |
| `Username` | String | User handle. |
| `FirstName` | String | First name. |
| `LastName` | String | Last name. |
| `PhoneNumber` | String (nullable) | Contact phone. |
| `Role` | Enum: `UserRole` | Current role (`Customer`, `Admin`, `SuperAdmin`). |
| `IsActive` | Boolean | Account active/disabled status. |
| `CreatedAtUtc` | DateTime | Account creation date. |
| `OrderCount` | Integer | Total lifetime orders placed. |

---

## 6. Marketing: Coupons

#### Domain Entity: `Coupon`
| Field Name | Conceptual Type | Nullability | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Id` | UUID | Mandatory | Primary Key | Unique coupon ID. |
| `Code` | String | Mandatory | Max 30 chars, unique, uppercase (e.g. `SAVE20`) | Promotional voucher code. |
| `DiscountType` | Enum: `DiscountType` | Mandatory | `Percentage` or `FixedAmount` | Discount computation style. |
| `DiscountValue` | Decimal | Mandatory | Greater than 0.00 | Value of deduction. |
| `MinPurchaseAmount` | Decimal | Mandatory | Greater than or equal to 0.00 | Minimum order subtotal required to qualify. |
| `ValidUntilUtc` | DateTime | Mandatory | UTC timestamp | Date and time coupon expires. |
| `IsActive` | Boolean | Mandatory | Default: `true` | Emergency deactivation switch. |
