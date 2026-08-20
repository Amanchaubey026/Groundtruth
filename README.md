# AI Knowledge Inbox

Save notes or URLs, then ask questions. Answers come from a small RAG pipeline over *your* saved content, with cited source snippets.

Embeddings and SQLite stay local. The **default LLM is Ollama `llama3.1:8b`**. Pick another pulled model (or OpenRouter, if a key is set) in the header. You do not need to change `.env` to switch models.

## Run

Needs Node 20+ and two terminals.

```bash
git clone <repository-url>
cd Groundtruth
cp .env.example .env
```

```bash
cd server && npm install && npm run dev
```

```bash
cd client && npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173). API: [http://localhost:4000](http://localhost:4000).

On Windows, `better-sqlite3` needs Visual Studio Build Tools with the **Desktop development with C++** workload.

MiniLM embeddings (~20–30 MB) download by themselves on first ingest or query. **Ollama models do not.**

## Ollama (default)

The UI defaults to **`llama3.1:8b`**. The app does not auto-pull weights. If Ollama is down or that model is missing, a toast lists the steps.

1. Install [Ollama](https://ollama.com). The installer usually starts a background service. If `ollama list` fails, run `ollama serve`.
2. Pull the default model **before** asking questions:

   ```bash
   ollama pull llama3.1:8b
   ```

   Lower RAM (~8 GB or less):

   ```bash
   ollama pull phi3:mini
   ```

   Then choose `phi3:mini` in the header dropdown (click **Refresh** after the pull).
3. Confirm: `ollama list`
4. In the app, **Refresh** models if the toast is still up.

Do **not** use Ollama Cloud tags such as `gpt-oss:20b-cloud`.

`OLLAMA_HOST` in `.env` only needs changing if Ollama is not on `http://localhost:11434`.

### OpenRouter (optional)

If `OPENROUTER_API_KEY` is set, OpenRouter appears in the same dropdown. It is not the default.

## Layout

```text
client/   React + Vite UI (hooks, no global store)
server/
  src/routes/     thin HTTP: /ingest /items /query /llm
  src/services/   ingest, chunk, embed, retrieve, LLM
  src/lib/        config, validation, errors, logs
  src/db/         SQLite schema + queries
```

`HTTP → validate → service → JSON/SSE`

## RAG

```text
ingest:  note | fetch URL → chunk (~500 words, 50 overlap) → MiniLM → SQLite
query:   embed question → cosine top-K → drop score < 0.30 → grounded LLM → answer + snippets
```

If nothing clears `MIN_SIMILARITY`, the LLM is not called.

Tune in `.env`: `TOP_K` (default 4), `MIN_SIMILARITY` (default 0.30).

## API

Errors: `{ "error": { "message": "...", "code": "VALIDATION_ERROR", "steps": ["..."] } }`

`steps` is set when Ollama is down or the selected model is not pulled.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health` | Always 200. `llm` is informational. |
| `GET` | `/llm` | Default model, pulled Ollama names, dropdown options |
| `POST` | `/ingest` | `{ "type": "note", "content": "..." }` or `{ "type": "url", "url": "https://..." }` → `201` |
| `GET` | `/items` | Metadata + preview, not full bodies |
| `POST` | `/query` | `{ "question": "...", "provider": "ollama", "model": "llama3.1:8b" }` — `stream: true` for SSE |

Empty input → `400`. URL fetch/parse → `422`. LLM down / missing Ollama model → `503`.

## Design choices

| Choice | Why here | What breaks later |
| --- | --- | --- |
| Word/paragraph chunks (500 / 50) | Simple, deterministic | Can split a single idea |
| MiniLM local embeddings | No extra API key | Weaker than large hosted embedders |
| SQLite BLOBs + brute-force cosine | Single user, tiny corpus | O(n) search; not multi-instance |
| Sync ingest | Demo is easy to follow | Slow for large pages / traffic |
| Ollama `llama3.1:8b` default + UI picker | Reviewer can stay local; no `.env` edit to switch | You must install, pull, and run Ollama |
| OpenRouter as a dropdown option | Fallback if a key is present | Free models can be slow / rate-limited |

Intentionally not built: auth, queues, Kubernetes, a vector DB, rerankers, multi-tenancy.

## Limits

Single user. No delete-item UI. URL ingest is readable HTML/text only (http/https, timeout, size cap). No production SSRF IP block.
