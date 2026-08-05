# FakeStoreAPI

[FakeStoreAPI](https://fakestoreapi.com) is a free online REST API that you can use whenever you need Pseudo-real data for
your e-commerce or shopping website without running any server-side code.
It's awesome for teaching purposes, sample codes, tests and etc.

You can visit in detail docs in [FakeStoreAPI](https://fakestoreapi.com) for more information.

## Why?

When I wanted to design a shopping website prototype and needed fake data, I had to
use lorem ipsum data or create a JSON file from the base. I didn't find any online free web service
to return semi-real shop data instead of lorem ipsum data.
so I decided to create this simple web service with NodeJs(express) and MongoDB as a database.

## Resources

There are 4 main resources need in shopping prototypes:

- Products https://fakestoreapi.com/products
- Carts https://fakestoreapi.com/carts
- Users https://fakestoreapi.com/users
- Login Token https://fakestoreapi.com/auth/login

### New! "Rating" (includes rate and count) has been added to each product object!

## Authentication

Unlike the hosted FakeStoreAPI, this local copy enforces the token it hands out. Log in at
`POST /auth/login` and send the token on protected routes:

```js
const { token } = await fetch("/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "johnd", password: "m38rmF$" }),
}).then((res) => res.json());

fetch("/carts", { headers: { Authorization: `Bearer ${token}` } });
```

Who can do what:

| Routes                                        | Access                                                        |
| --------------------------------------------- | ------------------------------------------------------------- |
| `GET /products/*`, `GET /users/*`, docs pages | public                                                        |
| `POST /users` (signup), `POST /auth/login`    | public                                                        |
| `POST/PUT/PATCH/DELETE /products`             | **admin** only                                                |
| all `/carts` routes                           | any logged-in user, limited to **their own** carts; admin sees all |
| `PUT/PATCH/DELETE /users/:id`                 | the **owner** of that account, or an admin                    |

Missing or invalid token → `401`. Valid token without the right privileges → `403`.
A self-registered account is always created as a `customer`; only an admin can set `role`.

`npm run seed` creates exactly two accounts: `johnd` / `m38rmF$` (id 1, **admin**) and
`kevinryan` / `kev02937@` (id 3, **customer**). Sign up with `POST /users` for more.
The signing secret comes from `JWT_SECRET` in `.env`.

## How to

you can fetch data with any kind of methods you know(fetch API, Axios, jquery ajax,...)

### Get all products

```js
fetch("https://fakestoreapi.com/products")
  .then((res) => res.json())
  .then((json) => console.log(json));
```

### Get a single product

```js
fetch("https://fakestoreapi.com/products/1")
  .then((res) => res.json())
  .then((json) => console.log(json));
```

### Add new product

```js
fetch("https://fakestoreapi.com/products", {
  method: "POST",
  body: JSON.stringify({
    title: "test product",
    price: 13.5,
    description: "lorem ipsum set",
    image: "https://i.pravatar.cc",
    category: "electronic",
  }),
})
  .then((res) => res.json())
  .then((json) => console.log(json));

/* will return
{
 id:21,
 title:'...',
 price:'...',
 category:'...',
 description:'...',
 image:'...'
}
*/
```

Note: Posted data will really insert into the database.

### Updating a product

```js
fetch("https://fakestoreapi.com/products/7", {
  method: "PUT",
  body: JSON.stringify({
    title: "test product",
    price: 13.5,
    description: "lorem ipsum set",
    image: "https://i.pravatar.cc",
    category: "electronic",
  }),
})
  .then((res) => res.json())
  .then((json) => console.log(json));

/* will return
{
    id:7,
    title: 'test product',
    price: 13.5,
    description: 'lorem ipsum set',
    image: 'https://i.pravatar.cc',
    category: 'electronic'
}
*/
```

```js
fetch("https://fakestoreapi.com/products/8", {
  method: "PATCH",
  body: JSON.stringify({
    title: "test product",
    price: 13.5,
    description: "lorem ipsum set",
    image: "https://i.pravatar.cc",
    category: "electronic",
  }),
})
  .then((res) => res.json())
  .then((json) => console.log(json));

/* will return
{
    id:8,
    title: 'test product',
    price: 13.5,
    description: 'lorem ipsum set',
    image: 'https://i.pravatar.cc',
    category: 'electronic'
}
*/
```

Note: Edited data will really be updated into the database.

### Deleting a product

```js
fetch("https://fakestoreapi.com/products/8", {
  method: "DELETE",
});
```

The product will really be deleted from the database.

### Sort and Limit

You can use query string to limit results or sort by asc|desc

```js
// Will return all the posts that belong to the first user
fetch("https://fakestoreapi.com/products?limit=3&sort=desc")
  .then((res) => res.json())
  .then((json) => console.log(json));
```

## All available routes

### Products

```js
fields:
{
    id:Number,
    title:String,
    price:Number,
    category:String,
    description:String,
    image:String
}
```

GET:

- /products (get all products)
- /products/1 (get specific product based on id)
- /products?limit=5 (limit return results )
- /products?sort=desc (asc|desc get products in ascending or descending orders (default to asc))
- /products/products/categories (get all categories)
- /products/category/jewelery (get all products in specific category)
- /products/category/jewelery?sort=desc (asc|desc get products in ascending or descending orders (default to asc))

POST:

- /products

-PUT,PATCH

- /products/1

-DELETE

- /products/1

### Carts

```js
fields:
{
    id:Number,
    userId:Number,
    date:Date,
    products:[{productId:Number,quantity:Number,priceAtAdd:Number}]
}
```

`quantity` must be a whole number of at least 1, and a `productId` may only appear
once per cart.

`priceAtAdd` is the product's price at the moment it was added to the cart. It is
always filled in server-side from the catalog — any value you send is ignored — and is
absent on the carts loaded by `npm run seed`, since the upstream fakestoreapi data
carries no price on cart lines.

**Cart writes are customer-only.** An admin manages the catalog, not a basket, so every
write below returns 403 for an admin token. Admins can still read any cart.

**Writes always act on your own cart**, resolved from your token — your most recent cart
by `date`. There is no cart id in a write path, and `userId` and `date` are never taken
from the body. If you have no cart at all, `GET /carts` creates an empty one for you and
returns it.

GET:

- /carts (your carts; an admin sees everyone's)
- /carts/1 (get specific cart based on id)
- /carts?startdate=2020-10-03&enddate=2020-12-12 (get carts in date range)
- /carts/user/1 (get a user cart)
- /carts/user/1?startdate=2020-10-03&enddate=2020-12-12 (get user carts in date range)
- /carts?limit=5 (limit return results )
- /carts?sort=desc (asc|desc get carts in ascending or descending orders (default to asc))

POST:

- /carts (add a product to your cart — body `{productId, quantity}`, `quantity` defaults
  to 1. Adding a product already in the cart increases its quantity.)

PUT,PATCH:

- /carts/products/1 (set the quantity of a product in your cart — body `{quantity}`)

DELETE:

- /carts/products/1 (remove a product from your cart)
- /carts/1 (delete one of your carts)

### Users

```js
fields:
{
    id:20,
    email:String,
    username:String,
    password:String,
    name:{
        firstname:String,
        lastname:String
        },
    address:{
    city:String,
    street:String,
    number:Number,
    zipcode:String,
    geolocation:{
        lat:String,
        long:String
        }
    },
    phone:String
}
```

GET:

- /users (get all users)
- /users/1 (get specific user based on id)
- /users?limit=5 (limit return results )
- /users?sort=desc (asc|desc get users in ascending or descending orders (default to asc))

POST:

- /users

PUT,PATCH:

- /users/1

DELETE:

- /users/1

### Auth

```js
fields:
{
    username:String,
    password:String
}
```

POST:

- /auth/login

Returns `{ token }`. The payload carries `id`, `user` (username) and `role`.
See [Authentication](#authentication) for which routes require it.

## ToDo

- Add graphql support
- Add pagination
- Add another language support
