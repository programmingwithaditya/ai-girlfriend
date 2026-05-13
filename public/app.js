const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const resetBtn = document.getElementById('resetBtn');
const personaNameEl = document.getElementById('personaName');
const avatarEl = document.getElementById('avatar');

async function loadConfig() {
  const res = await fetch('/api/config');
  const { name } = await res.json();
  document.title = name;
  personaNameEl.textContent = name;
  avatarEl.textContent = name.charAt(0).toUpperCase();
}

function bubble(role, text = '') {
  const wrap = document.createElement('div');
  wrap.className = role === 'user'
    ? 'flex justify-end'
    : 'flex justify-start';

  const box = document.createElement('div');
  box.className = role === 'user'
    ? 'max-w-[75%] bg-rose-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap break-words'
    : 'max-w-[75%] bg-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm whitespace-pre-wrap break-words';

  box.textContent = text;
  wrap.appendChild(box);
  messagesEl.appendChild(wrap);
  return box;
}

function scrollBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setEnabled(on) {
  inputEl.disabled = !on;
  sendBtn.disabled = !on;
}

async function loadHistory() {
  const res = await fetch('/api/messages');
  const msgs = await res.json();
  for (const m of msgs) bubble(m.role, m.content);
  scrollBottom();
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = '';
  inputEl.style.height = 'auto';
  setEnabled(false);

  bubble('user', text);
  scrollBottom();

  const assistantBox = bubble('assistant');
  assistantBox.classList.add('cursor');
  scrollBottom();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') break;
        try {
          const token = JSON.parse(payload);
          if (typeof token === 'string') {
            assistantBox.textContent += token;
            scrollBottom();
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    assistantBox.textContent = '(connection error)';
  } finally {
    assistantBox.classList.remove('cursor');
    setEnabled(true);
    inputEl.focus();
  }
}

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = inputEl.scrollHeight + 'px';
});

sendBtn.addEventListener('click', sendMessage);

resetBtn.addEventListener('click', async () => {
  if (!confirm('Clear the conversation?')) return;
  await fetch('/api/reset', { method: 'POST' });
  messagesEl.innerHTML = '';
});

loadConfig();
loadHistory();
