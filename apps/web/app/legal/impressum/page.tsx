'use client'

import { LegalShell, H2, P, UL } from '@/components/legal/legal-shell'

export default function ImpressumPage() {
  return (
    <LegalShell title="Impressum" updated="[DATUM]">
      <P>Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz, vormals § 5 TMG).</P>

      <H2>Diensteanbieter</H2>
      <P>
        Theo Handschug
        <br />
        Ahornallee 14c
        <br />
        16548 Glienicke/Nordbahn
        <br />
        Deutschland
      </P>

      <H2>Kontakt</H2>
      <P>
        E-Mail: legal@riscly.app
        <br />
        Telefon: +491738152845
      </P>

      <H2>Umsatzsteuer-Identifikationsnummer</H2>
      <P>
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
        DE361468234
      </P>

      <H2>Verantwortlich für den Inhalt</H2>
      <P>
        Verantwortlich i. S. d. § 18 Abs. 2 MStV: Theo Handschug, Anschrift
        wie oben.
      </P>

      <H2>Rechtsform</H2>
      <P>
        Einzelunternehmen
      </P>

      <H2>EU-Streitschlichtung</H2>
      <P>
        Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung (OS) bereit:{' '}
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          https://ec.europa.eu/consumers/odr
        </a>
        . Unsere E-Mail-Adresse finden Sie oben.
      </P>

      <H2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</H2>
      <P>
        Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren
        vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </P>

      <H2>Haftung für Inhalte und Links</H2>
      <P>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf
        diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis
        10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte
        oder gespeicherte fremde Informationen zu überwachen. Für Inhalte externer
        Links sind ausschließlich deren Betreiber verantwortlich; zum Zeitpunkt der
        Verlinkung waren keine Rechtsverstöße erkennbar.
      </P>

      <H2>Urheberrecht</H2>
      <P>
        Die durch den Diensteanbieter erstellten Inhalte und Werke auf diesen
        Seiten unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als
        solche gekennzeichnet.
      </P>
    </LegalShell>
  )
}
