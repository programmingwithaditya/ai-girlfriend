import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveMessage, getRecentMessages, clearMessages } from './db.js';
import { SYSTEM_PROMPT, PERSONA_NAME } from './persona.js';
import { streamChat } from './ollama.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const CONTEXT_WINDOW = parseInt(process.env.CONTEXT_WINDOW || '20', 10);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/config', (req, res) => {
  res.json({ name: PERSONA_NAME });
});

app.get('/api/messages', (req, res) => {
  res.json(getRecentMessages(100));
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'message required' });

  saveMessage('user', message);

  const history = getRecentMessages(CONTEXT_WINDOW);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
  ];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let full = '';
  try {
    for await (const token of streamChat(messages)) {
      full += token;
      res.write(`data: ${JSON.stringify(token)}\n\n`);
    }
    saveMessage('assistant', full);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

app.post('/api/reset', (req, res) => {
  clearMessages();
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
