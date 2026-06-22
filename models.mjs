// Minimal, dependency-free model callers. Bring your own key (BYOK):
//
//   ANTHROPIC_API_KEY -> Claude   (api.anthropic.com)
//   DEEPSEEK_API_KEY  -> DeepSeek (api.deepseek.com, OpenAI-compatible)
//
// With no key set, that model answers in deterministic OFFLINE MOCK mode so the
// demo runs end to end with zero setup. The mock is grounded ONLY in the facts
// passed to it — so when SAIHM forgets a fact, the mock stops citing it too,
// and you still see the erasure effect with no API calls.

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const DEEPSEEK_MODEL = 'deepseek-chat';

function mockAnswer(model, facts) {
  const known = facts.length ? facts.map((f) => '  - ' + f).join('\n') : '  (nothing remembered)';
  const allergy = facts.find((f) => /allerg/i.test(f));
  const medical = allergy
    ? `Medically: per "${allergy}", avoid the substance it names.`
    : `Medically: nothing is remembered on that, so I won't guess.`;
  return `[${model} - offline mock]\nWhat I know about you:\n${known}\n${medical}`;
}

export async function askClaude(system, user, facts) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return mockAnswer('Claude', facts);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 256, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!res.ok) return `[Claude - HTTP ${res.status}] check ANTHROPIC_API_KEY`;
    const data = await res.json();
    return `[Claude - live]\n` + (data?.content?.[0]?.text ?? '(no text)');
  } catch (e) {
    return `[Claude - transport error] ${e?.message ?? e}`;
  }
}

export async function askDeepSeek(system, user, facts) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return mockAnswer('DeepSeek', facts);
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: DEEPSEEK_MODEL, max_tokens: 256, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    if (!res.ok) return `[DeepSeek - HTTP ${res.status}] check DEEPSEEK_API_KEY`;
    const data = await res.json();
    return `[DeepSeek - live]\n` + (data?.choices?.[0]?.message?.content ?? '(no text)');
  } catch (e) {
    return `[DeepSeek - transport error] ${e?.message ?? e}`;
  }
}
