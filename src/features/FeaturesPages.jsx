// src/features/FeaturesPages.jsx
import React from "react";
import { Navbar } from "../helpers/Navbar";
import { Footer } from "../helpers/Footer";

function Page({ title, subtitle, children, badge }) {
  return (
    <div
      className="relative w-full min-h-screen flex flex-col"
      style={{ background: "#181818" }}
    >
      <Navbar />
      {/* Spacer unter der fixed Navbar */}
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
            <h1 className="text-white text-3xl md:text-4xl font-extrabold flex-1">
              {title}
            </h1>
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

          {subtitle && (
            <p className="text-neutral-300 mt-3 max-w-2xl">{subtitle}</p>
          )}
        </div>
      </header>

      {/* MAIN – flex-1, damit Footer unten bleibt */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-10 text-white w-full">
        {children}
      </main>

      <Footer />
    </div>
  );
}

/* ---------- TRADE SYNC (Work in progress) ---------- */

export function FeatureTradeSyncPage() {
  return (
    <Page
      title="Trade Sync"
      subtitle="Connect your trading platforms and reduce manual input. This feature is currently in development."
      badge="Work in progress"
    >
      <section
        className="rounded-2xl p-6 md:p-7 border mb-6"
        style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Current status
        </h2>
        <p className="text-neutral-200 leading-relaxed">
          Trade Sync is an upcoming feature that will let you pull trades
          directly from platforms like MetaTrader and others into Acardia
          Journal. Right now, you can already journal trades manually or via
          CSV import – the fully automated sync is under active development.
        </p>

        <h3 className="text-lg font-bold mt-6 mb-2">What is planned</h3>
        <ul className="list-disc ml-5 text-neutral-200 leading-relaxed space-y-1">
          <li>Secure connection to supported brokers / platforms.</li>
          <li>
            Automatic mapping of symbols, time zones, and position sizes to your
            Acardia account.
          </li>
          <li>De-duplication so the same trade is never imported twice.</li>
          <li>
            Background sync in short intervals – your journal stays up to date
            without manual effort.
          </li>
        </ul>

        <h3 className="text-lg font-bold mt-6 mb-2">
          What you can already do today
        </h3>
        <ol className="list-decimal ml-5 text-neutral-200 leading-relaxed space-y-1">
          <li>Export your trade history as CSV from your broker / MT4 / MT5.</li>
          <li>
            Import and normalize trades inside Acardia (manual or semi-manual,
            depending on your workflow).
          </li>
          <li>
            Use all existing analytics and emotion tracking on these imported
            trades.
          </li>
        </ol>

        <p className="text-neutral-300 text-sm mt-5">
          If you want early access once Trade Sync goes live, just reach out via
          the Help Center – we’ll prioritize feedback from early users.
        </p>
      </section>
    </Page>
  );
}

/* ---------- EMOTION TRACKING (ausführlicher) ---------- */

export function FeatureEmotionsPage() {
  return (
    <Page
      title="Emotion Tracking"
      subtitle="Capture emotions, context and confluences around each trade – so you can fix behavior, not just entries."
    >
      <section
        className="rounded-2xl p-6 md:p-7 border mb-6"
        style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Why emotions matter more than entries
        </h2>
        <p className="text-neutral-200 leading-relaxed">
          Most traders only track entries, exits and R-multiples. The biggest
          leaks, however, come from behavior: FOMO, revenge trades, shrinking
          targets after a loss, or ignoring your own rules. Emotion Tracking in
          Acardia is built to make these patterns visible instead of “gut
          feeling”.
        </p>

        <h3 className="text-lg font-bold mt-6 mb-2">
          What you can log for every trade
        </h3>
        <ul className="list-disc ml-5 text-neutral-200 leading-relaxed space-y-1">
          <li>
            <span className="font-semibold">Emotion tag:</span> e.g. calm,
            stressed, FOMO, revenge, overconfident, bored.
          </li>
          <li>
            <span className="font-semibold">Context notes:</span> short free
            text describing what happened (e.g. “third trade after two losses”).
          </li>
          <li>
            <span className="font-semibold">Room for improvement:</span> what
            you would do differently next time for this exact pattern.
          </li>
          <li>
            <span className="font-semibold">Confluences:</span> structured tags
            for signals (HTF trend, S/R, news filter, session, etc.).
          </li>
        </ul>

        <h3 className="text-lg font-bold mt-6 mb-2">
          Example workflow after each trade
        </h3>
        <ol className="list-decimal ml-5 text-neutral-200 leading-relaxed space-y-1">
          <li>Journal the trade as usual (entry/exit, R, screenshots, etc.).</li>
          <li>
            Add 1–2{" "}
            <span className="font-semibold">emotion tags</span> that best
            describe how you felt.
          </li>
          <li>
            Write a <span className="font-semibold">one-sentence note</span>:
            “Why did I really take this trade?”
          </li>
          <li>
            If the trade was a clear mistake, write{" "}
            <span className="font-semibold">one improvement rule</span> (e.g.
            “No third trade after two losses in a row”).
          </li>
          <li>
            Tag important <span className="font-semibold">confluences</span> so
            Analytics can match behavior with setups.
          </li>
        </ol>

        <h3 className="text-lg font-bold mt-6 mb-2">
          How Emotion Analytics helps you
        </h3>
        <p className="text-neutral-200 leading-relaxed">
          Once you consistently tag emotions, Acardia can show you:
        </p>
        <ul className="list-disc ml-5 text-neutral-200 leading-relaxed space-y-1">
          <li>Win rate per emotion (e.g. calm vs. stressed vs. revenge).</li>
          <li>
            Loss concentration on specific emotional states or times of day.
          </li>
          <li>
            Which confluences usually <span className="font-semibold">work</span> – and
            which ones are mostly noise.
          </li>
        </ul>

        <p className="text-neutral-300 text-sm mt-5">
          The goal is not to log more, but to log{" "}
          <span className="font-semibold">exactly the few details</span> that
          systematically explain your PnL curve.
        </p>
      </section>
    </Page>
  );
}

/* ---------- ANALYTICS (ausführlicher) ---------- */

export function FeatureAnalyticsPage() {
  return (
    <Page
      title="Analytics"
      subtitle="From simple win rate to deep behavior analysis – all numbers in one place."
    >
      <section
        className="rounded-2xl p-6 md:p-7 border mb-6"
        style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Core performance metrics
        </h2>
        <p className="text-neutral-200 leading-relaxed">
          Analytics in Acardia is designed to answer one question:{" "}
          <span className="font-semibold">
            “Where exactly does my edge come from – and where do I leak money?”
          </span>{" "}
          Instead of a generic dashboard, you get views that are tuned for
          discretionary traders.
        </p>

        <ul className="list-disc ml-5 text-neutral-200 leading-relaxed space-y-1 mt-3">
          <li>
            <span className="font-semibold">Win rate & R-multiple:</span> total
            and broken down by symbol, strategy and session.
          </li>
          <li>
            <span className="font-semibold">Equity-like curves:</span> see how
            your R-result evolves over time, not just absolute PnL.
          </li>
          <li>
            <span className="font-semibold">Distribution charts:</span> histograms of
            R, typical winners/losers, and tail events.
          </li>
        </ul>
      </section>

      <section
        className="rounded-2xl p-6 md:p-7 border mb-6"
        style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          Behavior & rule-based analysis
        </h2>
        <p className="text-neutral-200 leading-relaxed">
          Because Emotion Tracking and Confluences are integrated into the
          journal, Analytics can go beyond standard trade statistics:
        </p>

        <ul className="list-disc ml-5 text-neutral-200 leading-relaxed space-y-1 mt-3">
          <li>
            <span className="font-semibold">Win rate by emotion:</span> see
            exactly what happens when you trade “angry”, “bored”, or “over-sized”.
          </li>
          <li>
            <span className="font-semibold">Mistake clusters:</span> which
            setups and times of day most often violate your own rules.
          </li>
          <li>
            <span className="font-semibold">Confluence quality:</span> which
            confluence combinations actually increase your edge – and which you
            can drop.
          </li>
        </ul>

        <h3 className="text-lg font-bold mt-6 mb-2">Filters & breakdowns</h3>
        <p className="text-neutral-200 leading-relaxed">
          Use filters for date range, account, symbol, session, strategy and
          emotion tags. This allows you to compare:
        </p>
        <ul className="list-disc ml-5 text-neutral-200 leading-relaxed space-y-1 mt-2">
          <li>Morning vs. afternoon vs. evening trading.</li>
          <li>
            Trend-following vs. mean-reversion setups in the same instrument.
          </li>
          <li>Your behavior in “normal” days vs. “big event” days.</li>
        </ul>
      </section>

      <section
        className="rounded-2xl p-6 md:p-7 border"
        style={{ background: "#1f1f1f", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          How to get the most out of it
        </h2>
        <ol className="list-decimal ml-5 text-neutral-200 leading-relaxed space-y-1">
          <li>Log every trade with at least symbol, R-result and basic notes.</li>
          <li>Add emotion tags + 1–2 confluences to each trade.</li>
          <li>
            Once a week, open Analytics and review the last 20–50 trades with a
            focus on patterns, not single outcomes.
          </li>
          <li>
            Based on the charts, define <span className="font-semibold">one</span>{" "}
            concrete rule to add or remove for the next week.
          </li>
        </ol>

        <p className="text-neutral-300 text-sm mt-5">
          Analytics is not about being “perfect” – it’s about improving your
          process in small, measurable steps, week after week.
        </p>
      </section>
    </Page>
  );
}
