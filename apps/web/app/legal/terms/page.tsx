'use client'

import { useState } from 'react'
import { LegalShell, H2, P, UL } from '@/components/legal/legal-shell'

export default function TermsPage() {
  const [lang, setLang] = useState<'de' | 'en'>('de')
  return (
    <LegalShell
      title={lang === 'de' ? 'Allgemeine Geschäftsbedingungen (AGB)' : 'Terms of Service'}
      lang={lang}
      onLang={setLang}
      updated="30. Juni 2026"
    >
      {lang === 'de' ? <De /> : <En />}
    </LegalShell>
  )
}

function De() {
  return (
    <>
      <P>
        Diese Allgemeinen Geschäftsbedingungen („AGB") regeln die Nutzung von
        Riscly (der „Dienst"), angeboten von Theo Handschug,
        Ahornallee 14c, 16548 Glienicke/Nordbahn, Deutschland („wir", „uns"). Mit der Registrierung oder
        Nutzung des Dienstes stimmst du diesen AGB zu.
      </P>

      <H2>1. Leistungsbeschreibung</H2>
      <P>
        Riscly analysiert verbundene Repositories, Abhängigkeiten und
        Cloud-Konfigurationen, um eine Architektur-Übersicht sowie Sicherheits-
        und Risikohinweise bereitzustellen, und kann auf Wunsch automatisierte
        Korrekturvorschläge (Code-Fixes) erstellen. Der konkrete Funktionsumfang
        richtet sich nach dem gewählten Plan und kann fortlaufend
        weiterentwickelt werden.
      </P>

      <H2>2. Keine Garantie der Sicherheit (wichtig)</H2>
      <P>
        Riscly ist ein unterstützendes Werkzeug und <strong>keine Gewähr</strong>{' '}
        für die Sicherheit deiner Software. Automatisierte Analysen können nicht
        alle Schwachstellen, Fehlkonfigurationen oder Risiken erkennen und können
        Falsch-Positive bzw. Falsch-Negative liefern. Vorgeschlagene Code-Fixes
        sind Vorschläge: Du bist verpflichtet, jede Änderung vor dem Einsatz zu
        prüfen, zu testen und freizugeben. Die Verantwortung für die Sicherheit
        und den Betrieb deiner Systeme verbleibt vollständig bei dir.
      </P>

      <H2>3. Registrierung und Konto</H2>
      <P>
        Du musst zutreffende Angaben machen und deine Zugangsdaten geheim halten.
        Du bist für alle Aktivitäten unter deinem Konto verantwortlich. Der Dienst
        richtet sich an Unternehmer i. S. d. § 14 BGB; eine Nutzung ist erst ab
        Volljährigkeit zulässig.
      </P>

      <H2>4. Zulässige Nutzung</H2>
      <UL>
        <li>
          Du darfst nur Repositories und Systeme verbinden, für die du
          berechtigt bist (Eigentum oder ausdrückliche Erlaubnis).
        </li>
        <li>
          Keine rechtswidrige Nutzung, kein Reverse Engineering, keine
          Überlastung oder Störung des Dienstes, keine Umgehung von
          Zugriffs-/Nutzungsgrenzen.
        </li>
        <li>
          Du bleibst dafür verantwortlich, geltendes Recht (inkl. Exportrecht und
          Datenschutz) einzuhalten.
        </li>
      </UL>

      <H2>5. Daten und Geheimnisse</H2>
      <P>
        Zugriffe auf verbundene Dienste erfolgen, soweit möglich, lesend
        (read-only). Erkannte Secrets werden vor der Speicherung maskiert.
        Einzelheiten zur Verarbeitung personenbezogener Daten regelt die
        Datenschutzerklärung; für die Verarbeitung in deinem Auftrag stellen wir
        einen AVV (DPA) bereit.
      </P>

      <H2>6. Preise, Zahlung, Verlängerung</H2>
      <P>
        Kostenpflichtige Pläne werden über unseren Zahlungsdienstleister Stripe
        abgerechnet. Sofern nicht anders angegeben, verstehen sich Preise zzgl.
        gesetzlicher Umsatzsteuer und werden im Voraus für den jeweiligen
        Abrechnungszeitraum fällig. Abonnements verlängern sich automatisch um den
        gewählten Zeitraum, bis sie gekündigt werden.
      </P>

      <H2>7. Kündigung und Widerruf</H2>
      <P>
        Du kannst dein Abonnement jederzeit zum Ende des laufenden
        Abrechnungszeitraums kündigen. Wir können das Vertragsverhältnis bei
        Verstößen gegen diese AGB sperren oder beenden. Hinweise zum
        Widerrufsrecht für Verbraucher (sofern anwendbar) werden gesondert
        bereitgestellt.
      </P>

      <H2>8. Verfügbarkeit</H2>
      <P>
        Wir bemühen uns um eine hohe Verfügbarkeit, schulden jedoch — soweit kein
        gesondertes SLA vereinbart ist — keine bestimmte Verfügbarkeit. Wartung,
        Updates und Störungen Dritter können den Dienst zeitweise einschränken.
      </P>

      <H2>9. Haftung</H2>
      <P>
        Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie für
        Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit. Bei
        einfacher Fahrlässigkeit haften wir nur bei Verletzung einer wesentlichen
        Vertragspflicht (Kardinalpflicht) und begrenzt auf den vertragstypischen,
        vorhersehbaren Schaden. Im Übrigen ist die Haftung ausgeschlossen. Die
        Haftung nach dem Produkthaftungsgesetz bleibt unberührt.
      </P>

      <H2>10. Freistellung</H2>
      <P>
        Du stellst uns von Ansprüchen Dritter frei, die aus einer von dir zu
        vertretenden rechtswidrigen Nutzung des Dienstes oder einer Verletzung
        dieser AGB entstehen.
      </P>

      <H2>11. Änderungen der AGB</H2>
      <P>
        Wir können diese AGB mit Wirkung für die Zukunft ändern und informieren
        dich rechtzeitig in Textform. Widersprichst du nicht innerhalb der
        angegebenen Frist, gelten die geänderten Bedingungen als angenommen.
      </P>

      <H2>12. Schlussbestimmungen</H2>
      <P>
        Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Soweit
        zulässig, ist Gerichtsstand der Sitz des Anbieters. Sollte eine Bestimmung
        unwirksam sein, bleibt der übrige Vertrag wirksam.
      </P>
    </>
  )
}

function En() {
  return (
    <>
      <P>
        These Terms of Service (“Terms”) govern the use of Riscly (the
        “Service”), provided by Theo Handschug, Ahornallee 14c, 16548 Glienicke/Nordbahn, Germany (“we”,
        “us”). By registering for or using the Service you agree to these Terms.
      </P>

      <H2>1. The Service</H2>
      <P>
        Riscly analyzes connected repositories, dependencies and cloud
        configuration to provide an architecture overview plus security and risk
        insights, and can optionally generate automated remediation suggestions
        (code fixes). The exact feature set depends on your plan and may evolve
        over time.
      </P>

      <H2>2. No security guarantee (important)</H2>
      <P>
        Riscly is an assistive tool and provides <strong>no guarantee</strong> of
        the security of your software. Automated analysis cannot detect all
        vulnerabilities, misconfigurations or risks and may produce false
        positives or false negatives. Suggested code fixes are proposals: you must
        review, test and approve every change before use. Responsibility for the
        security and operation of your systems remains entirely with you.
      </P>

      <H2>3. Registration and account</H2>
      <P>
        You must provide accurate information and keep your credentials
        confidential. You are responsible for all activity under your account. The
        Service is intended for business use and for users of legal age.
      </P>

      <H2>4. Acceptable use</H2>
      <UL>
        <li>
          Connect only repositories and systems you are authorized to access
          (ownership or explicit permission).
        </li>
        <li>
          No unlawful use, reverse engineering, overloading or disrupting the
          Service, or circumventing access/usage limits.
        </li>
        <li>
          You remain responsible for compliance with applicable law (including
          export control and data protection).
        </li>
      </UL>

      <H2>5. Data and secrets</H2>
      <P>
        Access to connected services is read-only where possible. Detected secrets
        are masked before storage. Processing of personal data is described in the
        Privacy Policy; for processing on your behalf we provide a Data Processing
        Agreement (DPA).
      </P>

      <H2>6. Pricing, payment, renewal</H2>
      <P>
        Paid plans are billed through our payment processor Stripe. Unless stated
        otherwise, prices are exclusive of applicable VAT and are due in advance
        for each billing period. Subscriptions renew automatically for the chosen
        period until cancelled.
      </P>

      <H2>7. Termination</H2>
      <P>
        You may cancel your subscription at any time effective at the end of the
        current billing period. We may suspend or terminate the agreement for
        breaches of these Terms. Statutory consumer withdrawal rights (where
        applicable) are provided separately.
      </P>

      <H2>8. Availability</H2>
      <P>
        We aim for high availability but, absent a separate SLA, do not warrant any
        specific uptime. Maintenance, updates and third-party outages may
        temporarily affect the Service.
      </P>

      <H2>9. Liability</H2>
      <P>
        We are liable without limitation for intent and gross negligence and for
        injury to life, body or health. For simple negligence we are liable only
        for breach of a material contractual obligation and limited to the
        foreseeable damage typical for this type of contract. Otherwise liability
        is excluded. Liability under the German Product Liability Act remains
        unaffected.
      </P>

      <H2>10. Indemnification</H2>
      <P>
        You will indemnify us against third-party claims arising from your unlawful
        use of the Service or your breach of these Terms.
      </P>

      <H2>11. Changes to these Terms</H2>
      <P>
        We may change these Terms with effect for the future and will notify you in
        text form in good time. If you do not object within the stated period, the
        amended Terms are deemed accepted.
      </P>

      <H2>12. Final provisions</H2>
      <P>
        German law applies, excluding the UN Convention on Contracts for the
        International Sale of Goods. Where permitted, the place of jurisdiction is
        the provider's registered seat. If any provision is invalid, the remainder
        of the agreement remains effective.
      </P>
    </>
  )
}
