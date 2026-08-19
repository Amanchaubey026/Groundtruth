import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";
import type { ChunkRecord, ItemRecord } from "../types.js";

const here = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database has not been initialized");
  }
  return db;
}

export function initDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(config.dbPath);
  fs.mkdirSync(dir, { recursive: true });

  db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(path.join(here, "schema.sql"), "utf8");
  db.exec(schema);

  logger.info("Database initialized", { path: config.dbPath });
  return db;
}

export function insertItem(item: ItemRecord): void {
  getDb()
    .prepare(
      `INSERT INTO items (
         id, source_type, source_url, title, raw_content, cleaned_content, created_at
       ) VALUES (
         @id, @source_type, @source_url, @title, @raw_content, @cleaned_content, @created_at
       )`,
    )
    .run(item);
}

export function insertChunk(chunk: ChunkRecord): void {
  getDb()
    .prepare(
      `INSERT INTO chunks (
         id, item_id, chunk_index, content, embedding, created_at
       ) VALUES (
         @id, @item_id, @chunk_index, @content, @embedding, @created_at
       )`,
    )
    .run(chunk);
}

export function insertItemWithChunks(item: ItemRecord, chunks: ChunkRecord[]): void {
  const transaction = getDb().transaction(() => {
    insertItem(item);
    for (const chunk of chunks) {
      insertChunk(chunk);
    }
  });
  transaction();
}

export function listItemRows(): ItemRecord[] {
  return getDb()
    .prepare(
      `SELECT id, source_type, source_url, title, raw_content, cleaned_content, created_at
       FROM items
       ORDER BY created_at DESC`,
    )
    .all() as ItemRecord[];
}

export interface ChunkSearchRow {
  id: string;
  item_id: string;
  chunk_index: number;
  content: string;
  embedding: Buffer;
  title: string | null;
  source_url: string | null;
}

export function listChunksWithItems(): ChunkSearchRow[] {
  return getDb()
    .prepare(
      `SELECT
         c.id,
         c.item_id,
         c.chunk_index,
         c.content,
         c.embedding,
         i.title,
         i.source_url
       FROM chunks c
       INNER JOIN items i ON i.id = c.item_id`,
    )
    .all() as ChunkSearchRow[];
}

export function countChunks(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS count FROM chunks").get() as {
    count: number;
  };
  return row.count;
}
