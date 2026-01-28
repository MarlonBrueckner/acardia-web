import React from "react";
import { Navbar } from "../helpers/Navbar";
import { Footer } from "../helpers/Footer";

function Page({ title, subtitle, children, badge }) {
  return (
    <div className="relative w-full min-h-screen flex flex-col" style={{ background: "#181818" }}>
      <Navbar />
      <div className="h-[88px]" />

      <header className="max-w-5xl mx-auto px-4 pt-10 w-full">
        <div
          className="rounded-2xl p-6 md:p-8 border shadow-lg"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <h1 className="text-white text-3xl md:text-4xl font-extrabold flex-1">{title}</h1>
            {badge && (
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(44,96,250,0.16)",
                  color: "#e5e9ff",
                  border: "1px solid rgba(44,96,250,0.6)",
                }}
              >
                {badge}
              </span>
            )}
          </div>

          {subtitle && <p className="text-neutral-300 mt-3 max-w-2xl">{subtitle}</p>}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-10 text-white w-full">{children}</main>

      <Footer />
    </div>
  );
}

export function ImpressumPage() {
  return (
    <Page
      title="Impressum"
      subtitle="Angaben gemäß § 5 TMG und Verantwortlicher gemäß § 18 MStV."
      badge="Legal"
    >
      {/* Anbieter / Kontakt */}
      <section
        className="rounded-2xl p-6 md:p-7 border mb-6"
        style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-3">Anbieter</h2>

        <div className="text-neutral-200 leading-relaxed space-y-2">
          <p className="font-semibold">Laurent Brückner</p>
          <p>
            Herbststraße 12<br />
            83080 Oberaudorf<br />
            Deutschland
          </p>

          <p>
            <span className="text-neutral-300">E-Mail:</span>{" "}
            <a className="text-blue-300 hover:underline" href="mailto:acardiajournal@gmail.com">
              acardiajournal@gmail.com
            </a>
          </p>

          <p>
            <span className="text-neutral-300">Telefon:</span>{" "}
            <a className="text-blue-300 hover:underline" href="tel:+4915772543520">
              +49 1577 2543520
            </a>
          </p>
        </div>
      </section>

      {/* Verantwortlicher gemäß MStV */}
      <section
        className="rounded-2xl p-6 md:p-7 border mb-6"
        style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-3">Verantwortlich für den Inhalt</h2>
        <p className="text-neutral-200 leading-relaxed">
          Verantwortlich gemäß § 18 Abs. 2 MStV:
          <br />
          Laurent Brückner, Herbststraße 12, 83080 Oberaudorf, Deutschland
        </p>
      </section>

      {/* Haftungsausschluss */}
      <section
        className="rounded-2xl p-6 md:p-7 border mb-6"
        style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-3">Haftungsausschluss</h2>

        <h3 className="text-lg font-bold mt-2 mb-2">Haftung für Inhalte</h3>
        <p className="text-neutral-200 leading-relaxed">
          Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
          Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
        </p>

        <h3 className="text-lg font-bold mt-6 mb-2">Haftung für Links</h3>
        <p className="text-neutral-200 leading-relaxed">
          Diese Website enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
          Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich.
        </p>
      </section>

      {/* Urheberrecht */}
      <section
        className="rounded-2xl p-6 md:p-7 border"
        style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-3">Urheberrecht</h2>
        <p className="text-neutral-200 leading-relaxed">
          Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
          dem deutschen Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
          Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung
          des jeweiligen Autors bzw. Erstellers.
        </p>

        <p className="text-neutral-300 text-sm mt-5">
          Falls du der Ansicht bist, dass Inhalte auf dieser Website Rechte verletzen, melde dich
          bitte unter der oben angegebenen E-Mail-Adresse – wir prüfen das umgehend.
        </p>
      </section>
    </Page>
  );
}
