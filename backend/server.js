// Frutica backend: Express API + serves the website itself.
// Start with:  npm start   (from the backend folder)
// Then open:   http://localhost:3000

const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_DIR = path.join(__dirname, '..'); // the 2707Project folder

app.use(cors());          // lets a front end on another address (e.g. GitHub Pages) call this API
app.use(express.json());  // reads JSON request bodies

// ---------- helpers ----------

// turn a database row into the same shape as fruits.json, so the pages need no changes
function toProduct(row) {
  return {
    id: row.id,
    name: row.name,
    defaultPrice: row.default_price,
    image: row.image,
    description: row.description,
    varieties: JSON.parse(row.varieties),
    weights: JSON.parse(row.weights),
  };
}

const roundMoney = (n) => Math.round(n * 100) / 100;
const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isText = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.trim().length <= max;

// ---------- API: health ----------

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// ---------- API: products ----------

app.get('/api/products', (req, res) => {
  const rows = db.all('SELECT * FROM products ORDER BY id');
  res.json(rows.map(toProduct));
});

app.get('/api/products/:id', (req, res) => {
  const row = db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Product not found' });
  res.json(toProduct(row));
});

// ---------- API: contact messages ----------

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  const errors = [];
  if (!isText(name, 100)) errors.push('Name is required (max 100 characters).');
  if (!isEmail(email)) errors.push('A valid email is required.');
  if (!isText(message, 2000)) errors.push('Message is required (max 2000 characters).');
  if (errors.length) return res.status(400).json({ errors });

  const id = db.transaction(() =>
    db.run('INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
      [name.trim(), email.trim(), message.trim()])
  );
  res.status(201).json({ id, message: 'Message received' });
});

app.get('/api/contact', (req, res) => {
  res.json(db.all('SELECT * FROM contact_messages ORDER BY id DESC'));
});

// ---------- API: orders ----------
// Body: { customer: { name, email }, items: [ { productId, variety, weight, quantity } ] }
// Prices are always worked out here from the database, never trusted from the browser.

app.post('/api/orders', (req, res) => {
  const { customer, items } = req.body || {};
  const errors = [];
  if (!customer || !isText(customer.name, 100)) errors.push('Customer name is required.');
  if (!customer || !isEmail(customer.email)) errors.push('A valid customer email is required.');
  if (!Array.isArray(items) || items.length === 0) errors.push('At least one item is required.');
  if (errors.length) return res.status(400).json({ errors });

  const lines = [];
  for (const [i, item] of items.entries()) {
    const row = db.get('SELECT * FROM products WHERE id = ?', [item.productId]);
    if (!row) { errors.push(`Item ${i + 1}: unknown product "${item.productId}".`); continue; }
    const product = toProduct(row);
    const variety = product.varieties[item.variety];
    const weight = product.weights[item.weight];
    const qty = Number(item.quantity ?? 1);
    if (!variety) errors.push(`Item ${i + 1}: unknown variety "${item.variety}" for ${product.name}.`);
    if (!weight) errors.push(`Item ${i + 1}: unknown weight "${item.weight}" for ${product.name}.`);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) errors.push(`Item ${i + 1}: quantity must be 1 to 99.`);
    if (!variety || !weight) continue;

    const unitPrice = roundMoney(product.defaultPrice * variety.factor * weight.factor);
    lines.push({ product, variety, weight, qty, unitPrice, lineTotal: roundMoney(unitPrice * qty) });
  }
  if (errors.length) return res.status(400).json({ errors });

  const total = roundMoney(lines.reduce((sum, l) => sum + l.lineTotal, 0));

  const orderId = db.transaction(() => {
    const id = db.run('INSERT INTO orders (customer_name, customer_email, total) VALUES (?, ?, ?)',
      [customer.name.trim(), customer.email.trim(), total]);
    for (const l of lines) {
      db.run(
        `INSERT INTO order_items (order_id, product_id, product_name, variety, weight, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, l.product.id, l.product.name, l.variety.name, l.weight.name, l.qty, l.unitPrice, l.lineTotal]
      );
    }
    return id;
  });

  res.status(201).json(getOrder(orderId));
});

function getOrder(id) {
  const order = db.get('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return null;
  order.items = db.all('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', [id]);
  return order;
}

app.get('/api/orders', (req, res) => {
  const orders = db.all('SELECT * FROM orders ORDER BY id DESC');
  res.json(orders.map((o) => getOrder(o.id)));
});

app.get('/api/orders/:id', (req, res) => {
  const order = getOrder(Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// unknown /api routes -> JSON 404 (not an HTML page)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ---------- the website itself ----------

// never serve the server code, database, backups or git files to visitors
app.use((req, res, next) => {
  if (/^\/(backend|_originals|node_modules|\.git)(\/|$)/i.test(req.path)) {
    return res.status(404).send('Not found');
  }
  next();
});

app.use(express.static(SITE_DIR, { dotfiles: 'ignore', index: 'index.html' }));

// ---------- errors ----------

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// ---------- start ----------

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Frutica running at http://localhost:${PORT}`);
  });
});
