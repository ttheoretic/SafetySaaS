'use client'

import { useState } from 'react'
import { LegalShell, H2, P, UL } from '@/components/legal/legal-shell'

export default function PrivacyPage() {
  const [lang, setLang] = useState<'de' | 'en'>('de')
  return (
    <LegalShell
      title={lang === 'de' ? 'Datenschutzerklärung' : 'Privacy Policy'}
      lang={lang}
      onLang={setLang}
      updated="[DATUM]"
    >
      {lang === 'de' ? <De /> : <En />}
    </LegalShell>
  )
}

function Sub() {
  return (
    <UL>
      <li>Supabase (Authentifizierung, Datenbank) — Supabase Inc., USA</li>
      <li>Render (Hosting/API) — Render Services Inc., USA</li>
      <li>Vercel (Hosting/Frontend) — Vercel Inc., USA</li>
      <li>Stripe (Zahlungsabwicklung) — Stripe Inc., USA / Stripe Payments Europe Ltd., Irland</li>
      <li>Resend (E-Mail-Versand) — Resend Inc., USA</li>
      <li>Anthropic (KI-Analyse/Fixes, nur bei aktivierter KI) — Anthropic PBC, USA</li>
      <li>GitHub / GitLab (Quellcode-Zugriff, nur bei Verbindung) — GitHub Inc. (USA) / GitLab Inc.</li>
      <li>OSV.dev (Abgleich bekannter Schwachstellen) — Open Source Vulnerabilities, Google LLC</li>
      <li>Cloud-Provider, die du selbst verbindest (z. B. AWS) — read-only Konfigurationsdaten</li>
    </UL>
  )
}

function De() {
  return (
    <>
      <P>
        Diese Datenschutzerklärung informiert über die Verarbeitung
        personenbezogener Daten bei Nutzung von Riscly (der „Dienst") gemäß
        Datenschutz-Grundverordnung (DSGVO).
      </P>

      <H2>1. Verantwortlicher</H2>
      <P>
        Theo Handschug, Ahornallee 14c, 16548 Glienicke/Nordbahn, Deutschland. E-Mail:
        datenschutz@riscly.app. Vollständige Kontaktdaten siehe Impressum.
      </P>

      <H2>2. Welche Daten wir verarbeiten</H2>
      <UL>
        <li>
          <strong>Konto- und Vertragsdaten:</strong> Name, E-Mail-Adresse,
          Workspace-/Organisationsname, Plan- und Abrechnungsstatus.
        </li>
        <li>
          <strong>Authentifizierung:</strong> via Supabase; bei Social-Login
          (Google/GitHub) die vom Anbieter freigegebene Profil-/E-Mail-Info.
        </li>
        <li>
          <strong>Analyse-Daten:</strong> Inhalte, die du verbindest — Quellcode
          und Metadaten deiner Repositories, abgeleitete Architektur, Abhängigkeiten
          und Cloud-Konfiguration (read-only). Gefundene Secrets werden vor der
          Speicherung maskiert.
        </li>
        <li>
          <strong>Zahlungsdaten:</strong> über Stripe; wir speichern keine
          vollständigen Kartendaten.
        </li>
        <li>
          <strong>Nutzungs-/Log-Daten:</strong> IP-Adresse, Zeitstempel,
          technische Request-/Fehlerdaten zur Bereitstellung und Sicherheit.
        </li>
      </UL>

      <H2>3. Zwecke und Rechtsgrundlagen</H2>
      <UL>
        <li>
          Bereitstellung des Dienstes und Vertragserfüllung — Art. 6 Abs. 1 lit. b
          DSGVO.
        </li>
        <li>
          Sicherheit, Missbrauchsabwehr, Stabilität, Produktverbesserung —
          berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO.
        </li>
        <li>Abrechnung und gesetzliche Aufbewahrung — Art. 6 Abs. 1 lit. c DSGVO.</li>
        <li>
          Optionale Mitteilungen/Marketing — Einwilligung, Art. 6 Abs. 1 lit. a
          DSGVO (jederzeit widerrufbar).
        </li>
      </UL>

      <H2>4. Auftragsverarbeiter / Subunternehmer</H2>
      <P>
        Zur Erbringung des Dienstes setzen wir folgende Dienstleister als
        Auftragsverarbeiter (Art. 28 DSGVO) ein:
      </P>
      <Sub />

      <H2>5. Datenübermittlung in Drittländer</H2>
      <P>
        Einige Dienstleister sitzen in den USA. Übermittlungen erfolgen auf
        Grundlage von EU-Standardvertragsklauseln (SCC) und — soweit zertifiziert —
        des EU-US Data Privacy Framework, nebst geeigneter zusätzlicher
        Schutzmaßnahmen.
      </P>

      <H2>6. Auftragsverarbeitung für Geschäftskunden (DPA)</H2>
      <P>
        Soweit wir in deinem Auftrag personenbezogene Daten verarbeiten (z. B. in
        deinem Quellcode), stellen wir einen Auftragsverarbeitungsvertrag (AVV /
        DPA) bereit. Kontaktiere uns unter [datenschutz@deinedomain.de].
      </P>

      <H2>7. Speicherdauer</H2>
      <P>
        Wir speichern Daten nur so lange, wie es für die genannten Zwecke
        erforderlich ist oder gesetzliche Aufbewahrungsfristen (z. B. handels- und
        steuerrechtlich bis zu 10 Jahre für Rechnungen) bestehen. Scan-/Analyse-Daten
        werden mit Löschung des Projekts bzw. Kontos entfernt.
      </P>

      <H2>8. Deine Rechte</H2>
      <P>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung,
        Datenübertragbarkeit und Widerspruch sowie auf Widerruf erteilter
        Einwilligungen. Außerdem besteht ein Beschwerderecht bei einer
        Aufsichtsbehörde. Anfragen an datenschutz@riscly.app.
      </P>

      <H2>9. Cookies</H2>
      <P>
        Wir verwenden technisch notwendige Cookies/Local-Storage für Anmeldung und
        Sitzung. Nicht notwendige Cookies (z. B. Analyse) setzen wir nur mit deiner
        Einwilligung.
      </P>

      <H2>10. Änderungen</H2>
      <P>
        Wir können diese Erklärung anpassen; die jeweils aktuelle Fassung ist hier
        abrufbar.
      </P>
    </>
  )
}

function En() {
  return (
    <>
      <P>
        This Privacy Policy explains how Riscly (the “Service”) processes personal
        data, in line with the EU General Data Protection Regulation (GDPR) and,
        where applicable, other privacy laws (e.g. the California Consumer Privacy
        Act).
      </P>

      <H2>1. Controller</H2>
      <P>
        Theo Handschug, Ahornallee 14c, 16548 Glienicke/Nordbahn, Germany. Email: privacy@riscly.app. See the
        Impressum for full contact details.
      </P>

      <H2>2. Data we process</H2>
      <UL>
        <li>
          <strong>Account &amp; contract data:</strong> name, email, workspace/org
          name, plan and billing status.
        </li>
        <li>
          <strong>Authentication:</strong> via Supabase; for social login
          (Google/GitHub), the profile/email info the provider releases.
        </li>
        <li>
          <strong>Analysis data:</strong> the content you connect — your repository
          source code and metadata, inferred architecture, dependencies and cloud
          configuration (read-only). Detected secrets are masked before storage.
        </li>
        <li>
          <strong>Payment data:</strong> via Stripe; we do not store full card
          numbers.
        </li>
        <li>
          <strong>Usage/log data:</strong> IP address, timestamps, technical
          request/error data for operation and security.
        </li>
      </UL>

      <H2>3. Purposes &amp; legal bases</H2>
      <UL>
        <li>Providing the Service / performing the contract — Art. 6(1)(b) GDPR.</li>
        <li>
          Security, abuse prevention, stability, product improvement — legitimate
          interests, Art. 6(1)(f) GDPR.
        </li>
        <li>Billing and statutory retention — Art. 6(1)(c) GDPR.</li>
        <li>Optional communications/marketing — consent, Art. 6(1)(a) GDPR.</li>
      </UL>

      <H2>4. Subprocessors</H2>
      <P>We use the following processors (Art. 28 GDPR) to run the Service:</P>
      <Sub />

      <H2>5. International transfers</H2>
      <P>
        Some processors are located in the USA. Transfers rely on the EU Standard
        Contractual Clauses and, where certified, the EU-US Data Privacy Framework,
        with appropriate supplementary measures.
      </P>

      <H2>6. Data Processing Agreement (business customers)</H2>
      <P>
        Where we process personal data on your behalf (e.g. within your source
        code), we provide a Data Processing Agreement (DPA). Contact
        [privacy@yourdomain.com].
      </P>

      <H2>7. Retention</H2>
      <P>
        We keep data only as long as necessary for the stated purposes or as
        required by law (e.g. invoices up to 10 years under German tax law).
        Scan/analysis data is removed when the project or account is deleted.
      </P>

      <H2>8. Your rights</H2>
      <P>
        You have the right to access, rectify, erase, restrict, port and object to
        processing, and to withdraw consent. You may also lodge a complaint with a
        supervisory authority. Requests: privacy@riscly.app.
      </P>

      <H2>9. Cookies</H2>
      <P>
        We use strictly necessary cookies/local storage for sign-in and sessions.
        Non-essential cookies (e.g. analytics) are set only with your consent.
      </P>

      <H2>10. Changes</H2>
      <P>We may update this policy; the current version is always available here.</P>
    </>
  )
}
