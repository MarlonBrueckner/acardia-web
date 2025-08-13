import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NAV_LINKS = [
  {
    label: "Features",
    dropdown: [
      { head: "Trade Sync", desc: "Sync trades automatically from MetaTrader and others." },
      { head: "Emotion Tracking", desc: "Log emotions & context on every trade." },
      { head: "Analytics", desc: "Full win rate, pattern & error analysis." },
    ],
  },
  {
    label: "Pricing",
    to: "#pricing",
  },
  {
    label: "Resources",
    dropdown: [
      { head: "Help Center", desc: "Find answers and tips for Acardia Journal." },
      { head: "Integrations", desc: "Connect with brokers and platforms." },
      { head: "Community", desc: "Share ideas and feedback with traders." },
    ],
  },
];
