# Riscly — Enterprise Roadmap: von „Schätzung + Regex" zu „Beweis + verifizierten Fakten"

> Ziel: Eine Plattform, der auch große Unternehmen vertrauen, weil sie Risiken,
> Sicherheitslücken, Vulnerabilities und Code-Qualität **mit Beweis** erkennt —
> nicht mit Vermutung.

## 0. Die Leitidee: Fakten vs. Urteile

Es gibt zwei Arten von „Erkennen". Die ganze Roadmap dreht sich darum, so viel
wie möglich aus der rechten in die linke Spalte zu verschieben.

| | **Fakten — 100 % erreichbar** | **Urteile — nie 100 %** |
|---|---|---|
| Beispiele | Secret im Code, anfällige Lib-Version, RLS aus, Port offen, root-Container, fehlendes Backup | „Ist dieser String-Concat wirklich ausnutzbar?", Code-Smell-Schweregrad |
| Methode | Wahre Quelle **auslesen** (Lockfile, Cloud-API, DB-Katalog, AST) | Heuristik / Datenfluss / Modell → **Confidence** |
| Lieferobjekt | Determinismus + **Evidence** | Best-in-class Precision/Recall + Verifizierbarkeit |

**Kernregel für alle Phasen:** Jedes Finding bekommt ein `evidence`-Objekt (die
rohe Quelle) und einen `confidence`-Wert (`verified` | `high` | `heuristic`).
Das verwandelt „wir glauben" in „hier ist der Beweis".

---

## 1. Bestandsaufnahme (Stand heute)

| Bereich | Heute im Code | Reife | Datei |
|---|---|---|---|
| SAST (Code) | ~30 **zeilenweise Regex**-Regeln + optionaler AI-Deep-Scan | ⚠️ oberflächlich, kein Datenfluss | `apps/api/src/scanner/code-audit.ts` |
| SCA (Deps) | **OSV.dev**-Abfrage über Manifeste | ✅ echtes Fundament, nur direkte Deps | `apps/api/src/scanner/dependency-audit.ts` |
| Secrets | Regex-Signaturen (AWS/Stripe/GitHub…) | ⚠️ kein Entropy/History/Verifikation | `code-audit.ts` (`SECRET_RULES`) |
| Infra | **geschätzt** aus `package.json`/`compose`/`.env.example` | ❌ Inferenz, kein Fakt | `apps/api/src/scanner/collectors/github.collector.ts` |
| Architektur + Simulation | echte deterministische Engine | ✅ **Alleinstellungsmerkmal** | `packages/shared/src/scanner/`, `reliability.ts`, `scenario.ts` |
| Score / Risks | Topologie **+ Code + Deps** (seit Commit `890bddb`) | ✅ | `packages/shared/src/reliability.ts` |

**Fazit:** Solides Skelett + einzigartiges Architektur-/Simulationslayer (der
Moat). Aber der Detektions-Kern ist heute „Schätzung + Regex". Genau das macht
Phase 1 und Phase 3 zu den größten Vertrauens-Sprüngen.

---

## 2. Fundament (vor Phase 1, ~3–4 Tage)

Das zieht sich durch alles und sollte zuerst stehen:

1. **`evidence` + `confidence` ins Schema** (`packages/shared/src/findings.ts`):
   - `CodeIssue` / `Finding` / `DependencyVulnerability` bekommen
     `confidence: 'verified' | 'high' | 'heuristic'` und
     `evidence?: { kind; raw; ref? }` (SARIF-Trace, CVE-Link+Lockfile-Pfad,
     Cloud-API-Response, Commit-SHA …).
2. **SARIF als internes Normalformat** für alle Code-Engines, damit Semgrep/
   CodeQL/eigene Regeln einheitlich einlaufen und nach außen exportierbar sind.
3. **Repo-Clone-Worker**: Scans klonen das Repo flüchtig (statt nur GitHub-
   Contents-API), Voraussetzung für AST/Semgrep/History-Scan. Sandbox + Größen-/
   Zeit-Limit, Klon nach Scan wieder verwerfen.

---

## 3. Die 6 Phasen

### Phase 1 — Echte SAST-Engine (AST/Datenfluss) mit Beweis
- **Was:** Regex-SAST durch echte Engine ersetzen — **Semgrep** als Sidecar
  (OSS, 2000+ kuratierte Regeln, Taint-Tracking), optional `tree-sitter`-AST pro
  Sprache. Output → SARIF → `CodeIssue` mit **Datenfluss-Trace**.
- **Warum:** „Regex sah `eval`" → „Datenfluss `req.body` → `eval`, hier der
  Pfad". Unterschied zwischen Spielzeug und CISO-tauglich. Die Regex-Schicht
  bleibt als schneller Vorfilter (`confidence: 'heuristic'`).
- **Wie:** Im Clone-Worker `semgrep --sarif`; SARIF-Mapping; Code-View zeigt den
  Trace. Plan-Gating bleibt wie heute (`sast`-Feature).
- **Aufwand:** ~2–3 Wochen. **Vertrauens-Sprung: sehr hoch.**

### Phase 2 — Härtere SCA + SBOM
- **Was:** **transitive** Lockfile-Auflösung pro Ökosystem (`package-lock`,
  `pnpm-lock`, `poetry.lock`, `go.sum`…), **SBOM** (CycloneDX/SPDX),
  **Reachability** (wird die verwundbare Funktion im Call-Graph aufgerufen?).
- **Warum:** „lodash@4.17.20 verwundbar" → „…und in `auth/token.ts:14`
  tatsächlich aufgerufen" vs. „liegt ungenutzt rum". Halbiert FP. SBOM ist oft
  Compliance-Pflicht (US EO 14028, EU CRA).
- **Wie:** `Syft` (SBOM) + `Grype`/OSV-Scanner über echte Lockfiles;
  Reachability über Semgrep-Call-Graph. Baut auf bestehendem OSV-Code auf.
- **Aufwand:** ~2 Wochen. **Vertrauens-Sprung: hoch, Compliance-relevant.**

### Phase 3 — Verifizierte Infra-Collectoren (Schätzung → Fakt)
- **Was:** Read-only Collectoren gegen die **echte Quelle** statt Code-Inferenz:
  AWS (IAM `SecurityAudit`+`ViewOnlyAccess`), Supabase (Schema/RLS via
  Service-Role), Vercel/Render (Env-Namen, public deploys), Postgres
  (`pg_catalog`), K8s (read-only ServiceAccount).
- **Warum:** **Stärkstes Verkaufsargument.** „Port 5432 vermutlich offen" →
  „Security-Group sg-0a91 erlaubt 0.0.0.0/0:5432 — hier die AWS-API-Response."
  Beweisbar, deterministisch, `confidence: 'verified'`. Die Integrations-UI
  existiert schon (`settings-view.tsx`) — jetzt echte Logik dahinter.
- **Wie:** Je Provider ein `ProviderCollector` (Interface existiert in
  `apps/api/src/scanner/collectors/`), der die echte Config liest und auf
  `SystemNode`-Felder (`hasBackup`, `hasRateLimit`, public-ingress …) mappt.
  Credentials sind im Schema bereits verschlüsselt at-rest.
- **Aufwand:** ~1–1,5 Wochen **pro Provider**. Start: AWS + Supabase + Postgres.
  **Vertrauens-Sprung: sehr hoch.**

### Phase 4 — Secret-Scanning auf Profi-Niveau
- **Was:** Entropy-Erkennung + **Git-History-Scan** (nicht nur HEAD) + **Live-
  Verifikation** (lebt der Key noch? → Provider-API). `gitleaks`/`trufflehog`.
- **Warum:** „mögliches Secret" → „**aktiver** AWS-Key, vor 8 Monaten committed,
  noch gültig" = P0 mit Gewissheit. Verifikation eliminiert FP (`confidence:
  'verified'`).
- **Aufwand:** ~1,5 Wochen. **Vertrauens-Sprung: hoch, billiger Quick-Win.**

### Phase 5 — IaC- & Container-Scanning
- **Was:** Terraform/CloudFormation/K8s (`Checkov`/`Trivy config`) +
  Container-Image-Scan (`Trivy image`). „Infrastructure as Code" in der UI wird
  echt.
- **Warum:** Misconfig **vor** dem Deploy fangen (Shift-Left).
- **Aufwand:** ~2 Wochen.

### Phase 6 — Enterprise-Plattform-Layer (parallel ab Tag 1)
Ohne das kommt man nicht durch Konzern-Procurement — unabhängig von Detektion:
- **SARIF-Export** überall (GitHub-Security-Tab-kompatibel)
- **SSO/SAML/SCIM**, RBAC, Audit-Log (im Ansatz vorhanden)
- **SOC 2 Type II**, Daten-Residency, Verschlüsselung, externer Pen-Test
- **CI/CD-Gates** (PR-Check, „break the build"), Jira/Slack/ServiceNow
- **False-Positive-Management** (Triage/Suppress mit Begründung) — überlebens-
  wichtig für Adoption
- **On-Prem/VPC-Deploy** (viele Konzerne lassen Code nicht raus)
- **Aufwand:** laufend; SOC 2 ~3–6 Monate Vorlauf → früh starten.

---

## 4. Empfohlene Reihenfolge (Vertrauens-Sprung pro Aufwand)

1. **Fundament** (evidence/confidence + SARIF + Clone-Worker) — Basis für alles.
2. **Phase 1 (echte SAST)** — „oberflächlich" → „ernsthaft".
3. **Phase 3, beschränkt auf AWS + Supabase + Postgres** — „Schätzung" → „Fakt".
4. **Phase 2 (SCA + SBOM)** — schnell, Compliance, baut auf OSV auf.
5. **Phase 4 (Secrets verifiziert)** — billiger Wow-Effekt.
6. **Phase 6 parallel ab Tag 1** — SARIF + FP-Triage sofort; SOC 2 früh starten.
7. **Phase 5 (IaC/Container)** — wertvoll, später.

## 5. Was „mit Gewissheit" ehrlich heißt

- **Fakten (Infra, Versionen, Secrets, Syntax, Qualität):** echte Gewissheit
  erreichbar — durch Auslesen der wahren Quelle. Hier zielen wir auf 100 %.
- **Neue Code-Vulnerabilities:** kein Tool schafft 100 % (auch CodeQL/Snyk
  nicht). Ziel = best-in-class Precision/Recall **+ Beweis-Pfad**, niedrige FP-
  Rate, verifizierbare Findings. Das ist es, was Enterprises tatsächlich kaufen.

Der Moat bleibt das, was sonst keiner hat: **verifizierte Fakten + Topologie +
Simulation** — „so ripplet dieser Fehler durch deine Produktion".
