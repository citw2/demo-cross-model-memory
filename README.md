# demo-cross-model-memory

**One client-side-encrypted memory. Every model. Erasure you can prove.**

This is a tiny, runnable demo of [SAIHM](https://saihm.coti.global) — non-custodial, post-quantum memory for AI agents. It stores three personal facts, grounds **both Claude and DeepSeek** in the *same* memory, then **forgets** one fact and shows that neither model can use it any more.

It runs **fully offline with zero signup** against a local *blind* endpoint (included, ~90 lines), or against the real hosted SAIHM service with one environment variable.

```
git clone https://github.com/citw2/demo-cross-model-memory
cd demo-cross-model-memory
npm install
node demo.mjs
```

## What you'll see

```text
------------------------------------------------------------------------
SAIHM cross-model memory demo
------------------------------------------------------------------------
agent id : e4203f25c7dd3a9b...
endpoint : http://127.0.0.1:33033/mcp  (local sandbox)
custody  : non-custodial  (the endpoint stores ciphertext only; it holds no key)

Sealed and stored 3 facts (the endpoint now holds 3 opaque shards).

------------------------------------------------------------------------
(1) One memory, every model -- Claude and DeepSeek, both grounded in SAIHM:
------------------------------------------------------------------------
[Claude - offline mock]
What I know about you:
  - My name is Dana Okafor.
  - I am allergic to penicillin.
  - I am building a Rust ray tracer called Lumen.
Medically: per "I am allergic to penicillin.", avoid the substance it names.

[DeepSeek - offline mock]
What I know about you:
  - My name is Dana Okafor.
  - I am allergic to penicillin.
  - I am building a Rust ray tracer called Lumen.
Medically: per "I am allergic to penicillin.", avoid the substance it names.

------------------------------------------------------------------------
(2) Provable erasure -- forget the allergy, then ask the same question again:
------------------------------------------------------------------------
forget("I am allergic to penicillin.")  ->  recall now returns: NOTHING (crypto-shredded)

[Claude - offline mock]
What I know about you:
  - My name is Dana Okafor.
  - I am building a Rust ray tracer called Lumen.
Medically: nothing is remembered on that, so I won't guess.

[DeepSeek - offline mock]
What I know about you:
  - My name is Dana Okafor.
  - I am building a Rust ray tracer called Lumen.
Medically: nothing is remembered on that, so I won't guess.
```

Two things just happened that a per-vendor "memory" feature can't do:

1. **Portability across models.** The memory lives with *you*, not inside one model's account. The same store grounds Claude and DeepSeek — and would ground GPT, Qwen, Kimi, GLM, a local model, or your own agent, unchanged.
2. **Provable erasure.** `forget` crypto-shreds the cell (its wrapped key is destroyed). `recall` returns nothing for it, and every model loses access at once — not a soft "hidden" flag. This is what GDPR Art. 17 ("right to erasure") actually asks for.

## Live model answers (optional, BYOK)

By default each model answers in a deterministic **offline mock** so the demo needs no keys. Add your own to get real answers:

```
export ANTHROPIC_API_KEY=...     # Claude  (claude-haiku-4-5)
export DEEPSEEK_API_KEY=...      # DeepSeek (deepseek-chat)
node demo.mjs
```

Set either, both, or neither — each model independently uses its key if present, or the mock if not. Keys are read from your environment and sent only to that model's own API.

## Go live against the real SAIHM service

The local sandbox is a throwaway stand-in so you can try the protocol offline — it is **not** the SAIHM service and stores nothing beyond the current process. To run the exact same demo against the real, hosted, blind endpoint:

1. **Join SAIHM** at **[saihm.coti.global/join](https://saihm.coti.global/join)** and onboard to obtain your JWT. (Going live requires a paid membership — there is no free tier.)
2. Point the demo at the live endpoint:

   ```
   export SAIHM_ENDPOINT_URL=https://saihm.coti.global/mcp
   export SAIHM_AUTH_HEADER="Bearer <your-onboard-JWT>"
   export SAIHM_MASTER_SECRET_HEX=<>= 64 hex chars, generated and held only by you>
   node demo.mjs
   ```

Your master secret never leaves your machine; the endpoint only ever receives ciphertext.

## How it works

- [`@saihm/mcp-server-pro`](https://www.npmjs.com/package/@saihm/mcp-server-pro) (the client) seals every cell with [`@saihm/client-pro`](https://www.npmjs.com/package/@saihm/client-pro): an **ML-DSA-65** identity signs it, a per-cell **AES-256-GCM** key encrypts it, and that key is wrapped under a key-encryption key derived from *your* master secret. Sharing uses **ML-KEM-768**. All of this happens in your process.
- Only opaque ciphertext is POSTed to the endpoint. [`sandbox.mjs`](./sandbox.mjs) is a complete, readable *blind operator*: it stores and returns ciphertext and **never holds a key** — exactly the property the hosted service provides at scale (with on-chain anchoring, authenticated sharing, and metering).
- `forget` tells the endpoint to destroy the wrapped key. Without it the ciphertext is unrecoverable noise — that is the "crypto-shred".

## Built on / see also

- **[`@saihm/mcp-server-pro`](https://github.com/SAIHM-Admin/saihm-mcp-server-pro)** — the production sealing client this demo uses ([npm](https://www.npmjs.com/package/@saihm/mcp-server-pro)).
- **[`@saihm/client-pro`](https://github.com/SAIHM-Admin/saihm-client-pro)** — the post-quantum client crypto library ([npm](https://www.npmjs.com/package/@saihm/client-pro)).
- **[`@saihm/mcp-server`](https://github.com/SAIHM-Admin/saihm-mcp)** — the open MCP thin-client for the SAIHM transport ([npm](https://www.npmjs.com/package/@saihm/mcp-server)).
- **Join the protocol:** [saihm.coti.global/join](https://saihm.coti.global/join).

## License

Apache-2.0 © SAIHM
