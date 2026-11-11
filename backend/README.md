# Frutica backend

Express + SQLite server for the Frutica website. It serves the site and a JSON API.

## Run it

```
cd backend
npm install      # first time only
npm start
```

Open **http://localhost:3000**. The first start creates `backend/data/frutica.sqlite` and copies the 20 products from `fruits.json` into it.

To use another port: `$env:PORT=4000; npm start` (PowerShell).
`npm run dev` restarts the server automatically when you edit a backend file.

## API

| Method | Route | What it does |
|---|---|---|
| GET  | `/api/health` | Check the server is up |
| GET  | `/api/products` | All products (same shape as `fruits.json`) |
| GET  | `/api/products/:id` | One product, e.g. `/api/products/FRT-001` |
| POST | `/api/contact` | Save a contact message |
| GET  | `/api/contact` | List contact messages |
| POST | `/api/orders` | Place an order (prices worked out on the server) |
| GET  | `/api/orders` | List orders with their items |
| GET  | `/api/orders/:id` | One order |

### POST /api/contact

```json
{ "name": "Ada", "email": "ada@example.com", "message": "Hi!" }
```

### POST /api/orders

```json
{
  "customer": { "name": "Ada", "email": "ada@example.com" },
  "items": [
    { "productId": "FRT-001", "variety": "gala", "weight": "2kg", "quantity": 3 }
  ]
}
```

`variety` and `weight` are the keys from the product (e.g. `"gala"`, `"2kg"`), not the display names.
Bad input gets a `400` with `{ "errors": [ ... ] }`.

## Database tables

- `products`: id, name, default_price, image, description, varieties (JSON), weights (JSON)
- `contact_messages`: id, name, email, message, created_at
- `orders`: id, customer_name, customer_email, total, status, created_at
- `order_items`: id, order_id, product_id, product_name, variety, weight, quantity, unit_price, line_total

To start fresh, stop the server and delete `backend/data/frutica.sqlite`.

## How the website uses it

- `design.js` has `apiFetch()` and `loadProducts()`, and `API_BASE` at the top.
- Product pages load products from `/api/products`. Without the backend (Live Server, GitHub Pages) they fall back to `fruits.json`.
- The contact form on `index.html` posts to `/api/contact`.
- The server never serves `backend/`, `_originals/` or `.git` to visitors.
