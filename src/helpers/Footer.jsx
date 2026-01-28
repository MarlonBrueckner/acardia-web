// src/helpers/Footer.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaTwitter, FaYoutube, FaInstagram, FaTiktok, FaFacebook } from "react-icons/fa";

export function Footer() {
  const navigate = useNavigate();

   
  return (
    <footer
      className="w-full text-sm text-neutral-300"
      style={{
        background: "#1f1f1f",
        borderTop: "1px solid #313131"
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-5 flex flex-col gap-4">
        {/* obere Zeile: Logo + Link-Gruppen */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 justify-between">
          {/* Brand / Beschreibung */}
          <div className="flex-1 min-w-[180px] flex items-start gap-3">
            <img
              src="/logo.png"
              alt="Acardia Logo"
              className="h-6 mt-1"
            />
            <p className="text-xs md:text-sm text-neutral-400 max-w-xs">
              Acardia Journal – track your trades, understand your behavior, and
              improve your edge with clear, data-driven insights.
            </p>
          </div>

          {/* Features-Column – nur Routen, die es auch im Navbar gibt */}
          <div className="flex flex-wrap gap-6 md:gap-10">
            <div className="flex flex-col gap-1 min-w-[120px]">
              <h4 className="text-[11px] uppercase tracking-[0.16em] text-neutral-400 font-semibold mb-1">
                Features
              </h4>
              <button
                type="button"
                onClick={() => navigate("/features/trade-sync")}
                className="text-xs md:text-sm text-neutral-300 hover:text-white text-left"
              >
                Trade Sync <span className="text-[11px] text-blue-300/80">(WIP)</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/features/emotions")}
                className="text-xs md:text-sm text-neutral-300 hover:text-white text-left"
              >
                Emotion Tracking
              </button>
              <button
                type="button"
                onClick={() => navigate("/features/analytics")}
                className="text-xs md:text-sm text-neutral-300 hover:text-white text-left"
              >
                Analytics
              </button>
            </div>

            {/* Resources */}
            <div className="flex flex-col gap-1 min-w-[120px]">
              <h4 className="text-[11px] uppercase tracking-[0.16em] text-neutral-400 font-semibold mb-1">
                Resources
              </h4>
              <button
                type="button"
                onClick={() => navigate("/help")}
                className="text-xs md:text-sm text-neutral-300 hover:text-white text-left"
              >
                Help Center
              </button>
              <button
                type="button"
                onClick={() => navigate("/privacy")}
                className="text-xs md:text-sm text-neutral-300 hover:text-white text-left"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => navigate("/terms")}
                className="text-xs md:text-sm text-neutral-300 hover:text-white text-left"
              >
                Terms of Use
              </button>
            </div>

            {/* Pricing / Account */}
            <div className="flex flex-col gap-1 min-w-[120px]">
              <h4 className="text-[11px] uppercase tracking-[0.16em] text-neutral-400 font-semibold mb-1">
                Account
              </h4>
              <button
                type="button"
                onClick={() => navigate("/pricing")}
                className="text-xs md:text-sm text-neutral-300 hover:text-white text-left"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-xs md:text-sm text-neutral-300 hover:text-white text-left"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>

        {/* untere Zeile: Copyright + Socials */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
          <span className="text-[11px] text-neutral-500">
            © {new Date().getFullYear()} Acardia Journal. All rights reserved.
          </span>
          <div className="flex items-center gap-3 text-neutral-400">
            <span className="text-[11px] uppercase tracking-[0.18em]">
              Follow
            </span>
            <button className="hover:text-white" aria-label="Twitter">
              <FaTwitter size={16} />
            </button>
            <button className="hover:text-white" aria-label="YouTube">
              <FaYoutube size={16} />
            </button>
            <button className="hover:text-white" aria-label="Instagram">
              <FaInstagram size={16} />
            </button>
            <button className="hover:text-white" aria-label="TikTok">
              <FaTiktok size={16} />
            </button>
            <button className="hover:text-white" aria-label="Facebook">
              <FaFacebook size={16} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
