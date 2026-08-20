-- items: saved notes/URLs. chunks: embedded slices. CASCADE drops vectors with the parent.
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_url TEXT,
  title TEXT,
  raw_content TEXT NOT NULL,
  cleaned_content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB NOT NULL,
  created_at TEXT NOT NULL,

  FOREIGN KEY (item_id)
    REFERENCES items(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chunks_item_id
ON chunks(item_id);
