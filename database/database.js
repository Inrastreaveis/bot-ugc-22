const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const bancoPadrao = path.join(__dirname, "database.sqlite");
const bancoDestino = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : bancoPadrao;

fs.mkdirSync(path.dirname(bancoDestino), { recursive: true });

// No primeiro deploy com Volume, copia o banco que veio no projeto.
if (bancoDestino !== bancoPadrao && !fs.existsSync(bancoDestino) && fs.existsSync(bancoPadrao)) {
    fs.copyFileSync(bancoPadrao, bancoDestino);
}

const db = new Database(bancoDestino);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT
);

CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cargo_id TEXT,
    categoria_id TEXT
);

CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria TEXT,
    tipo TEXT,
    nome TEXT,
    preco REAL,
    imagem TEXT,
    ativo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id TEXT,
    corpo TEXT,
    categoria TEXT,
    tipo TEXT,
    produto TEXT,
    personalizacao TEXT,
    valor REAL,
    ticket_id TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS avaliacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    usuario_id TEXT NOT NULL,
    nota INTEGER NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

const colunasPedidos = db.prepare(`PRAGMA table_info(pedidos)`).all();
const nomesColunas = colunasPedidos.map(coluna => coluna.name);

const novasColunas = [
    ["produto_id", "INTEGER"],
    ["nome_personalizacao", "TEXT"],
    ["inicial", "TEXT"],
    ["simbolo", "TEXT"],
    ["observacoes", "TEXT"],
    ["status", "TEXT DEFAULT 'Pendente'"]
];

for (const [nome, tipo] of novasColunas) {
    if (!nomesColunas.includes(nome)) {
        db.exec(`ALTER TABLE pedidos ADD COLUMN ${nome} ${tipo}`);
    }
}

console.log(`✅ Banco conectado em: ${bancoDestino}`);

module.exports = db;
