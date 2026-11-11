// SQLite database for Frutica, using sql.js (pure JavaScript, no native build needed on Windows).
// The whole database lives in one file: backend/data/frutica.sqlite

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'frutica.sqlite');
const FRUITS_JSON = path.join(__dirname, '..', 'fruits.json');

let db;

// write the in-memory database back to disk
function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
}

// SELECT helpers -> arrays of plain objects
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

// INSERT / UPDATE / DELETE (no save, so several can be grouped into one transaction)
function run(sql, params = []) {
  db.run(sql, params);
  return get('SELECT last_insert_rowid() AS id').id;
}

// run several writes as one unit: all succeed or none do
function transaction(fn) {
  db.run('BEGIN');
  try {
    const result = fn();
    db.run('COMMIT');
    save();
    return result;
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      default_price REAL NOT NULL,
      image         TEXT,
      description   TEXT,
      varieties     TEXT NOT NULL,  -- JSON: { key: { name, factor } }
      weights       TEXT NOT NULL   -- JSON: { key: { name, factor } }
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      message    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name  TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      total          REAL NOT NULL,
      status         TEXT NOT NULL DEFAULT 'received',
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id     INTEGER NOT NULL REFERENCES orders(id),
      product_id   TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      variety      TEXT NOT NULL,
      weight       TEXT NOT NULL,
      quantity     INTEGER NOT NULL,
      unit_price   REAL NOT NULL,
      line_total   REAL NOT NULL
    );
  `);
}

// first run: copy the products from fruits.json into the database
function seedProducts() {
  const count = get('SELECT COUNT(*) AS n FROM products').n;
  if (count > 0) return;

  const fruits = JSON.parse(fs.readFileSync(FRUITS_JSON, 'utf8'));
  transaction(() => {
    for (const f of fruits) {
      run(
        `INSERT INTO products (id, name, default_price, image, description, varieties, weights)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [f.id, f.name, f.defaultPrice, f.image, f.description,
         JSON.stringify(f.varieties), JSON.stringify(f.weights)]
      );
    }
  });
  console.log(`Seeded ${fruits.length} products from fruits.json`);
}

async function init() {
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_FILE)
    ? new SQL.Database(fs.readFileSync(DB_FILE))
    : new SQL.Database();
  createTables();
  seedProducts();
  save();
}

module.exports = { init, all, get, run, transaction };
