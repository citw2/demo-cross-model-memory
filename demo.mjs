#!/usr/bin/env node
// SAIHM cross-model memory demo — one encrypted memory, every model; provable forget.
//
//   git clone https://github.com/citw2/demo-cross-model-memory
//   cd demo-cross-model-memory && npm install && node demo.mjs
//
// Optional, for LIVE model answers instead of the offline mock:
//   export ANTHROPIC_API_KEY=...      # Claude
//   export DEEPSEEK_API_KEY=...       # DeepSeek
//
// Optional, to run against the REAL hosted SAIHM service instead of the local
// sandbox (requires a paid SAIHM membership — see the README "Go live" section):
//   export SAIHM_ENDPOINT_URL=https://saihm.coti.global/mcp
//   export SAIHM_AUTH_HEADER="Bearer <your-onboard-JWT>"
//   export SAIHM_MASTER_SECRET_HEX=<>=64 hex chars, held only by you>
//
// What you will see:
//   1. Three personal facts are SEALED client-side and stored on a blind endpoint
//      that only ever holds ciphertext.
//   2. The SAME memory grounds BOTH Claude and DeepSeek — portability across models.
//   3. We FORGET one fact (crypto-shred). recall() returns nothing for it, and
//      neither model can cite it any more — provable erasure (GDPR Art. 17).

import { randomBytes } from 'node:crypto';
import { deriveIdentity, toHex, fromHex } from '@saihm/client-pro';
import { SaihmProClient } from '@saihm/mcp-server-pro';
import { startSandbox } from './sandbox.mjs';
import { askClaude, askDeepSeek } from './models.mjs';

const line = (s = '') => console.log(s);
const rule = () => line('-'.repeat(72));

const QUESTION = 'Briefly: what do you know about me, and is there anything I should avoid medically?';

async function bothModels(facts) {
  const system =
    'You are a helpful assistant. Use ONLY these remembered facts about the user; ' +
    'do not invent or assume anything not listed.\nRemembered facts:\n' +
    (facts.length ? facts.map((f) => '- ' + f).join('\n') : '(none)');
  const [claude, deepseek] = await Promise.all([
    askClaude(system, QUESTION, facts),
    askDeepSeek(system, QUESTION, facts),
  ]);
  line(claude);
  line();
  line(deepseek);
}

async function connect() {
  const liveUrl = process.env.SAIHM_ENDPOINT_URL;
  if (liveUrl) {
    const authHeader = process.env.SAIHM_AUTH_HEADER;
    const secretHex = process.env.SAIHM_MASTER_SECRET_HEX;
    if (!authHeader || !secretHex) {
      throw new Error('LIVE mode needs SAIHM_AUTH_HEADER (Bearer <JWT>) and SAIHM_MASTER_SECRET_HEX too.');
    }
    const master = fromHex(secretHex.trim());
    const saihm = new SaihmProClient(liveUrl, authHeader, master, {}); // tier resolved from your JWT
    return { saihm, where: `${liveUrl}  (LIVE)`, close: async () => {} };
  }
  const { url, close } = await startSandbox();
  const master = randomBytes(32); // a throwaway identity, held only on this machine
  const authHeader = `Bearer ${toHex(deriveIdentity(master).agentIdHash)}`;
  const saihm = new SaihmProClient(url, authHeader, master, { tier: 'SANDBOX' });
  return { saihm, where: `${url}  (local sandbox)`, close };
}

async function main() {
  const { saihm, where, close } = await connect();
  try {
    rule();
    line('SAIHM cross-model memory demo');
    rule();
    const st = await saihm.status();
    line(`agent id : ${saihm.agentIdHash.slice(0, 16)}...`);
    line(`endpoint : ${where}`);
    line(`custody  : ${st.custody}  (the endpoint stores ciphertext only; it holds no key)`);
    line();

    // 1) Remember three personal facts — each sealed client-side before it leaves the process.
    const facts = [
      'My name is Dana Okafor.',
      'I am allergic to penicillin.',
      'I am building a Rust ray tracer called Lumen.',
    ];
    const cellOf = {};
    for (const f of facts) cellOf[f] = (await saihm.remember(f)).cellId;
    const shards = (await saihm.status()).activeShardCount;
    line(`Sealed and stored ${facts.length} facts (the endpoint now holds ${shards} opaque shards).`);
    line();

    // 2) The SAME memory grounds BOTH models.
    rule();
    line('(1) One memory, every model -- Claude and DeepSeek, both grounded in SAIHM:');
    rule();
    await bothModels((await saihm.recall()).map((c) => c.plaintext));
    line();

    // 3) Forget the medical fact (crypto-shred), then prove it is gone.
    rule();
    line('(2) Provable erasure -- forget the allergy, then ask the same question again:');
    rule();
    const allergy = 'I am allergic to penicillin.';
    await saihm.forget(cellOf[allergy]);
    const gone = (await saihm.recallOne(cellOf[allergy])) === null;
    line(`forget("${allergy}")  ->  recall now returns: ${gone ? 'NOTHING (crypto-shredded)' : 'STILL PRESENT (unexpected)'}`);
    line();
    await bothModels((await saihm.recall()).map((c) => c.plaintext));
    line();

    rule();
    line('That memory is unrecoverable: its wrapped key was destroyed, so even the operator');
    line('cannot bring it back. One store, every model, and erasure you can prove.');
    line();
    line('Run it for real : set SAIHM_ENDPOINT_URL=https://saihm.coti.global/mcp (see README).');
    line('Join SAIHM      : https://saihm.coti.global/join');
    rule();
  } finally {
    await close();
  }
}

main().catch((e) => {
  console.error('demo failed:', e?.message ?? e);
  process.exit(1);
});
