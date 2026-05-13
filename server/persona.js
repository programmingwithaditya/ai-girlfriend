import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const txtPath = path.join(__dirname, '..', 'persona.txt');

export const PERSONA_NAME = process.env.PERSONA_NAME || 'Aria';

function loadPrompt() {
  let raw;
  if (process.env.PERSONA_PROMPT) {
    raw = process.env.PERSONA_PROMPT;
  } else {
    try {
      raw = fs.readFileSync(txtPath, 'utf8').trim();
    } catch {
      raw = 'You are {name}, a warm, witty companion. Keep replies conversational and genuine.';
    }
  }
  return raw.replace(/\{name\}/g, PERSONA_NAME);
}

export const SYSTEM_PROMPT = loadPrompt();
