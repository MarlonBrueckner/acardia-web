// src/features/PricingPage.jsx
import React from "react";
import { Navbar } from "../helpers/Navbar";
import { Footer } from "../helpers/Footer";

function FeatureBullet({ children }) {
  return (
    <li className="flex items-start gap-2 text-sm text-neutral-200">
      <span className="mt-[3px] text-xs">✔</span>
      <span>{children}</span>
    </li>
  );
}

function PlanCard({ label, price, period, highlight, tagline, features, cta }) {
  return (
    <section
      className={[
        "rounded-2xl p-6 md:p-7 border shadow-lg flex flex-col h-full",
        highlight ? "border-blue-500/80" : "border-white/10",
      ].join(" ")}
      style={{
        background: "#1f1f1f",
        boxShadow: highlight
          ? "0 0 0 2px rgba(44,96,250,.18), 0 24px 44px rgba(44,96,250,.25)"
          : "0 18px 40px rgba(0,0,0,.55)",
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-lg md:text-xl font-extrabold text-white">
            {label}
          </div>
          <div className="text-xs text-neutral-400 mt-1">{tagline}</div>
        </div>
        {highlight && (
          <span className="px-3 py-1 rounded-full text-[11px] font-semibold text-blue-200 bg-blue-900/50 border border-blue-500/70">
            Most popular
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-black text-white">{price}</span>
        <span className="text-sm text-neutral-400 font-semibold">
          /{period}
        </span>
      </div>

      <ul className="mt-4 space-y-2 flex-1">
        {features.map((f, i) => (
          <FeatureBullet key={i}>{f}</FeatureBullet>
        ))}
      </ul>

      <button
        type="button"
        className="mt-6 w-full rounded-xl font-semibold text-sm py-3"
        style={{
          background: highlight
            ? "linear-gradient(45deg, #e82fa6 0%, #2c60fa 100%)"
            : "rgba(44,96,250,0.16)",
          color: "#fff",
          boxShadow: highlight
            ? "0 0 0 1.5px #e82fa6 inset"
            : "0 0 0 1px rgba(44,96,250,0.4) inset",
        }}
        // Marketing-Seite – hier nur Info, echte Buchung läuft ja in der App / SettingsView
        onClick={() => {
          // Optional: Smooth scroll zur App-Section, Link zu /login etc.
          window.location.href = "/login";
        }}
      >
        {cta}
      </button>
    </section>
  );
}

export function PricingPage() {
  return (
    <div
      className="relative w-full min-h-screen flex flex-col"
      style={{ background: "#181818" }}
    >
      <Navbar />
      {/* Spacer unter der fixed Navbar */}
      <div className="h-[88px]" />

      {/* Hero / Header */}
      <header className="max-w-5xl mx-auto px-4 pt-10 w-full">
        <div
          className="rounded-2xl p-6 md:p-8 border shadow-lg"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-white text-3xl md:text-4xl font-extrabold">
                Pricing & Plans
              </h1>
              <p className="text-neutral-300 mt-3 max-w-xl text-sm md:text-base">
                Start with a lightweight journal or go all-in with full analytics
                and no limits. Weekly subscriptions, cancel any time directly in
                your Apple ID.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-xs text-neutral-300">
              <span>• Weekly auto-renewing subscription</span>
              <span>• Cancel any time via Apple ID settings</span>
              <span>• Prices incl. VAT where applicable</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN – Cards & Feature-Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-10 text-white w-full">
        {/* Plans */}
        <section className="grid gap-6 md:grid-cols-2 mb-10">
          <PlanCard
            label="Advanced"
            price="€1.99"
            period="week"
            highlight={false}
            tagline="Solid tools for active traders."
            features={[
              "Up to 15 trades per week in your journal",
              "Up to 50 notes per week",
              "Winrate calculator",
              "basic overview",
              "All core journaling features",
              "lot size calculator",
            ]}
            cta="Get Advanced in the App"
          />

          <PlanCard
            label="Pro"
            price="€4.99"
            period="week"
            highlight={true}
            tagline="Unlimited journaling, deep analytics & priority support."
            features={[
              "No journal limit",
              "No notes limit",
              "Broker  sync  Mt4, Mt5",
              "All Advanced features included",
              "Full Winrate calculator",
              "Emotion tracking & confluence tagging",
              "Upcoming Pro-only tools and experiments",
              "Priority support for Pro users",
               "lot size calculator",
               
              
            ]}
            cta="Start Pro in the App"
          />
        </section>

      
      </main>

      <Footer />
    </div>
  );
}
