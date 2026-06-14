# AI Failure Prediction

Predicts **future** failure modes — bottlenecks, scaling cliffs, architectural
and security risks that emerge as a system grows — from the scanned
`SystemGraph`. Two layers, so the feature works with or without an LLM.

```
SystemGraph ──▶ heuristic predictor (pure) ──┐
                                             ├──▶ merge + dedupe ──▶ predictions
              ──▶ AiProvider (Claude) ───────┘
```

## 1. Heuristic layer (`packages/shared/src/prediction.ts`)

Pure, deterministic, unit-tested. Always available. Encodes capacity and
architecture rules over the graph:

- non-redundant database on the critical path → primary bottleneck, with a
  user-count horizon estimated from the node's observed requests/min and the
  current user count (`"at ~50,000 users"`);
- single-instance API → throughput ceiling;
- unmetered API → abuse / overload on the first spike;
- single cache → thundering herd on restart;
- critically-depended-on Stripe/OpenAI with no fallback → availability/cost cliff;
- frontend without a CDN → origin saturation under viral peaks.

Each prediction carries a category, severity, likelihood, horizon, rationale
and a recommendation.

## 2. AI layer (`apps/api/src/ai`)

An `AiProvider` abstraction with two implementations:

- **`AnthropicProvider`** — calls Claude (`claude-opus-4-8` by default, adaptive
  thinking) with a compact, non-secret projection of the graph plus the
  heuristic findings as grounding, and asks for *non-obvious* additional
  predictions. Output is constrained to a JSON schema
  (`output_config.format`), refusals and errors are caught, and any failure
  resolves to an empty list.
- **`NullAiProvider`** — used when `ANTHROPIC_API_KEY` is unset; returns
  nothing so the pipeline runs on heuristics alone.

`PredictionService` always runs the heuristics, augments with the provider's
output, de-duplicates AI predictions that merely restate a heuristic, and sorts
by likelihood. Exposed at `POST /api/analyze/predict` and surfaced on the
dashboard's **AI Predictions** page.

## Why two layers

The LLM finds risks the rules miss (subtle coupling, domain-specific cliffs),
but the product must never depend on it being reachable, fast, or
non-refusing. Grounding the model on deterministic findings also keeps its
output specific and reduces hallucination. The result: the feature is always
useful, and strictly better when a key is configured.

## Tests

- `packages/shared/src/prediction.test.ts` — the heuristics (horizons,
  redundancy gating, determinism).
- `apps/api/src/ai/prediction.service.test.ts` — merge, dedupe and graceful
  degradation with a fake provider (no network).
- `apps/api/src/app.e2e.test.ts` — the `/analyze/predict` endpoint.
