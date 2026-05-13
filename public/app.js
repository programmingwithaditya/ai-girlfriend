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

function bubble(role, text = '', animate = false) {
  const wrap = document.createElement('div');
  wrap.className = `flex ${animate ? 'msg-bubble' : ''} ${role === 'user' ? 'justify-end' : 'justify-start'}`;

  const box = document.createElement('div');
  box.className = role === 'user'
    ? 'max-w-[78%] user-bubble text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap break-words'
    : 'max-w-[78%] assistant-bubble text-zinc-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm whitespace-pre-wrap break-words';

  box.textContent = text;
  wrap.appendChild(box);
  messagesEl.appendChild(wrap);
  return box;
}

function showTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'flex justify-start msg-bubble';
  wrap.id = 'typing-indicator';

  const box = document.createElement('div');
  box.className = 'assistant-bubble rounded-2xl rounded-tl-sm px-4 py-3.5 flex gap-2 items-center';

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.className = 'typing-dot';
    box.appendChild(dot);
  }

  wrap.appendChild(box);
  messagesEl.appendChild(wrap);
  scrollBottom();
  return wrap;
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

  bubble('user', text, true);
  scrollBottom();

  const typingEl = showTyping();
  let assistantBox = null;

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
            if (!assistantBox) {
              typingEl.remove();
              assistantBox = bubble('assistant', '', true);
              assistantBox.classList.add('cursor');
            }
            assistantBox.textContent += token;
            scrollBottom();
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
  } catch {
    if (typingEl.parentNode) typingEl.remove();
    if (!assistantBox) assistantBox = bubble('assistant', '', true);
    assistantBox.textContent = '(connection error)';
  } finally {
    if (typingEl.parentNode) typingEl.remove();
    if (assistantBox) assistantBox.classList.remove('cursor');
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
