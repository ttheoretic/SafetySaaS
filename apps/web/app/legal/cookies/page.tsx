'use client'

import { useState } from 'react'
import { LegalShell, H2, P, UL } from '@/components/legal/legal-shell'

export default function CookiePage() {
  const [lang, setLang] = useState<'de' | 'en'>('de')
  return (
    <LegalShell
      title={lang === 'de' ? 'Cookie-Richtlinie' : 'Cookie Policy'}
      lang={lang}
      onLang={setLang}
      updated="[DATUM]"
    >
      {lang === 'de' ? <De /> : <En />}
    </LegalShell>
  )
}

function De() {
  return (
    <>
      <P>
        Diese Cookie-Richtlinie erklärt, wie Riscly (der „Dienst") Cookies und
        ähnliche Technologien (z. B. Local Storage) einsetzt. Sie ergänzt unsere
        Datenschutzerklärung.
      </P>

      <H2>Was sind Cookies?</H2>
      <P>
        Cookies sind kleine Textdateien, die dein Browser speichert. Local Storage
        funktioniert ähnlich. Beide ermöglichen es, dich über Seitenaufrufe hinweg
        wiederzuerkennen — etwa um dich angemeldet zu halten.
      </P>

      <H2>Welche Kategorien wir nutzen</H2>
      <UL>
        <li>
          <strong>Technisch notwendig:</strong> für Anmeldung, Sitzung und
          Sicherheit. Diese setzen wir auf Grundlage unseres berechtigten
          Interesses bzw. zur Vertragserfüllung — ohne sie funktioniert der Dienst
          nicht.
        </li>
        <li>
          <strong>Funktional (optional):</strong> merken sich Einstellungen wie
          Sprache oder Ansicht.
        </li>
        <li>
          <strong>Analyse (optional):</strong> helfen uns zu verstehen, wie der
          Dienst genutzt wird. Diese setzen wir nur mit deiner Einwilligung.
        </li>
      </UL>

      <H2>Einwilligung und Widerruf</H2>
      <P>
        Nicht notwendige Cookies setzen wir nur mit deiner Einwilligung. Du kannst
        deine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen und
        Cookies in deinen Browser-Einstellungen löschen oder blockieren.
      </P>

      <H2>Drittanbieter</H2>
      <P>
        Eingebundene Dienstleister (siehe Datenschutzerklärung) können eigene
        Cookies setzen, soweit dies für den Betrieb erforderlich oder von dir
        eingewilligt ist.
      </P>
    </>
  )
}

function En() {
  return (
    <>
      <P>
        This Cookie Policy explains how Riscly (the “Service”) uses cookies and
        similar technologies (e.g. local storage). It supplements our Privacy
        Policy.
      </P>

      <H2>What are cookies?</H2>
      <P>
        Cookies are small text files stored by your browser. Local storage works
        similarly. Both let us recognize you across page loads — for example, to
        keep you signed in.
      </P>

      <H2>Categories we use</H2>
      <UL>
        <li>
          <strong>Strictly necessary:</strong> for sign-in, sessions and security.
          Set on the basis of our legitimate interest / contract performance — the
          Service does not work without them.
        </li>
        <li>
          <strong>Functional (optional):</strong> remember preferences such as
          language or layout.
        </li>
        <li>
          <strong>Analytics (optional):</strong> help us understand how the Service
          is used. Set only with your consent.
        </li>
      </UL>

      <H2>Consent and withdrawal</H2>
      <P>
        Non-essential cookies are set only with your consent. You can withdraw
        consent at any time with effect for the future and delete or block cookies
        in your browser settings.
      </P>

      <H2>Third parties</H2>
      <P>
        Integrated providers (see the Privacy Policy) may set their own cookies
        where necessary for operation or where you have consented.
      </P>
    </>
  )
}
