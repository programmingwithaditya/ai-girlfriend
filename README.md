# ai-girlfriend

A local AI companion chat app that runs entirely on your machine. It streams responses token-by-token from a locally-running Ollama model and persists conversation history in a SQLite file.

## Prerequisites

- Node.js 18 or higher
- [Ollama](https://ollama.com) running locally with at least one model pulled (e.g. `ollama pull llama3.2`)

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Then open http://localhost:3000.

To use a different model, set `OLLAMA_MODEL` in `.env` to any model you have pulled. To adjust how much conversation history is sent to the model on each request, change `CONTEXT_WINDOW` (number of messages).

## Using a better model

The default model (`llama3.2`) is fast and lightweight but gives fairly short, generic responses. For noticeably better conversation quality, pull one of these and update your `.env`:

| Model | Size | Good for |
|---|---|---|
| `llama3.1:8b` | ~5 GB | Solid general chat, better reasoning than 3.2 |
| `mistral` | ~4 GB | Fast, good at following persona instructions |
| `gemma3:12b` | ~8 GB | Strong conversational quality |
| `llama3.1:70b` | ~40 GB | Best quality, needs a powerful machine |

Pull a model:

```bash
ollama pull llama3.1:8b
# or
ollama pull mistral
# or
ollama pull gemma3:12b
```

Then update `.env`:

```
OLLAMA_MODEL=llama3.1:8b
```

Restart the server. You can check which models you have installed at any time with `ollama list`.

## Changing the persona

By default the app uses a built-in system prompt for a character named Aria. To replace it entirely, set `PERSONA_PROMPT` in your `.env` to any string you like:

```
PERSONA_PROMPT=You are Rex, a gruff but loyal companion who speaks in short sentences and never sugarcoats anything.
```

Restart the server after editing `.env`.

## Tech notes

The backend is a plain Express app with better-sqlite3 for synchronous, zero-config persistence. Streaming works via Server-Sent Events over a regular HTTP POST — `EventSource` was not used because it only supports GET requests. The frontend parses the `text/event-stream` response manually using the Fetch Streams API. No build step, no bundler, no framework.

Chat history is stored in `./data/chat.db` and excluded from git. The "clear chat" button in the UI calls `POST /api/reset` to wipe the table.
