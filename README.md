# demo-cross-model-memory

**One client-side-encrypted memory. Every model. Erasure you can prove.**

> ⭐ **[Star SAIHM on GitHub](https://github.com/SAIHM-Admin/saihm-mcp)** and share it — help every agent get portable, provable memory. [Share on X](https://x.com/intent/tweet?text=One%20encrypted%20memory%20for%20AI%20agents%20across%20Claude%2C%20DeepSeek%2C%20Qwen%2C%20Kimi%2C%20GLM%20%26%20GPT%20-%20with%20provable%20erasure.&url=https%3A%2F%2Fgithub.com%2Fcitw2%2Fdemo-cross-model-memory).

This is a tiny, runnable demo of [SAIHM](https://saihm.coti.global) — non-custodial, post-quantum memory for AI agents. It stores three personal facts, grounds **two models at once** (Claude and DeepSeek by default — or Qwen, Kimi, GLM, GPT; your pick) in the *same* memory, then **forgets** one fact and shows that neither model can use it any more.

It runs **fully offline with zero signup** against a local *blind* endpoint (included, ~130 lines), or against the real hosted SAIHM service with one environment variable.

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
endpoint : http://127.0.0.1:<port>/mcp  (local sandbox)
custody  : non-custodial  (the endpoint stores ciphertext only; it holds no key)
models   : Claude + DeepSeek  (set MODEL_A / MODEL_B to: claude, deepseek, qwen, kimi, glm, openai)

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

Two things just happened that a per-vendor "memory" feature doesn't give you:

1. **Portability across models.** Your memory lives with *you*, not inside one model's account — one live store that grounds Claude and DeepSeek at once, with no per-vendor export or lossy one-time import. The same store would ground GPT, Qwen, Kimi, GLM, a local model, or your own agent, unchanged.
2. **Provable erasure.** `forget` crypto-shreds the cell (its wrapped key is destroyed). `recall` returns nothing for it, and every model loses access at once — not a soft "hidden" flag. This is what GDPR Art. 17 ("right to erasure") actually asks for.

## Choose your models (any two, side by side)

The demo runs two models next to each other to show the *same* memory grounding both. Pick them with `MODEL_A` / `MODEL_B` (default: `claude` + `deepseek`):

```
MODEL_A=qwen MODEL_B=kimi node demo.mjs
```

| `MODEL_*` value | Model | API key env (BYOK) |
|---|---|---|
| `claude`   | Claude (Anthropic) | `ANTHROPIC_API_KEY` |
| `deepseek` | DeepSeek           | `DEEPSEEK_API_KEY` |
| `qwen`     | Qwen (Alibaba)     | `DASHSCOPE_API_KEY` |
| `kimi`     | Kimi (Moonshot)    | `MOONSHOT_API_KEY` |
| `glm`      | GLM (Zhipu)        | `ZHIPUAI_API_KEY` |
| `openai`   | GPT (OpenAI)       | `OPENAI_API_KEY` |

With no key set, a model answers in a deterministic **offline mock**, so the demo runs end to end with zero setup. Set a key to get real answers; keys are read from your environment and sent only to that model's own API. The DeepSeek / Qwen / Kimi / GLM / GPT calls are the *same* OpenAI-compatible request — SAIHM reaches every model through one path. (Override a provider's base URL or model id without touching code via `SAIHM_<MODEL>_URL` / `SAIHM_<MODEL>_MODEL`.)

That every one of these models can be grounded in — and erased from — a single store is the whole point: **your memory is yours, not locked inside one vendor.**

## Go live against the real SAIHM service

The local sandbox is a throwaway stand-in so you can try the protocol offline — it is **not** the SAIHM service and stores nothing beyond the current process. To run the exact same demo against the real, hosted, blind endpoint:

1. **Join SAIHM** at **[saihm.coti.global/join](https://saihm.coti.global/join)** and onboard to obtain your JWT. (Going live requires a paid membership — there is no free tier.)
2. Point the demo at the live endpoint:

   ```
   export SAIHM_ENDPOINT_URL=https://saihm.coti.global/mcp
   export SAIHM_AUTH_HEADER="Bearer <your-onboard-JWT>"
   export SAIHM_MASTER_SECRET_HEX=<at least 64 hex chars, generated and held only by you>
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
- **Learn more:** [AI memory needs a standard](https://saihm.coti.global/blog/2026-05-18-ai-memory-needs-a-standard) · [What makes SAIHM different](https://saihm.coti.global/blog/2026-05-31-what-makes-saihm-different).
- **Join the protocol:** [saihm.coti.global/join](https://saihm.coti.global/join).

## License

Apache-2.0 © SAIHM
