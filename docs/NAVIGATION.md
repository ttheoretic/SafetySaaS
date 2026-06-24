# Riscly — Navigations- & Informationsarchitektur (Enterprise)

> Ziel: eine Sidebar, die von oben bis unten gefüllt ist und trotzdem nicht wie
> ein Grab-Bag wirkt — weil jede Überkategorie eine **Sektion** ist und jeder
> Eintrag genau eines von drei Dingen: ein **Objekttyp**, ein **Workflow** oder
> eine **Governance-Fläche**.

## 1. Die Prüfregel (gegen „beliebig zusammengewürfelt")

Jeder Navigationspunkt muss eine dieser drei Rechtfertigungen haben:

1. **Objekt** — hat eine eigene Liste (Services, Dependencies, Secrets, Findings)
2. **Workflow** — hat einen eigenen Zustand (Triage, Policies, Compliance)
3. **Governance** — Admin/Steuerung (RBAC, SSO, Audit, Billing)

Was keine dieser drei erfüllt, wird **kein eigener Tab**, sondern eine Linse
(Filter/Tab innerhalb einer Seite). Beispiel: „Simulation" ist primär eine
Impact-Linse in Architecture/Findings, nicht zwingend eine Top-Sektion.

## 2. Die vollständige Sidebar (Überkategorien → Kinder)

```
🏠 HOME
   Portfolio              Exec-Sicht über ALLE Repos (Score, Top-Risiken)
   Dashboard              aktives Projekt
   Trends                 Score-/MTTR-Verlauf über Zeit

🗺 POSTURE
   Architecture           der Moat — System-Graph
   Simulation             Impact / Blast-Radius (Linse auf den Graphen)
   Attack Paths           Kill-Chains durch den Graphen

🛡 FINDINGS
   All Findings           vereinte, filterbare Liste (Default-Einstieg)
   Code (SAST)
   Dependencies (SCA)
   Secrets
   Cloud / Infra
   IaC
   Containers

📦 INVENTORY
   Services
   Dependencies / SBOM
   Data Stores
   Cloud Resources
   Secrets Inventory

🔧 REMEDIATION
   Triage Queue           zuweisen / Status / SLA
   Fixes & PRs
   Policies / Rules       „break the build"-Regeln
   Suppressions           False-Positive-Management mit Begründung

✅ COMPLIANCE
   Frameworks             SOC2 / ISO / PCI / EU-CRA
   Reports & Export       SARIF / SBOM / PDF
   Evidence
   Audit Log

🔌 INTEGRATIONS
   Connections
   CI/CD
   Notifications

⚙ ADMIN
   Org & Teams (RBAC)
   Members & SSO
   Billing
   API Tokens

⌘K  Assistant             allgegenwärtig (Cmd-K / Seitenpanel), kein Tab
```

## 3. Migration: wohin wandert der heutige View?

| Heute | Künftig |
|---|---|
| Overview (`/dashboard`) | **HOME › Dashboard**; neue Ebene **HOME › Portfolio** darüber |
| Architecture | **POSTURE › Architecture** (unverändert, Kern) |
| Risks | aufgelöst in **FINDINGS › All Findings** (+ Severity-Filter) |
| Security | aufgelöst in **FINDINGS** (Linse) statt eigener Tab |
| Code Analysis | **FINDINGS › Code (SAST)** |
| Simulation | **POSTURE › Simulation** (primär Linse, bleibt aufrufbar) |
| AI Assistant | **⌘K** allgegenwärtig statt Reiseziel |
| Settings | aufgefächert in **INTEGRATIONS** + **ADMIN** |

Kein Verlust bestehender Funktion — nur Umhängen und Zusammenführen.

## 4. Wann entsteht welcher Tab? (Nav wächst mit der Roadmap)

| Sektion/Eintrag | Wird echt mit |
|---|---|
| Code (SAST) mit Datenfluss | Phase 1 |
| Dependencies / SBOM, Inventory | Phase 2 |
| Cloud / Infra, Drift, Cloud Resources | Phase 3 |
| Secrets (verifiziert) | Phase 4 |
| IaC / Containers | Phase 5 |
| Compliance, Reports, Audit, SSO, RBAC | Phase 6 |
| Trends, Triage Queue, Policies, Suppressions | sobald laufende Daten da sind |

**Regel:** Ein Tab erscheint erst, wenn die Engine dahinter echte Findings/
Objekte liefert. Leere Tabs vorzeigen = billig. Heute schlank, mit jeder Phase
voller — das ist korrekt, kein Versäumnis.

---

## 5. Wie man Überkategorien *technisch* löst

Die Überkategorien sind **Sektionen mit Kindern**, gesteuert über eine einzige
deklarative Config — nicht hartverdrahtetes JSX. So bleibt die Nav wartbar,
einklappbar, rollen- und entitlement-gefiltert.

### 5.1 Datenstruktur (eine Quelle der Wahrheit)

```ts
// apps/web/lib/nav-config.ts  (Skizze, noch nicht gebaut)
type Role = 'developer' | 'analyst' | 'ciso' | 'admin'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: 'findingCount' | 'triageCount'   // dynamisch gefüllt
  feature?: PlanFeature                      // Plan-Gating (du hast hasFeature schon)
  roles?: Role[]                             // Persona-Filter; leer = alle
  phase?: 1 | 2 | 3 | 4 | 5 | 6              // erscheint erst, wenn freigeschaltet
}

interface NavSection {
  id: string
  label: string            // die ÜBERKATEGORIE
  icon: LucideIcon
  defaultOpen?: boolean
  items: NavItem[]
}

export const NAV: NavSection[] = [
  { id: 'home', label: 'Home', icon: Home, defaultOpen: true, items: [
      { href: '/portfolio', label: 'Portfolio', icon: LayoutGrid, roles: ['ciso','admin'] },
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/trends',    label: 'Trends',    icon: TrendingUp },
  ]},
  { id: 'findings', label: 'Findings', icon: ShieldAlert, defaultOpen: true, items: [
      { href: '/findings',          label: 'All Findings', icon: List, badge: 'findingCount' },
      { href: '/findings/code',     label: 'Code (SAST)',  icon: CodeXml,    feature: 'sast' },
      { href: '/findings/deps',     label: 'Dependencies', icon: Boxes,      feature: 'sca' },
      { href: '/findings/secrets',  label: 'Secrets',      icon: KeyRound,   phase: 4 },
      { href: '/findings/cloud',    label: 'Cloud / Infra',icon: Cloud,      phase: 3 },
      // …
  ]},
  // … POSTURE, INVENTORY, REMEDIATION, COMPLIANCE, INTEGRATIONS, ADMIN
]
```

### 5.2 Rendering-Regeln (das löst die Dichte sauber)

1. **Sektion = einklappbare Gruppe** mit Header-Label. 35 Ziele werden kognitiv
   zu „8 Gruppen". State (offen/zu) pro Sektion in `localStorage` merken.
2. **Sichtbarkeitsfilter in dieser Reihenfolge:**
   `phase freigeschaltet?` → `feature im Plan?` → `Rolle passt?`
   Was rausfällt, wird gar nicht gerendert (kein ausgegrauter Müll).
3. **Leere Sektion = ausgeblendet.** Hat eine Überkategorie nach Filterung keine
   Kinder, verschwindet auch ihr Header.
4. **Aktiver Pfad** öffnet seine Sektion automatisch und markiert das Kind.
5. **Badges dynamisch** (offene Findings, Triage-Queue-Länge) — gibt der Nav
   „Leben" und zieht den Blick auf das Wichtige.
6. **Collapsed-Rail-Modus:** zusammengeklappt zeigt die Sidebar nur die
   Sektions-Icons; Hover öffnet ein Flyout mit den Kindern (Pattern à la
   GitLab/Linear) — so funktioniert die Dichte auch auf schmalem Schirm.

### 5.3 Personas (senkt wahrgenommene Komplexität)

Dieselbe `NAV`-Config, gefiltert nach `roles`:

| Rolle | Sieht primär |
|---|---|
| **Developer** | Findings, Fixes & PRs, Code, Dependencies |
| **Security-Analyst** | Triage Queue, Attack Paths, Findings, Suppressions |
| **CISO** | Portfolio, Trends, Compliance, Reports |
| **Admin** | alles + ADMIN-Sektion |

Ein Umschalter „View as …" oder die echte Rolle aus dem Auth-Kontext entscheidet
— dieselbe App, je Persona eine fokussierte Sidebar. Das ist ein echtes
Enterprise-Kennzeichen und macht die volle Nav erst beherrschbar.

---

## 6. Kernaussage

Überkategorien sind **gruppierte, einklappbare Sektionen**, getrieben von **einer
deklarativen Config** mit drei Filtern (Phase, Plan-Feature, Rolle). Die Sidebar
füllt sich von oben bis unten **automatisch**, sobald die Roadmap-Engines echte
Objekte und Workflows liefern — die Dichte ist ein Symptom echter Tiefe, kein
Designtrick.
