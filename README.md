# versaCollections-be

The Versa Collections API — NestJS 11 + MongoDB (Mongoose 9).

## Setup

```bash
npm install
cp .env.example .env      # then paste your MongoDB Atlas URI into MONGODB_URI
npm run seed              # categories, catalogue and demo accounts
npm run start:dev
```

The API listens on `http://localhost:4000/api`. Swagger UI is at
`http://localhost:4000/api/docs`.

> Without a real `MONGODB_URI` the server refuses to boot and `npm run seed`
> exits with a message rather than hanging on a connection attempt.

## Seeded accounts

| Role     | Email                          | Password          | Tier   |
| -------- | ------------------------------ | ----------------- | ------ |
| admin    | admin@versacollections.com     | `Versa!Admin2026` | Privé  |
| customer | client@versacollections.com    | `Versa!Client2026`| Maison |
| customer | guest@versacollections.com     | `Versa!Guest2026` | none   |

The `guest` account has no membership, which is what makes the
`membershipOnly` rejection on the Vicuña Overcoat observable.

## Conventions

**Money is integer minor units (cents) everywhere** — `289000` is $2,890.00.
Nothing in this codebase stores a currency value as a float. Formatting is the
storefront's job.

**Auth** is a JWT access token (15m) plus a rotating refresh token (7d), both in
`httpOnly` cookies (`vc_access` / `vc_refresh`). `JwtAuthGuard` is registered
globally; `@Public()` opts a route out but still decodes the cookie when one is
present, so public endpoints can serve a personalised response. `@Roles(Role.Admin)`
adds authorisation on top.

**Guest carts** key off a `vc_sid` cookie and are folded into the account cart
on sign-in (`CartService.mergeGuestCartIntoUser`).

**Cart totals are never taken from the client.** `CartService.toView` recomputes
every line from the live product documents on each read, and silently drops
lines whose product has been deleted or unpublished.

**Stock** is taken with an atomic conditional decrement
(`{ stock: { $gte: qty } }`), so two shoppers cannot both claim the last piece.
If a later line in the same checkout fails, the decrements already applied are
put back before the request errors.

## Routes

| Method | Path                                | Access   |
| ------ | ----------------------------------- | -------- |
| GET    | `/api/health`                       | public   |
| GET    | `/api/stats`                        | admin    |
| POST   | `/api/auth/register` `login` `refresh` | public |
| POST   | `/api/auth/logout`                  | signed-in |
| GET    | `/api/auth/me`                      | signed-in |
| GET    | `/api/categories` `/:slug`          | public   |
| POST/PATCH/DELETE | `/api/categories…`       | admin    |
| GET    | `/api/products` `/:slug`            | public   |
| GET    | `/api/products/by-id/:id`           | admin    |
| POST/PATCH/DELETE | `/api/products…`         | admin    |
| GET/POST/PATCH/DELETE | `/api/cart…`         | public (guest or member) |
| POST   | `/api/orders`                       | signed-in |
| GET    | `/api/orders/mine` `/mine/:id`      | signed-in |
| GET    | `/api/orders` `/:id`, PATCH `/:id/status` | admin |
| GET    | `/api/membership/tiers`             | public   |
| POST   | `/api/membership/apply`             | public   |
| GET    | `/api/membership/applications`      | admin    |
| PATCH  | `/api/membership/applications/:id`  | admin    |
| PATCH  | `/api/users/me`                     | signed-in |
| GET    | `/api/users`, PATCH `/:id/membership` | admin  |

## Scripts

| Script              | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `npm run start:dev` | Watch-mode dev server                       |
| `npm run seed`      | Idempotent catalogue + account seed         |
| `npm run build`     | Compile to `dist/`                          |
| `npm run lint`      | ESLint with `--fix`                         |
