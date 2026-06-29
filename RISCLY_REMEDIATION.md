# Riscly remediation plan

Generated from scan `5d6fa0f7-670e-4c3e-8c66-b20144235736` on 2026-06-29T13:31:13.740Z.

**Reliability score:** 0 / 100

**Open findings:** 42 (2 critical · 15 high · 18 medium · 7 low)

## Findings

### [CRITICAL] bhzyqzcefwlzqaalmocu is a single point of failure
- **Category:** spof
- **Component:** `db-supabase-bhzyqzcefwlzqaalmocu`
- bhzyqzcefwlzqaalmocu (database) has no redundancy and other components depend on it. Its failure takes down dependent functionality.

### [CRITICAL] All analyze endpoints are publicly accessible without authentication
- **Category:** security
- The @Public() decorator on the controller bypasses authentication for every endpoint (predict, reliability, security, simulate, report). These endpoints accept arbitrary graph payloads and invoke AI/analysis services that are likely computationally expensive and may expose sensitive architectural information. Any unauthenticated user on the internet can call them freely, enabling denial-of-service via resource exhaustion and unauthorized data extraction. Authentication should be enforced; if some endpoints truly need to be public, apply @Public() selectively per route rather than on the entire

### [HIGH] GraphDto nodes and edges validated only as arrays, no element-level validation
- **Category:** security
- `@IsArray()` confirms the value is an array but imposes no constraints on the array's contents. Arbitrary objects (including deeply nested structures with prototype-pollution payloads, circular references, or oversized data) will pass validation and be forwarded to the analysis engine. Each element should be typed/validated with `@ValidateNested({ each: true })` + `@Type(...)` using concrete DTOs, and an `@ArrayMaxSize()` limit should be imposed to prevent DoS.

### [HIGH] `params` accepts completely arbitrary user-controlled objects
- **Category:** security
- `Record<string, unknown>` with only `@IsObject()` means any key/value pairs are accepted and passed downstream. This can enable prototype-pollution attacks (e.g. `__proto__`, `constructor` keys), unexpected query/template injection if values are interpolated, and denial-of-service via oversized payloads. Keys and value types should be constrained to a known allow-list, or a dedicated DTO with explicit properties should be used.

### [HIGH] No rate limiting on unauthenticated, computationally expensive endpoints
- **Category:** security
- Combined with @Public(), the absence of any rate-limiting guard (e.g., NestJS Throttler) means an attacker can flood the predict, simulate, and report endpoints — which invoke AI inference and full-report generation — with arbitrary volume, causing denial-of-service through resource exhaustion. A throttle/rate-limit decorator or guard must be applied.

### [HIGH] Unsafe cast of DTO field to SystemGraph bypasses type validation
- **Category:** security
- Using 'as unknown as SystemGraph' discards any validation that PredictDto/AnalyzeDto/SimulateDto performs on the graph field. If the underlying DTO field is typed as 'any', 'object', or a plain record, class-validator decorators won't deeply validate nested graph structure, and the raw user-supplied payload is forwarded directly to the AI and analysis services. This can lead to prototype pollution, unexpected service behaviour, or server crashes. The graph field should be strongly typed and validated with nested @ValidateNested + @Type decorators so no cast is necessary.

### [HIGH] Unsafe cast of DTO field to SystemGraph in reliability endpoint
- **Category:** security
- Same unsafe 'as unknown as SystemGraph' pattern as in predict. The reliability service receives an unvalidated arbitrary object, risking crashes or exploitation of downstream graph-traversal logic.

### [HIGH] Unsafe cast of DTO field to SystemGraph in security endpoint
- **Category:** security
- Same unsafe 'as unknown as SystemGraph' pattern. The security-analysis service processes an unvalidated payload, which is particularly ironic given the endpoint's purpose.

### [HIGH] Unsafe casts of graph and params fields in simulate endpoint
- **Category:** security
- Both 'dto.graph as unknown as SystemGraph' and 'dto.params as SimulationParams' skip deep validation. An attacker can supply a malformed params object that crashes the simulation or a graph with unbounded size/cycles that causes excessive CPU/memory consumption.

### [HIGH] `thinking: { type: 'adaptive' }` is not a valid Anthropic SDK parameter
- **Category:** security
- The Anthropic Messages API accepts `{ type: 'enabled', budget_tokens: number }` for extended thinking, not `{ type: 'adaptive' }`. Passing an unrecognised value may cause the API call to fail at runtime or silently ignore the field, meaning thinking is never actually enabled. Use the documented shape or remove the parameter.

### [HIGH] `output_config` / `format` is not a recognised Anthropic SDK field
- **Category:** security
- The Anthropic `messages.create` API has no `output_config` or nested `format` field for JSON-schema enforcement. The constraint will be silently ignored, meaning the model can return arbitrary text. The response is then parsed with `JSON.parse` and cast directly to `Prediction[]`, creating a path where malformed or adversarial model output reaches callers without schema validation.

### [HIGH] Unsanitised `JSON.parse` on model-controlled content without try/catch at extraction step
- **Category:** security
- `text.indexOf('[')` and `text.lastIndexOf(']')` can match brackets inside strings or comments, producing a substring that is not valid JSON but is still passed to `JSON.parse`. The outer `try/catch` will swallow parse errors silently, but more critically, if parsing succeeds the result is cast directly to `AnalyzedIssue[]` (line 230). Although field-level filtering occurs on lines 232–242, there is no guard against a prototype-pollution payload (e.g., a `__proto__` key) in the parsed object. Use a safe JSON parser or validate the structure with a schema library before casting.

### [HIGH] @opentelemetry/auto-instrumentations-node@0.55.3: GHSA-q7rr-3cgh-j5r3
- **Category:** security
- Prometheus exporter process crash via malformed HTTP request Fixed in 0.75.0. (ttheoretic/SafetySaaS)

### [HIGH] @opentelemetry/exporter-prometheus@0.57.2: GHSA-q7rr-3cgh-j5r3
- **Category:** security
- Prometheus exporter process crash via malformed HTTP request Fixed in 0.217.0. (ttheoretic/SafetySaaS)

### [HIGH] @opentelemetry/sdk-node@0.57.2: GHSA-q7rr-3cgh-j5r3
- **Category:** security
- Prometheus exporter process crash via malformed HTTP request Fixed in 0.217.0. (ttheoretic/SafetySaaS)

### [HIGH] Redis has no redundancy
- **Category:** redundancy
- **Component:** `redis`
- Redis (cache) runs as a single instance; its failure degrades the system.

### [HIGH] Job Queue has no redundancy
- **Category:** redundancy
- **Component:** `queue`
- Job Queue (queue) runs as a single instance; its failure degrades the system.

### [MEDIUM] Container runs as root
- **Category:** security
- No non-root `USER` is set in the Dockerfile, so the container runs as root — a privilege-escalation risk if the app is compromised. Add a dedicated `USER`.

### [MEDIUM] Internal Supabase URL exposed to unauthenticated callers
- **Category:** security
- supabaseUrl (SUPABASE_URL) is returned verbatim to any anonymous client via the public /auth/config endpoint. This leaks an internal infrastructure detail (the Supabase project URL / self-hosted host) that aids reconnaissance and targeted attacks. The frontend only needs the boolean flag to choose a sign-in path; if it genuinely needs the URL it should be baked in at build time rather than fetched from an unauthenticated API. Remove supabaseUrl from the response, or at minimum restrict the endpoint to same-origin requests.

### [MEDIUM] AI provider errors are not caught — heuristics are lost on failure
- **Category:** security
- The comment in the JSDoc says the service 'degrades gracefully — if the AI provider is absent or fails, the heuristic predictions are returned on their own', but there is no try/catch around `this.ai.predict(...)`. If the provider throws, the entire `predict()` call rejects and the caller receives no predictions at all, not even the heuristic ones. The same applies to `chat()` (line 74) and `fixCode()` (line 96).

### [MEDIUM] Unauthenticated callers of `fixCode` default to `'opus'` instead of `'basic'`
- **Category:** security
- Lines 37 and 71 default to tier `'basic'` when no plan is provided (public/demo usage). Line 94 in `fixCode` and line 114 in `analyzeFile` instead default to `'opus'`, the highest-cost tier. This means unauthenticated or plan-less callers can trigger the most expensive model, which is inconsistent with the stated degradation policy and could lead to unexpected cost exposure.

### [MEDIUM] Unauthenticated callers of `analyzeFile` default to `'opus'` instead of `'basic'`
- **Category:** security
- Same issue as line 94: `analyzeFile` defaults to `'opus'` when `opts.plan` is absent, diverging from the `'basic'` default used everywhere else in the service. This creates an inconsistent privilege boundary and unintended resource consumption.

### [MEDIUM] Raw file `content` is passed to the AI provider without size limits
- **Category:** security
- `fixCode` and `analyzeFile` (line 109) accept arbitrary `content` strings and forward them directly to the AI provider. There is no maximum byte/character limit enforced at the service layer. A caller supplying a multi-megabyte file will produce an extremely large prompt, risking excessive cost, hitting provider context-window limits with unpredictable results, or being used as a vector to inflate billing.

### [MEDIUM] `AnalyzeDto` — graph property lacks `@IsObject()` / `@IsDefined()` guard before `@ValidateNested()`
- **Category:** security
- Without `@IsDefined()` (or `@IsNotEmpty()`), if `graph` is omitted from the request body it will be `undefined`. `@ValidateNested()` silently skips `undefined` values in class-validator, so the nested DTO constraints are never evaluated and the controller receives an unvalidated `undefined` value. Apply `@IsDefined()` (same applies to `SimulateDto` and `PredictDto`).

### [MEDIUM] `PredictDto` — `graph` missing `@IsDefined()` and `currentUsers` has no range constraint
- **Category:** security
- Same `@ValidateNested()` skip-on-undefined issue as above. Additionally, `currentUsers` has no `@Min(0)` / `@Max(...)` bound, so a caller can supply `Infinity`, `NaN`, or extreme negative numbers which may cause arithmetic errors or incorrect scaling calculations in downstream logic.

### [MEDIUM] `SimulateDto` — `durationHours` and `business` numeric fields lack range constraints
- **Category:** security
- `durationHours` is unbounded; a caller can submit an astronomically large value causing excessive computation. `BusinessDto.monthlyRevenue` and `activeUsers` similarly have no `@Min` / `@Max` guards, allowing negative or `Infinity` values that could cause financial miscalculations or division-by-zero in the analysis engine.

### [MEDIUM] report endpoint uses SimulateDto instead of a purpose-specific DTO
- **Category:** security
- The report handler accepts a SimulateDto but only uses graph and business fields, ignoring type, params, and durationHours. Reusing an unrelated DTO means extra fields pass validation silently, the API contract is misleading, and required/optional constraints of unused fields may incorrectly reject valid report requests. A dedicated ReportDto should be defined.

### [MEDIUM] PredictionService used in controller but not declared as a provider in the module
- **Category:** security
- AnalyzeController depends on PredictionService, which is imported from AiModule. If AiModule does not export PredictionService, NestJS will throw a dependency injection error at runtime. Even if it is exported, the module's own providers array should list or re-export it explicitly for clarity and maintainability. This creates a fragile implicit dependency on AiModule's internal exports.

### [MEDIUM] Environment variable read at module load time, not at call time
- **Category:** security
- Using `process.env.ANTHROPIC_MODEL` as a default parameter value means it is evaluated once when the module is first imported, not when the constructor is actually called. If the environment variable is injected after module load (e.g., in tests or certain DI containers), the default will be `undefined` and fall back to the hard-coded model string silently. Read `process.env` inside the constructor body instead.

### [MEDIUM] Filtering only `text` blocks discards the complete response when thinking is enabled
- **Category:** security
- When extended thinking is active the SDK returns `thinking` content blocks before the `text` block. Filtering to only `type === 'text'` is correct in principle, but if the model emits *only* a thinking block and no separate text block (possible on refusal or budget exhaustion), `text` will be an empty string and `parse` will log a warning and return `[]`. Add an explicit guard or log the raw block types to aid debugging.

### [MEDIUM] User-supplied `req.content` is interpolated directly into the prompt without sanitisation
- **Category:** security
- `req.content` (the raw file content) is embedded verbatim inside a fenced code block in the user message. An attacker who controls the file content can break out of the fence (triple backtick on its own line) and inject arbitrary instructions into the prompt, potentially causing the model to return a "fixed" file that introduces malicious code. Escape or encode triple-backtick sequences in `req.content` before interpolation.

### [MEDIUM] File path and content sent to model without sanitisation
- **Category:** security
- `req.file` and the numbered file content are interpolated directly into the user message. A crafted file path or file content containing model-instruction syntax could redirect the model's behaviour. At minimum, `req.file` should be validated to be a relative path with no special characters before being embedded in the prompt.

### [MEDIUM] AI-provided `category` and `severity` fields in predictions are not validated
- **Category:** security
- `p.category` and `p.severity` are cast directly to `Prediction` union types without checking that the value is actually a member of the allowed set. A model returning an unexpected string (or an adversarially crafted response) will produce objects that fail TypeScript's type guarantees at runtime and may cause downstream consumers to behave incorrectly. Apply the same allow-list pattern already used in `analyzeCode` (lines 236–238).

### [MEDIUM] @nestjs/core@10.4.22: GHSA-36xv-jgw5-4q75
- **Category:** security
- @nestjs/core Improperly Neutralizes Special Elements in Output Used by a Downstream Component ('Injection') Fixed in 11.1.18. (ttheoretic/SafetySaaS)

### [MEDIUM] @opentelemetry/core@1.30.1: GHSA-8988-4f7v-96qf
- **Category:** security
- OpenTelemetry Core: Unbounded memory allocation in W3C Baggage propagation Fixed in 2.8.0. (ttheoretic/SafetySaaS)

### [LOW] Stripe vendor lock-in (stripe)
- **Category:** vendor_lock_in
- **Component:** `stripe`
- Stripe relies on stripe with no documented fallback; an outage or pricing change has no mitigation.

### [LOW] bhzyqzcefwlzqaalmocu vendor lock-in (supabase)
- **Category:** vendor_lock_in
- **Component:** `db-supabase-bhzyqzcefwlzqaalmocu`
- bhzyqzcefwlzqaalmocu relies on supabase with no documented fallback; an outage or pricing change has no mitigation.

### [LOW] Auth-mode detection depends on environment variables that may be partially set
- **Category:** security
- The `supabase` flag is true when either SUPABASE_JWT_SECRET or SUPABASE_URL is set. A misconfigured deployment where only one of the two is present will advertise supabase=true to the frontend, causing it to attempt Supabase sign-in while the backend may reject those tokens (or vice-versa). The condition should require both variables to be present, matching whatever the actual JWT-validation logic requires.

### [LOW] No length or structure validation on the `messages` array passed to `chat()`
- **Category:** security
- The `messages` array is forwarded directly to `this.ai.chat()` without any length cap, message-count limit, or content-size check. A caller can pass an arbitrarily large history, causing outsized token consumption and potential denial-of-service through cost amplification against the AI provider.

### [LOW] Dedupe key uses an empty string for `nodeId`, causing unrelated predictions to collide
- **Category:** security
- When `p.nodeId` is `undefined` or `null`, the key becomes `':normalized-title'`. Two predictions from completely different nodes (both missing a `nodeId`) that happen to have the same normalized title will collide, and one will be silently dropped. This can discard valid heuristic or AI predictions that are genuinely independent.

### [LOW] `BusinessDto.currency` is a free-form string with no length or format constraint
- **Category:** security
- Without `@Length()` or `@Matches(/^[A-Z]{3}$/)`, any string is accepted as a currency code. If the value is used in downstream formatting, logging, or external API calls, an attacker can inject unexpected characters or excessively long strings.

### [LOW] Content length check uses byte-equivalent JS string length, not token count
- **Category:** security
- `req.content.length > 24_000` counts UTF-16 code units. A file with many multi-byte characters (e.g., CJK source) can exceed the model's context window while passing this check, causing an API error. Conversely, ASCII-heavy minified files at exactly 24 000 characters may still exceed token limits. Consider a rough token estimate (characters / 4) or use the SDK's token-counting utility.

## Recommended fixes

### Fix: bhzyqzcefwlzqaalmocu is a single point of failure
- **Priority:** critical
- **Risk reduction:** ~37%
- **Business impact:** Eliminates a total-outage path; protects revenue during component failure.
- **Fix:** Introduce redundancy: add a replica/second instance and automatic failover.

### Fix: All analyze endpoints are publicly accessible without authentication
- **Priority:** critical
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: GraphDto nodes and edges validated only as arrays, no element-level validation
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: `params` accepts completely arbitrary user-controlled objects
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: No rate limiting on unauthenticated, computationally expensive endpoints
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Unsafe cast of DTO field to SystemGraph bypasses type validation
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Unsafe cast of DTO field to SystemGraph in reliability endpoint
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Unsafe cast of DTO field to SystemGraph in security endpoint
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Unsafe casts of graph and params fields in simulate endpoint
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: `thinking: { type: 'adaptive' }` is not a valid Anthropic SDK parameter
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: `output_config` / `format` is not a recognised Anthropic SDK field
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Unsanitised `JSON.parse` on model-controlled content without try/catch at extraction step
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: @opentelemetry/auto-instrumentations-node@0.55.3: GHSA-q7rr-3cgh-j5r3
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: @opentelemetry/exporter-prometheus@0.57.2: GHSA-q7rr-3cgh-j5r3
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: @opentelemetry/sdk-node@0.57.2: GHSA-q7rr-3cgh-j5r3
- **Priority:** high
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Redis has no redundancy
- **Priority:** high
- **Risk reduction:** ~30%
- **Business impact:** Removes a single-instance failure that degrades the system.
- **Fix:** Run the component clustered/replicated with persistence.

### Fix: Job Queue has no redundancy
- **Priority:** high
- **Risk reduction:** ~30%
- **Business impact:** Removes a single-instance failure that degrades the system.
- **Fix:** Run the component clustered/replicated with persistence.

### Fix: Container runs as root
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Internal Supabase URL exposed to unauthenticated callers
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: AI provider errors are not caught — heuristics are lost on failure
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Unauthenticated callers of `fixCode` default to `'opus'` instead of `'basic'`
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Unauthenticated callers of `analyzeFile` default to `'opus'` instead of `'basic'`
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Raw file `content` is passed to the AI provider without size limits
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: `AnalyzeDto` — graph property lacks `@IsObject()` / `@IsDefined()` guard before `@ValidateNested()`
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: `PredictDto` — `graph` missing `@IsDefined()` and `currentUsers` has no range constraint
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: `SimulateDto` — `durationHours` and `business` numeric fields lack range constraints
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: report endpoint uses SimulateDto instead of a purpose-specific DTO
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: PredictionService used in controller but not declared as a provider in the module
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Environment variable read at module load time, not at call time
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Filtering only `text` blocks discards the complete response when thinking is enabled
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: User-supplied `req.content` is interpolated directly into the prompt without sanitisation
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: File path and content sent to model without sanitisation
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: AI-provided `category` and `severity` fields in predictions are not validated
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: @nestjs/core@10.4.22: GHSA-36xv-jgw5-4q75
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: @opentelemetry/core@1.30.1: GHSA-8988-4f7v-96qf
- **Priority:** medium
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Auth-mode detection depends on environment variables that may be partially set
- **Priority:** low
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: No length or structure validation on the `messages` array passed to `chat()`
- **Priority:** low
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Dedupe key uses an empty string for `nodeId`, causing unrelated predictions to collide
- **Priority:** low
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: `BusinessDto.currency` is a free-form string with no length or format constraint
- **Priority:** low
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Content length check uses byte-equivalent JS string length, not token count
- **Priority:** low
- **Risk reduction:** ~35%
- **Business impact:** Reduces breach likelihood and the blast radius of an attack.
- **Fix:** Close the exposure: add auth, WAF/CDN and consistent throttling.

### Fix: Stripe vendor lock-in (stripe)
- **Priority:** low
- **Risk reduction:** ~15%
- **Business impact:** Limits exposure to third-party outages and pricing changes.
- **Fix:** Abstract the dependency behind an interface and document a fallback.

### Fix: bhzyqzcefwlzqaalmocu vendor lock-in (supabase)
- **Priority:** low
- **Risk reduction:** ~15%
- **Business impact:** Limits exposure to third-party outages and pricing changes.
- **Fix:** Abstract the dependency behind an interface and document a fallback.

---

_This plan was generated automatically by [Riscly](https://riscly.ai). Review and adjust before acting._