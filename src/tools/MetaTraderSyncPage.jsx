import React, { useEffect, useMemo, useState } from "react";

import mt4Logo from "../assets/mt4.png";
import mt5Logo from "../assets/mt5.png";

// Firebase (modular v9+)
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";


/** =========================
 *  THEME: wie in deinem Beispiel
 *  ========================= */
function getDomDark() {
  const de = document.documentElement;
  const attr = de.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  if (document.body.classList.contains("dark")) return true;
  const ls = localStorage.getItem("darkMode");
  if (ls === "true") return true;
  if (ls === "false") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

// nimmt png/jpg/jpeg/webp/svg – case-insensitiv
const brokerLogos = require.context(
  "../assets/broker-logos",
  false,
  /\.(png|jpe?g|webp|svg)$/i
);




function sanitizeLogoName(id) {
  return String(id || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
} 
function brokerLogoSrc(brokerId) {
  // Datei-Name: <sanitized>.png
  const key = `./${sanitizeLogoName(brokerId)}.png`;
  try {
    return brokerLogos(key);
  } catch {
    return null;
  }
}


function useGlobalDark() {
  const [dark, setDark] = useState(getDomDark);

  useEffect(() => {
    const mo = new MutationObserver(() => setDark(getDomDark()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    const onStorage = (e) => { if (e.key === "darkMode") setDark(getDomDark()); };
    window.addEventListener("storage", onStorage);

    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onMql = () => setDark(getDomDark());
    mql?.addEventListener?.("change", onMql);

    return () => {
      mo.disconnect();
      window.removeEventListener("storage", onStorage);
      mql?.removeEventListener?.("change", onMql);
    };
  }, []);

  return dark;
}

const theme = (dark = false) => ({
  dark,
  bg: dark ? "#1f1f1f" : "#f6f8fc",
  card: dark ? "#181818" : "#ffffff",
  text: dark ? "#ffffff" : "#121316",
  sub: dark ? "#BFC4CF" : "#495060",
  border: dark ? "#2a2a2f" : "#e3e7ef",
  accent: "#2c60fa",
  good: "#1cbf73",
  bad: "#ee4e4e",
  // zusätzliche Nuancen
  panel: dark ? "#1b1b1b" : "#ffffff",
  field: dark ? "#141416" : "#fbfcff",
  glow: dark ? "rgba(44,96,250,0.18)" : "rgba(44,96,250,0.12)",
  shadow: dark ? "0 18px 50px rgba(0,0,0,0.45)" : "0 18px 50px rgba(20,30,60,0.10)",
});

/** =========================
 *  Firebase init
 *  ========================= */
const firebaseConfig = {
  // TODO: DEINE Config oder importiere aus deinem firebase.js
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};

function ensureFirebase() {
  if (!getApps().length) initializeApp(firebaseConfig);
  const auth = getAuth();
  const db = getFirestore();
  return { auth, db };
}

/** =========================
 *  Flow steps
 *  ========================= */
const Step = {
  VERSION: "version",
  BROKER: "broker",
  CREDENTIALS: "credentials",
  COMPLETED: "completed",
};


/** =========================
 *  Fallback Brokers (kurz halten)
 *  ========================= */
const FALLBACK_BROKERS = [
 
      {id: "IG Markets Limited", version: "MetaTrader 4 & 5", name: "IG", logoURL: "IG", servers: ["IG_LIVE"]},

      {id: "Meta Quotes", version: "MetaTrader 4 & 5", name: "Meta Quotes", logoURL: "Meta Quotes", servers: ["MetaQuotes-Demo"]},

       {id: "ftmo", version: "MetaTrader 4 & 5", name: "FTMO", logoURL: "FTMO",

             servers: ["FTMO-Demo","FTMO-Demo2","FTMO-Server","FTMO-Server2","FTMO-Server3","FTMO-Server4","FTMO-Server5","FTMO-Demo2"]},




      

      {id: "CMC Markets Plc", version: "MetaTrader 4 & 5", name: "CMC Markets", logoURL: "CMC Markets", servers: ["CMCMarkets1-Canada","CMCMarkets1-Demo","CMCMarkets1-Europe","CMCMarkets1-Global","CMCMarkets1-Live","CMCMarkets1-Singapore","CMCMarkets1-SpreadBet","CMCMarkets-MT5-DEMO","CMCMarkets-MT5-Live"]},

      {id: "oanda", version: "MetaTrader 4 & 5", name: "Oanda", logoURL: "Oanda", servers: ["OANDA-Demo-1","OANDA-Demo-2","OANDA-Japan FX Live","OANDA-v20 Live-1","OANDA-v20 Live-2","OANDA-v20 Live-3","OANDA-v20 Live-4","OANDA-v20 Live-5","OANDA {Canada} Corporation ULC"]},

      {id: "xtb", version: "MetaTrader 4 & 5", name: "XTB", logoURL: "XTB", servers: [ "XTB-MT4 Demo",

                                                                                             "XTB-Real3",

                                                                                             "XTB-Real4"]},



      {id: "fxcm", version: "MetaTrader 4 & 5", name: "FXCM", logoURL: "FXCM", servers: [ "FXCM-AUDDemo01", "FXCM-AUDReal01",

                                                                                                "FXCM-CADReal01",

                                                                                                "FXCM-EURDemo01", "FXCM-EURReal01", "FXCM-EURReal02",

                                                                                                "FXCM-GBPDemo01", "FXCM-GBPReal01",

                                                                                                "FXCM-MT4MC01",

                                                                                                "FXCM-USDDemo01", "FXCM-USDDemo02",

                                                                                                "FXCM-USDReal01", "FXCM-USDReal02", "FXCM-USDReal03",

                                                                                                "FXCM-USDReal04", "FXCM-USDReal05", "FXCM-USDReal07",

                                                                                                "FXCM-USDReal08", "FXCM-USDReal09"]},

      {id: "tickmill", version: "MetaTrader 4 & 5", name: "Tickmill", logoURL: "Tickmill", servers: [ "TickmillEU-Demo", "TickmillEU-Live",

                                                                                                            "Tickmill-Demo", "Tickmill-DemoUK",

                                                                                                            "Tickmill-Live", "Tickmill-Live02", "Tickmill-Live04",

                                                                                                            "Tickmill-Live05", "Tickmill-Live06",

                                                                                                            "Tickmill-Live08", "Tickmill-Live09", "Tickmill-Live10",

                                                                                                            "TickmillUK-Live03"]},

      {id: "pepperstone", version: "MetaTrader 4 & 5", name: "Pepperstone", logoURL: "PepperStone", servers: [ "Pepperstone-Demo01", "Pepperstone-Demo02",

                                                                                                                     "Pepperstone-Edge01", "Pepperstone-Edge02", "Pepperstone-Edge03",

                                                                                                                     "Pepperstone-Edge04", "Pepperstone-Edge05", "Pepperstone-Edge06",

                                                                                                                     "Pepperstone-Edge07", "Pepperstone-Edge08", "Pepperstone-Edge09",

                                                                                                                     "Pepperstone-Edge11", "Pepperstone-Edge12", "Pepperstone-Edge14",

                                                                                                                     "PepperstoneUK-Demo03", "PepperstoneUK-Edge10",

                                                                                                                     "Pepperstone-MT5-Live01", "Pepperstone-Demo",

                                                                                                                     "PepperstoneUK-Live", "PepperstoneUK-Demo"]},

     
      {id: "admiralmarkets", version: "MetaTrader 4 & 5", name: "Admiral Markets", logoURL: "Admiral Markets", servers: ["AdmiralsGroup-Demo",

                                                                                                                               "AdmiralsGroup-Live",

                                                                                                                               "AdmiralsGroup-Live2",

                                                                                                                               "AdmiralsGroup-Live3",

                                                                                                                               "AdmiralsSC-Demo-1",

                                                                                                                               "AdmiralsSC-Live-1"]},

      {id: "exness", version: "MetaTrader 4 & 5", name: "Exness", logoURL: "Exness", servers: ["ExnessKE-Real12",

                                                                                                     "ExnessKE-Real20",

                                                                                                     "ExnessKE-Real21",

                                                                                                     "ExnessKE-Real22",

                                                                                                     "ExnessKE-Real23",

                                                                                                     "ExnessKE-Trial10",

                                                                                                     "ExnessKE-Trial11",

                                                                                                     "ExnessKE-Trial6",

                                                                                                     "ExnessSC-Trial",

                                                                                                     "ExnessUK-Real10",

                                                                                                     "ExnessVG-Real",

                                                                                                     "ExnessVG-Real11",

                                                                                                     "ExnessVG-Real12",

                                                                                                     "ExnessVG-Real14",

                                                                                                     "ExnessVG-Real15",

                                                                                                     "ExnessVG-Real16",

                                                                                                     "ExnessVG-Real17",

                                                                                                     "ExnessVG-Real18",

                                                                                                     "ExnessVG-Real19",

                                                                                                     "ExnessVG-Real2",

                                                                                                     "ExnessVG-Real20",

                                                                                                     "ExnessVG-Real21",

                                                                                                     "ExnessVG-Real22",

                                                                                                     "ExnessVG-Real23",

                                                                                                     "ExnessVG-Real3",

                                                                                                     "ExnessVG-Real4",

                                                                                                     "ExnessVG-Real6",

                                                                                                     "ExnessVG-Real7",

                                                                                                     "ExnessVG-Real8",

                                                                                                     "ExnessVG-Real9",

                                                                                                     "ExnessVG-Trial",

                                                                                                     "ExnessVG-Trial10",

                                                                                                     "ExnessVG-Trial11",

                                                                                                     "ExnessVG-Trial2",

                                                                                                     "ExnessVG-Trial4",

                                                                                                     "ExnessVG-Trial5",

                                                                                                     "ExnessVG-Trial6",

                                                                                                     "ExnessVG-Trial7",

                                                                                                     "ExnessVG-Trial8",

                                                                                                     "ExnessVG-Trial9",

                                                                                                     "ExnessBV-Real",

                                                                                                     "ExnessBV-Real11",

                                                                                                     "ExnessBV-Real12",

                                                                                                     "ExnessBV-Real2",

                                                                                                     "ExnessBV-Real3",

                                                                                                     "ExnessBV-Real4",

                                                                                                     "ExnessBV-Real6",

                                                                                                     "ExnessBV-Real7",

                                                                                                     "ExnessBV-Real8",

                                                                                                     "ExnessBV-Real9",

                                                                                                     "ExnessBV-Trial",

                                                                                                     "ExnessBV-Trial2",

                                                                                                     "ExnessBV-Trial4",

                                                                                                     "ExnessBV-Trial5",

                                                                                                     "ExnessBV-Trial6",

                                                                                                     "ExnessInvestmentBank-Live",

                                                                                                     "ExnessJO-Real3",

                                                                                                     "ExnessJO-Trial4"]},

      {id: "forex.com", version: "MetaTrader 4 & 5", name: "Forex.com", logoURL: "Forex.com", servers: [    "FOREX.comCA-Demo 129",

                                                                                                                  "FOREX.comCA-Live 130",

                                                                                                                  "Forex.comUK-Demo 106",

                                                                                                                  "Forex.comUK-Live 112",

                                                                                                                  "Forex.comUK-Live 114",

                                                                                                                  "FOREX.comGlobalCN-Demo",

                                                                                                                  "FOREX.comGlobalCN-Live",

                                                                                                                  "FOREX.comGlobalCN-Live 1",

                                                                                                                  "FOREX.comGlobalCN-Live 2",

                                                                                                                  "FOREX.comGlobalCN-Live 3",

                                                                                                                  "FOREX.comGlobalCN-Live 4",

                                                                                                                  "FOREX.comGlobal-Demo",

                                                                                                                  "FOREX.comGlobal-Live 112",

                                                                                                                  "FOREX.comGlobal-Live 114",

                                                                                                                  "FOREX.comGlobal-Live 117",

                                                                                                                  "Forex.com-Demo 106",

                                                                                                                  "Forex.com-Demo 108",

                                                                                                                  "Forex.com-Live 103",

                                                                                                                  "Forex.com-Live 120",

                                                                                                                  "Forex.com-Live 121",

                                                                                                                  "Forex.com-Live 122",

                                                                                                                  "Forex.com-Live 123",

                                                                                                                  "Forex.com-Live 124",

                                                                                                                  "Forex.com-Live 125",

                                                                                                                  "Forex.comJP-Demo 104",

                                                                                                                  "Forex.comJP-Live 105",

                                                                                                                  "Forex.comJP-Live 109",

                                                                                                                  "Forex.comJP-Live 110",

                                                                                                                  "Forex.comUKLtd-Demo 108",

                                                                                                                  "Forex.comUKLtd-Live 111",

                                                                                                                  "Forex.comUKLtd-Live 113",

                                                                                                                  "Forex.comUKLtd-Live 115",

                                                                                                                  "Forex.comUKLtd-Live 116",

                                                                                                                  "Forex.comSG-Demo 106",

                                                                                                                  "Forex.comSG-Live 107",

                                                                                                                  "FOREX.comEurope-Live 532",

                                                                                                                  "FOREX.comEurope-Demo 531",

                                                                                                                  "Forex.com-Demo 531",

                                                                                                                  "Forex.com-Demo 535",

                                                                                                                  "Forex.com-Live 536",

                                                                                                                  "FOREX.comGlobal-Demo 531",

                                                                                                                  "FOREX.comGlobal-Live 532",

                                                                                                                  "FOREX.comGlobalCN-Demo 533",

                                                                                                                  "FOREX.comGlobalCN-Live 534"]},

      {id: "forextime", version: "MetaTrader 4 & 5", name: "Forex Time", logoURL: "Forex Time", servers: [ "ForexTime-Cent", "ForexTime-Cent-demo", "ForexTime-Cent2",

                                                                                                                 "ForexTime-ECN", "ForexTime-ECN-demo", "ForexTime-ECN-Zero", "ForexTime-ECN-Zero-demo", "ForexTime-ECN2",

                                                                                                                 "ForexTime-Standard", "ForexTime-Standard-demo",

                                                                                                                 "ForexTimeFXTM-Cent", "ForexTimeFXTM-Cent-demo", "ForexTimeFXTM-Cent2",

                                                                                                                 "ForexTimeFXTM-ECN", "ForexTimeFXTM-ECN-demo", "ForexTimeFXTM-ECN-Zero", "ForexTimeFXTM-ECN-Zero-demo", "ForexTimeFXTM-ECN2",

                                                                                                                 "ForexTimeFXTM-Standard", "ForexTimeFXTM-Standard-demo"]},

      {id: "dukascopy", version: "MetaTrader 4 & 5", name: "Dukascopy", logoURL: "Dukascopy", servers: [    "Dukascopy-demo-1", "Dukascopy-live-1",

                                                                                                                  "Dukascopy-demo-mt5-1", "Dukascopy-live-mt5-1"]},

      {id: "roboforex", version: "MetaTrader 4 & 5", name: "RoboForex", logoURL: "RoboForex", servers: ["RoboForex-Demo", "RoboForex-DemoPro",

                                                                                                              "RoboForex-ECN", "RoboForex-ECN-2", "RoboForex-ECN-3",

                                                                                                              "RoboForex-Prime",

                                                                                                              "RoboForex-Pro", "RoboForex-Pro-2", "RoboForex-Pro-3", "RoboForex-Pro-4", "RoboForex-Pro-5", "RoboForex-Pro-6",

                                                                                                              "RoboForex-ProCent", "RoboForex-ProCent-2", "RoboForex-ProCent-3", "RoboForex-ProCent-4", "RoboForex-ProCent-5", "RoboForex-ProCent-6", "RoboForex-ProCent-7", "RoboForex-ProCent-8",

                                                                                                              "RoboMarkets-Pro", "RoboMarkets-ECN"]},

      {id: "activtrades", version: "MetaTrader 4 & 5", name: "ActivTrades", logoURL: "ActivTrades", servers: [   "ActivTradesEU-1", "ActivTradesEU-2", "ActivTradesEU-3", "ActivTradesEU-4", "ActivTradesEU-5", "ActivTradesEU-Demo",

                                                                                                                       "ActivTradesCorp-5", "ActivTradesCorp-Server",

                                                                                                                       "ActivTradesMarkets-5", "ActivTradesMarkets-Demo", "ActivTradesMarkets-Server",

                                                                                                                       "Activtrades-1", "Activtrades-2", "Activtrades-3", "Activtrades-4", "Activtrades-5", "Activtrades-Demo",

                                                                                                                       "ActivTrades-Server"]},

      {id: "fpmarkets", version: "MetaTrader 4 & 5", name: "FP Markets", logoURL:

              "FP Markets", servers: ["FPMarketsLLC-Live", "FPMarketsLLC-Live3", "FPMarketsLLC-Demo", "FPMarketsLLC-Live4", "FPMarketsLLC-Live2", "FPMarketsKE-Live", "FPMarketsKE-Demo"]},

      {id: "avatrade", version: "MetaTrader 4 & 5", name: "Ava Trade", logoURL: "Ava Trade", servers: ["Ava-Demo", "Ava-Real 1", "Ava-Real 2", "Ava-Real 3", "Ava-Real 4", "Ava-Real 5", "Ava-Real 6", "Ava-Demo 1-MT5", "Ava-Real 1-MT5"]},

      {id: "hfmarkets", version: "MetaTrader 4 & 5", name: "HF Markets", logoURL: "HF Markets", servers: ["HFMarketsSV-Live Server 9", "HFMarketsSV-Live Server 5", "HFMarketsSV-Live Server", "HFMarketsSV-Demo Server", "HFMarketsSC-Live Server 6", "HFMarketsSC-Live Server 7", "HFMarketsSC-Live Server", "HFMarketsSC-Live Server 4", "HFMarketsSC-Live Server 3", "HFMarketsSC-Live Server 9", "HFMarketsSC-Live Server 5", "HFMarketsSC-Demo Server", "HFMarketsUK-Live Server2", "HFMarketsUK-Demo Server", "HFMarkets-Demo Server", "HFMarketsSA-Live Server 6", "HFMarketsSA-Live Server 7", "HFMarketsSA1-Live Server", "HFMarketsSA-Live Server", "HFMarketsSA-Live Server 4", "HFMarketsSA-Live Server 3", "HFMarketsSA-Live Server 9", "HFMarketsSA-Live Server 5", "HFMarketsSA-Demo Server", "HFMarketsSA1-Demo Server", "HFMarketsKE-Live2", "HFMarketsKE-Demo2", "HFMarketsMENA-Live2", "HFMarketsMENA-Demo2", "HFMarketsEurope-Live2", "HFMarketsEurope-Demo2","HFMarketsKM-Live1", "HFMarketsKM-Demo",

                                                                                                                "HFMarketsGlobal-Live3", "HFMarketsGlobal-Live1", "HFMarketsGlobal-Demo3", "HFMarketsGlobal-Demo", "HFMarketsGlobal-Live4",

                                                                                                                "HFMarketsUK-Demo2", "HFMarketsUK-Live2",

                                                                                                                "HFMarketsSA1-Demo2", "HFMarketsSA-Live4", "HFMarketsSA-Demo", "HFMarketsSA1-Live2", "HFMarketsSA-Live1",

                                                                                                                "HFMarketsEU-Demo", "HFMarketsEU-Live",

                                                                                                                "HFMarketsSV-Live Server1", "HFMarketsSV-Live Server2", "HFMarketsSV-Demo Server",

                                                                                                                "HFMarketsSC-Live Server1", "HFMarketsSC-Demo Server"



]},

      {id: "eightcap", version: "MetaTrader 4 & 5", name: "Eightcap", logoURL: "Eightcap", servers: ["EightcapLtd-Demo05", "EightcapLtd-Demo2", "EightcapLtd-Demo3", "EightcapLtd-Real-3", "EightcapLtd-Real-4", "EightcapLtd-Real2",

                                                                                                           "Eightcap-Demo", "Eightcap-Demo04", "Eightcap-Real", "Eightcap-Real-5", "EightcapEU-Live", "EightcapGlobal-Live", "Eightcap-Live",]},

      {id: "thinkmarkets", version: "", name: "ThinkMarkets", logoURL: "ThinkMarkets", servers: ["ThinkMarkets-Demo", "ThinkMarkets-Live", "ThinkMarkets-Live 2", "ThinkMarkets-Live 3", "ThinkMarkets-Live 4",]},

      {id: "gomarkets", version: "MetaTrader 4 & 5", name: "Go Markets", logoURL: "Go Markets", servers: ["GOMarketsIntl-Demo", "GOMarketsIntl-Real 8", "GOMarketsIntl-Real 9", "GOMarketsSVG-Demo", "GOMarketsSVG-Real 3", "GOMarketsLtd-Demo", "GOMarketsLtd-Live",

                                                                                                                "GOMarketsMU-Demo", "GOMarketsMU-Real 1", "GOMarketsMU-Real 10", "GOMarketsMU-Real 2", "GOMarkets-Demo", "GOMarkets-Real 1", "GOMarkets-Real 10", "GOMarkets-Real 2",

                                                                                                                "GOMarketsIntl-Live", "GOMarketsSVG-Live", "GOMarketsMU-Live","GoMarkets-Live", "GoMarkets-Demo"

]},

      {id: "darwinex", version: "MetaTrader 4 & 5", name: "Darwinex", logoURL: "Darwinex", servers: [ "Darwinex-Demo", "Darwinex-Live", "Darwinex-Live-2"]},

      

      {id: "adssecurities", version: "MetaTrader 4 & 5", name: "ADS Securities", logoURL: "ADS Securities", servers: [ "ADSSecurities-Demo2", "ADSSecurities-Live2"]},

      {id: "bdswiss", version: "MetaTrader 4 & 5", name: "BD Swiss", logoURL: "BD Swiss", servers: [  "BDSwissSC-Demo01", "BDSwissSC-Real01", "BDSwissSC-Real03", "BDSwissSC-Real04", "BDSwissSC-Real05",

                                                                                                            "BDSwissGlobal-Demo01", "BDSwissGlobal-Real01", "BDSwissGlobal-Real03", "BDSwissGlobal-Real04", "BDSwissGlobal-Real05",

                                                                                                            "BDSwissGlobal-Server01", "BDSwissSC-Server01"]},

     

      {id: "fxopen", version: "MetaTrader 4 & 5", name: "FXOpen", logoURL: "FX Open", servers: [ "FXOpenAU-ECN Demo Server",

                                                                                                       "FXOpenAU-ECN Live Server",

                                                                                                       "FXOpen-ECN Demo Server",

                                                                                                       "FXOpen-ECN Live Server",

                                                                                                       "FXOpenUK-ECN Demo Server",

                                                                                                       "FXOpenUK-ECN Live Server",

                                                                                                       "FXOpen-MT5"]},



      {id: "fbs", version: "MetaTrader 4 & 5", name: "FBS", logoURL: "FBS", servers: ["FBS-Demo",

                                                                                            "FBS-Real",

                                                                                            "FBSTradestone-Demo",

                                                                                            "FBSTradestone-Real",

                                                                                            "FBSOceania-Demo",

                                                                                            "FBSOceania-Real",

                                                                                            "FBSTradingSeychelles-Demo",

                                                                                            "FBSTradingSeychelles-Real",

                                                                                            "FBS-Real-1",

                                                                                            "FBS-Real-2",

                                                                                            "FBS-Real-3",

                                                                                            "FBS-Real-4",

                                                                                            "FBS-Real-5",

                                                                                            "FBS-Real-6",

                                                                                            "FBS-Real-7",

                                                                                            "FBS-Real-8",

                                                                                            "FBS-Real-9",

                                                                                            "FBS-Real-10",

                                                                                            "FBS-Real-11",

                                                                                            "FBS-Real-12",

                                                                                            "FBS-Real-13"]},

      {id: "instaforex", version: "MetaTrader 4 & 5", name: "Insta Forex", logoURL: "Insta Forex", servers: ["InstaFinance-1Contest.com",

                                                                                                                   "InstaFinance-1Demo.com",

                                                                                                                   "InstaFinance-Cent.com",

                                                                                                                   "InstaFinance-Cent2.com",

                                                                                                                   "InstaFinance-Europe.com",

                                                                                                                   "InstaFinance-HongKong.com",

                                                                                                                   "InstaFinance-Singapore.com",

                                                                                                                   "InstaFinance-UK.com",

                                                                                                                   "InstaFinance-USA.com",

                                                                                                                   "InstaFinance-USA2.com",

                                                                                                                   "InstaForex-Server"]},

      

      

      {id: "axi", version: "MetaTrader 4 & 5", name: "Axi", logoURL: "Axi", servers: [  "Axi-US02-Live",

                                                                                              "Axi-US03-Demo",

                                                                                              "Axi-US03-Live",

                                                                                              "Axi-US05-Live",

                                                                                              "Axi-US06-Live",

                                                                                              "Axi-US07-Live",

                                                                                              "Axi-US09-Live",

                                                                                              "Axi-US10-Live",

                                                                                              "Axi-US12-Live",

                                                                                              "Axi-US15-Live",

                                                                                              "Axi-US16-Live",

                                                                                              "Axi-US17-Live",

                                                                                              "Axi-US18-Live",

                                                                                              "Axi-US888-Demo",

                                                                                              "Axi-US888-Live",

                                                                                              "Axi-US50-Demo",

                                                                                              "Axi-US50-Live",

                                                                                              "Axi-US51-Live",

                                                                                              "Axi.SVG-US02-Live",

                                                                                              "Axi.SVG-US03-Demo",

                                                                                              "Axi.SVG-US03-Live",

                                                                                              "Axi.SVG-US05-Live",

                                                                                              "Axi.SVG-US06-Live",

                                                                                              "Axi.SVG-US07-Live",

                                                                                              "Axi.SVG-US09-Live",

                                                                                              "Axi.SVG-US10-Live",

                                                                                              "Axi.SVG-US15-Live",

                                                                                              "Axi.SVG-US16-Live",

                                                                                              "Axi.SVG-US17-Live",

                                                                                              "Axi.SVG-US18-Live",

                                                                                              "Axi.SVG-US888-Demo",

                                                                                              "Axi.SVG-US888-Live"]},

      {id: "axiory", version: "MetaTrader 4 & 5", name: "Axiory", logoURL: "Axiory", servers: [ "AxioryAsia-01Demo",

                                                                                                      "AxioryAsia-01Live",

                                                                                                      "AxioryAsia-02Demo",

                                                                                                      "AxioryAsia-02Live",

                                                                                                      "AxioryAsia-03Live",

                                                                                                      "AxioryAsia-04Live",

                                                                                                      "AxioryAsia-05Live",

                                                                                                      "AxioryAsia-06Live",

                                                                                                      "AxioryTradit-01Demo",

                                                                                                      "AxioryTradit-01Live",

                                                                                                      "AxioryTradit-02Demo",

                                                                                                      "AxioryTradit-02Live",

                                                                                                      "AxioryTradit-03Live",

                                                                                                      "AxioryTradit-04Live",

                                                                                                      "AxioryTradit-05Live",

                                                                                                      "AxioryTradit-06Live",

                                                                                                      "Axiory-Live",

                                                                                                      "Axiory-Demo"]},

      {id: "swissquote", version: "MetaTrader 4 & 5", name: "Swissquote", logoURL: "Swissquote",   servers: ["SwissquoteLtd-Server"]

},

  

      {id: "cityindex", version: "MetaTrader 4 & 5", name: "City Index", logoURL: "City Index", servers: ["CityIndexUK-Demo 106",

                                                                                                                "CityIndexUK-Live 102",

                                                                                                                "CityIndexAU-Live 101"]},

      {id: "marketscom", version: "MetaTrader 4 & 5", name: "Markets.com", logoURL: "Markets.com", servers: [ "Markets.com-Demo",

                                                                                                                    "Markets.com-Live",

                                                                                                                    "Markets.com-Practice",

                                                                                                                    "Markets.com2-MarketsX"]},

      {id: "capitalcom", version: "MetaTrader 4 & 5", name: "Capital.com", logoURL: "Capital.com", servers: [  "Capital.com-Real",

                                                                                                                     "Capital.com-Demo"]},

     

      {id: "globalprime", version: "MetaTrader 4 & 5", name: "Global Prime", logoURL: "Global Prime", servers: [  "GlobalPrime-Demo",

                                                                                                                        "GlobalPrime-Trade",

                                                                                                                        "GlobalPrime-Live"]},

      

      {id: "robomarkets", version: "MetaTrader 4 & 5", name: "RoboMarkets", logoURL: "RoboMarkets", servers: ["RoboMarkets-ECN",

                                                                                                                    "RoboMarkets-ECN-2",

                                                                                                                    "RoboMarkets-ECN-3",

                                                                                                                    "RoboMarkets-Prime",

                                                                                                                    "RoboMarkets-Pro",

                                                                                                                    "RoboMarkets-Pro-2",

                                                                                                                    "RoboMarkets-Pro-3",

                                                                                                                    "RoboMarkets-Pro-4",

                                                                                                                    "RoboMarkets-Pro-5",

                                                                                                                    "RoboMarkets-Pro-6",

                                                                                                                    "RoboMarkets-ProCent",

                                                                                                                    "RoboMarkets-ProCent-2",

                                                                                                                    "RoboMarkets-ProCent-3",

                                                                                                                    "RoboMarkets-ProCent-4",

                                                                                                                    "RoboMarkets-ProCent-5",

                                                                                                                    "RoboMarkets-ProCent-6",

                                                                                                                    "RoboMarkets-ProCent-7",

                                                                                                                    "RoboMarkets-ProCent-8",

                                                                                                                    "RoboMarkets-Demo",

                                                                                                                    "RoboMarkets-DemoPro",

                                                                                                                    "RoboMarketsSC-Prime",

                                                                                                                    "RoboMarketsSC-Pro",

                                                                                                                    "RoboMarketsSC-Pro-2",

                                                                                                                    "RoboMarketsSC-Pro-3",

                                                                                                                    "RoboMarketsSC-Pro-4",

                                                                                                                    "RoboMarketsSC-Pro-5",

                                                                                                                    "RoboMarketsSC-Pro-6",

                                                                                                                    "RoboMarketsSC-ProCent",

                                                                                                                    "RoboMarketsSC-ProCent-2",

                                                                                                                    "RoboMarketsSC-ProCent-3",

                                                                                                                    "RoboMarketsSC-ProCent-4",

                                                                                                                    "RoboMarketsSC-ProCent-5",

                                                                                                                    "RoboMarketsSC-ProCent-6",

                                                                                                                    "RoboMarketsSC-ProCent-7",

                                                                                                                    "RoboMarketsSC-ProCent-8"]},

      {id: "fxpro", version: "MetaTrader 4 & 5", name: "FX Pro", logoURL: "FX Pro", servers: [ "FxPro-MT5 Demo",

                                                                                                     "FxPro-MT5",

                                                                                                     "FxPro-MT5 Live02",

                                                                                                     "FxPro.com-Demo01",

                                                                                                     "FxPro.com-Demo04",

                                                                                                     "FxPro.com-Demo05",

                                                                                                     "FxPro.com-Demo06",

                                                                                                     "FxPro.com-Real01",

                                                                                                     "FxPro.com-Real02",

                                                                                                     "FxPro.com-Real03",

                                                                                                     "FxPro.com-Real04",

                                                                                                     "FxPro.com-Real05",

                                                                                                     "FxPro.com-Real06",

                                                                                                     "FxPro.com-Real07",

                                                                                                     "FxPro.com-Real08"]},

      {id: "octafx", version: "MetaTrader 4 & 5", name: "Octa FX", logoURL: "Octa FX", servers: [ "OctaFX-Demo",

                                                                                                        "OctaFX-Demo2",

                                                                                                        "OctaFX-Real",

                                                                                                        "OctaFX-Real2",

                                                                                                        "OctaFX-Real3",

                                                                                                        "OctaFX-Real4",

                                                                                                        "OctaFX-Real5",

                                                                                                        "OctaFX-Real6",

                                                                                                        "OctaFX-Real7",

                                                                                                        "OctaFX-Real8",

                                                                                                        "OctaFX-Real9",

                                                                                                        "OctaFX-Real10"]},

     
      

    

      {id: "capitalindex", version: "MetaTrader 4 & 5", name: "Capital Index", logoURL: "Capital Index", servers: [    "CapitalIndexGlobal-Demo",

                                                                                                                             "CapitalIndexGlobal-Live",

                                                                                                                             "CapitalIndexUK-Demo",

                                                                                                                             "CapitalIndexUK-Live"]},

  

      {id: "blackbullmarkets", version: "MetaTrader 4 & 5", name: "Black Bull Markets", logoURL: "Black Bull Markets", servers: ["BlackBullMarkets-Demo","BlackBullMarkets-Live","BlackBullMarkets-Live 2"]},

    
      ]

/** =========================
 *  Kleine UI-Bausteine
 *  ========================= */
function Card({ T, children, style }) {
  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        boxShadow: T.shadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}



function PrimaryButton({ T, disabled, onClick, children }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%",
        borderRadius: 14,
        padding: "12px 14px",
        fontWeight: 900,
        letterSpacing: 0.2,
        border: `1px solid ${disabled ? T.border : "rgba(44,96,250,0.45)"}`,
        background: disabled
          ? (T.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)")
          : `linear-gradient(135deg, rgba(232,47,166,0.90) 0%, rgba(44,96,250,0.95) 70%)`,
        color: disabled ? (T.dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)") : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : `0 0 0 3px ${T.glow}, 0 18px 40px rgba(44,96,250,0.18)`,
        transition: "filter .15s ease, transform .12s ease",
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ T, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        borderRadius: 14,
        padding: "12px 14px",
        fontWeight: 900,
        border: `1px solid ${T.border}`,
        background: T.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        color: T.text,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Input({ T, value, onChange, placeholder, type = "text", right }) {
  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: right ? "12px 44px 12px 12px" : "12px 12px",
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          background: T.field,
          color: T.text,
          fontWeight: 750,
          outline: "none",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      />
      {right && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
          {right}
        </div>
      )}
    </div>
  );
}

function MiniIconButton({ T, onClick, children, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: 14,
        border: `1px solid ${T.border}`,
        background: T.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        color: T.text,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
      }}
    >
      {children}
    </button>
  );
}

function Modal({ T, open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 18,
          border: `1px solid ${T.border}`,
          background: T.card,
          boxShadow: T.shadow,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontWeight: 900, color: T.text }}>{title}</div>
          <div style={{ marginLeft: "auto" }}>
            <MiniIconButton T={T} onClick={onClose} title="Close">
              ✕
            </MiniIconButton>
          </div>
        </div>
        <div style={{ padding: 16, color: T.text, fontSize: 14, lineHeight: 1.45 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** =========================
 *  Hauptseite
 *  ========================= */
export default function MetaTraderSyncPage(props) {
  const { auth, db } = useMemo(() => ensureFirebase(), []);
  const globalDark = useGlobalDark();
  const dark = props.dark ?? globalDark;
  const T = theme(dark);

  const [uid, setUid] = useState(null);
 // statt importedTrades



  // Flow
  const [step, setStep] = useState(Step.VERSION);

  // Broker data
  const [isLoading, setIsLoading] = useState(false);
  const [brokers, setBrokers] = useState([]);
  const [brokerSearch, setBrokerSearch] = useState("");

  // Selections
  const [selectedVersion, setSelectedVersion] = useState("");
  const [selectedBrokerID, setSelectedBrokerID] = useState("");
  const [expandedBrokerIDs, setExpandedBrokerIDs] = useState(new Set());
  const [selectedServer, setSelectedServer] = useState("");

  // Manual
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualBrokerName, setManualBrokerName] = useState("");
  const [manualServerName, setManualServerName] = useState("");

  // Credentials
  const [investorLogin, setInvestorLogin] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Live status (Firestore listeners)
  const [syncServerStatus, setSyncServerStatus] = useState("");
  const [lastLoginStatus, setLastLoginStatus] = useState("");
// =========================
// One-click Sync + Imported Trades
// =========================
const [syncing, setSyncing] = useState(false);
const [syncMsg, setSyncMsg] = useState("");
const [syncErr, setSyncErr] = useState("");


const [mtTrades, setMtTrades] = useState([]);


// Live-Liste (nur UI-Live, kein MT5-live polling):
useEffect(() => {
  if (!uid) return;
  if (step !== Step.COMPLETED) return;

const qy = query(
  collection(db, "users", uid, "trades"),
  orderBy("tradeDate", "desc")
);


  const unsub = onSnapshot(
    qy,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMtTrades(rows);
    },
    (err) => {
      console.error("mtTrades onSnapshot failed", err);
      setSyncErr(err?.message || String(err));
    }
  );

  return () => unsub();
}, [uid, db, step]);



  // Modals
  const [alert, setAlert] = useState({ open: false, text: "" });
  const [showInfo, setShowInfo] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);


const visibleMtTrades = useMemo(() => mtTrades || [], [mtTrades]);



  // Pagination (statt scrollbar)
  const PAGE_SIZE = 6;
  const [page, setPage] = useState(1);

  // Step index
  const totalSteps = 4;
  const currentStepIndex = useMemo(() => {
    if (step === Step.BROKER && isManualEntry) return 3;
    if (step === Step.VERSION) return 1;
    if (step === Step.BROKER) return 2;
    if (step === Step.CREDENTIALS) return 3;
    if (step === Step.COMPLETED) return 4;
    return 1;
  }, [step, isManualEntry]);
useEffect(() => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}, []);

  // Auth (anonymous fallback)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          await signInAnonymously(auth);
          return;
        }
        setUid(user.uid);
      } catch (e) {
        setAlert({ open: true, text: "Auth failed: " + (e?.message || String(e)) });
      }
    });
    return () => unsub();
  }, [auth]);

  // Load existing account + status listeners
  useEffect(() => {
    if (!uid) return;

    const accRef = doc(db, "users", uid, "metaAccounts", uid);

    (async () => {
      const snap = await getDoc(accRef);
      if (snap.exists()) {
        const d = snap.data();
        setSelectedVersion(d.version || "");
        setSelectedBrokerID(d.brokerID || "");
        setSelectedServer(d.server || "");
        setInvestorLogin(d.investorLogin || "");
        setInvestorPassword(d.investorPassword || "");
        setStep(Step.COMPLETED);
        if (d.version) fetchBrokers(d.version);
      }
    })().catch((e) => setAlert({ open: true, text: "Load failed: " + (e?.message || String(e)) }));

    const userDoc = doc(db, "users", uid);
    const unsub1 = onSnapshot(userDoc, (s) => {
      const v = s.data()?.syncServerStatus;
      if (typeof v === "string") setSyncServerStatus(v);
    });

    const unsub2 = onSnapshot(accRef, (s) => {
      const v = s.data()?.lastLoginStatus;
      if (typeof v === "string") setLastLoginStatus(v);
    });

    return () => {
      unsub1();
      unsub2();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function fetchBrokers(version) {
    setIsLoading(true);
    try {
      const versionsToQuery = ["MetaTrader 4 & 5", version];
      const qy = query(collection(db, "brokers"), where("version", "in", versionsToQuery));
      const snap = await getDocs(qy);

      if (!snap.empty) {
        const list = snap.docs
          .map((docu) => {
            const d = docu.data();
            if (!d?.name || !d?.logoURL || !Array.isArray(d?.servers)) return null;
            return { id: docu.id, version: d.version || "", name: d.name, logoURL: d.logoURL, servers: d.servers };
          })
          .filter(Boolean);
        setBrokers(list);
      } else {
        setBrokers(FALLBACK_BROKERS.filter((b) => b.version === version || b.version === "MetaTrader 4 & 5"));
      }
    } catch {
      setBrokers(FALLBACK_BROKERS.filter((b) => b.version === version || b.version === "MetaTrader 4 & 5"));
    } finally {
      setIsLoading(false);
    }
  }

async function saveAccount({ version, brokerID, server, login, password }) {
  console.log("🟡 saveAccount() called");

  // 1️⃣ UID prüfen
  if (!uid) {
    console.error("🔴 saveAccount aborted: no uid");
    throw new Error("No user session");
  }

  console.log("🟢 UID OK:", uid);

  // 2️⃣ Daten prüfen
  console.log("📦 Payload:", {
    version,
    brokerID,
    server,
    login,
    hasPassword: !!password,
  });

  const accRef = doc(db, "users", uid, "metaAccounts", uid);

  console.log("📄 Firestore path:", `users/${uid}/metaAccounts/${uid}`);

  try {
    // 3️⃣ Schreiben
    await setDoc(
      accRef,
      {
        version,
        brokerID,
        server,
        investorLogin: login,
        investorPassword: password, // ⚠️ später absichern
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // 4️⃣ Erfolg
    console.log("✅ Firestore write SUCCESS");

  } catch (err) {
    // 5️⃣ Fehler
    console.error("❌ Firestore write FAILED", err);
    throw err;
  }
}


function versionBadge(version) {
  const v = String(version || "").trim();
  if (!v) return "";
  if (v === "MetaTrader 4 & 5") return "MT4/MT5";
  if (v === "MetaTrader 5") return "MT4";
  if (v === "MetaTrader 4") return "MT5";
  return ""; // oder "MetaTrader"
}

  async function unlinkBroker() {
    if (!uid) return;
    try {
      const accRef = doc(db, "users", uid, "metaAccounts", uid);
      await deleteDoc(accRef);

      setStep(Step.VERSION);
      setSelectedVersion("");
      setSelectedBrokerID("");
      setSelectedServer("");
      setInvestorLogin("");
      setInvestorPassword("");
      setIsManualEntry(false);
      setManualBrokerName("");
      setManualServerName("");
      setBrokers([]);
      setExpandedBrokerIDs(new Set());
      setBrokerSearch("");
      setPage(1);

      setAlert({ open: true, text: "Broker-Daten gelöscht." });
    } catch (e) {
      setAlert({ open: true, text: "Delete failed: " + (e?.message || String(e)) });
    }
  }

  const filteredBrokers = useMemo(() => {
    const s = brokerSearch.trim().toLowerCase();
    if (!s) return brokers;
    return brokers.filter((b) => b.name.toLowerCase().includes(s));
  }, [brokers, brokerSearch]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredBrokers.length / PAGE_SIZE)), [filteredBrokers.length]);
  const pageItems = useMemo(() => {
    const p = Math.min(page, totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return filteredBrokers.slice(start, start + PAGE_SIZE);
  }, [filteredBrokers, page, totalPages]);

  const selectedBroker = useMemo(() => brokers.find((b) => b.id === selectedBrokerID), [brokers, selectedBrokerID]);


  



async function runSyncNow() {
  if (!auth.currentUser) {
    setSyncErr("Not logged in");
    return;
  }

  setSyncing(true);
  setSyncErr("");
  setSyncMsg("Starting sync…");

  try {
    const token = await auth.currentUser.getIdToken(true);

    const res = await fetch("http://127.0.0.1:8000/api/mt5/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ lookbackDays: 365 }), // optional
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(payload?.detail || `Sync failed (HTTP ${res.status})`);
    }

    setSyncMsg(`Sync OK: imported=${payload.imported}, updated=${payload.updated}`);
  } catch (e) {
    console.error(e);
    setSyncErr(e?.message || String(e));
    setSyncMsg("");
  } finally {
    setSyncing(false);
  }
}




async function addMtTradeToJournal(tr) {
  try {
    const token = await auth.currentUser.getIdToken(true);

    const res = await fetch("http://127.0.0.1:8000/api/mt5/add-to-journal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tradeId: tr.id }),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.detail || `HTTP ${res.status}`);

    setAlert({ open: true, text: "Moved to Journal ✅" });
    // Kein manuelles State-Update nötig, weil onSnapshot den 'journaled' Flag live bekommt
  } catch (e) {
    setAlert({ open: true, text: "Move failed: " + (e?.message || String(e)) });
  }
}




  function toggleExpand(id) {
    setExpandedBrokerIDs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Wenn sich Suche ändert: immer Seite 1
  useEffect(() => setPage(1), [brokerSearch]);

  return (
  <div
  style={{
    minHeight: "100vh",
    overflowY: "auto",     // ✅ scrollen
    overflowX: "hidden",
    background: T.bg,
    color: T.text,
    display: "flex",
    flexDirection: "column",
  }}
>

    

      {/* fixed layout: Header + Center + Footer */}
      <div style={{ flex: 1, overflow: "hidden", display: "grid", placeItems: "center", padding: 14 }}>
        <div style={{ width: "100%", maxWidth: 720 }}>
          {/* Top header bar (ohne X) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: T.sub, letterSpacing: 0.3 }}>
                MetaTrader Sync
              </div>

              {step === Step.COMPLETED ? (
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 2 }}>
                  <div style={{ fontSize: 18, fontWeight: 950, color: T.text }}>
                    {selectedBroker?.name || manualBrokerName || "Broker"}
                  </div>
                  <div style={{ fontSize: 13, color: T.sub, fontWeight: 800 }}>
                    {investorLogin || "—"}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 18, fontWeight: 950, marginTop: 2 }}>
                  {step === Step.VERSION ? "Select version" :
                   step === Step.BROKER ? "Select broker" :
                   step === Step.CREDENTIALS ? "Enter credentials" :
                   "Done"}
                </div>
              )}
            </div>

           {step === Step.COMPLETED && (
  <MiniIconButton
    T={T}
    onClick={() => setShowUnlinkConfirm(true)}
    title="Log out"
  >
    {/* Logout Icon (SVG) */}
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M10 17l-1 0c-2.5 0-4-1.5-4-4V11c0-2.5 1.5-4 4-4h1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15 16l4-4-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 12H10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </MiniIconButton>
)}

          </div>

          {/* Main Panel */}
          <Card
            T={T}
            style={{
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Subtle gradient header strip */}
            <div
              style={{
                padding: "14px 16px",
                borderBottom: `1px solid ${T.border}`,
                background: T.dark
                  ? "linear-gradient(135deg, rgba(44,96,250,0.18) 0%, rgba(232,47,166,0.10) 55%, rgba(255,255,255,0.00) 100%)"
                  : "linear-gradient(135deg, rgba(44,96,250,0.10) 0%, rgba(232,47,166,0.06) 55%, rgba(255,255,255,0.00) 100%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: T.accent,
                    boxShadow: `0 0 0 5px ${T.glow}`,
                  }}
                />
                <div style={{ fontWeight: 950, letterSpacing: 0.2 }}>
                  Step {currentStepIndex} / {totalSteps}
                </div>

                <div style={{ marginLeft: "auto", color: T.sub, fontWeight: 800, fontSize: 12 }}>
                  {selectedVersion ? selectedVersion : "No version selected"}
                </div>
              </div>

              {/* progress bar */}
              <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: T.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(currentStepIndex / totalSteps) * 100}%`,
                    background: `linear-gradient(90deg, ${T.accent} 0%, rgba(232,47,166,0.90) 100%)`,
                    transition: "width 220ms ease",
                  }}
                />
              </div>
            </div>

            {/* Content area: fixed height, no internal scroll */}
            <div style={{ padding: 16 }}>
              {/* VERSION */}
             {step === Step.VERSION && (
  <div style={{ display: "grid", gap: 14 }}>
    <div style={{ color: T.sub, fontSize: 13, fontWeight: 800, lineHeight: 1.35 }}>
      Choose MetaTrader version to load supported brokers and server list.
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {/* MT4 */}
      <button
        onClick={() => {
          setSelectedVersion("MetaTrader 5");
          fetchBrokers("MetaTrader 5");
          setSelectedBrokerID("");
          setSelectedServer("");
          setIsManualEntry(false);
          setStep(Step.BROKER);
        }}
        style={{
          borderRadius: 18,
          padding: 14,
          border: `1px solid ${T.border}`,
          background: T.dark ? "rgba(28,191,115,0.16)" : "rgba(28,191,115,0.10)",
          color: T.text,
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            background: T.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            display: "grid",
            placeItems: "center",
            boxShadow: `0 0 0 3px ${T.glow}`,
            overflow: "hidden",
            flex: "0 0 auto",
          }}
        >
          <img
            src={mt4Logo}
            alt="MetaTrader 5"
            style={{ width: 28, height: 28, objectFit: "contain" }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 950, fontSize: 16, lineHeight: 1.1 }}>MT4</div>
          <div style={{ color: T.sub, fontWeight: 800, marginTop: 4 }}>MetaTrader 4</div>
        </div>
      </button>

      {/* MT5 */}
      <button
        onClick={() => {
          setSelectedVersion("MetaTrader 5");
          fetchBrokers("MetaTrader 5");
          setSelectedBrokerID("");
          setSelectedServer("");
          setIsManualEntry(false);
          setStep(Step.BROKER);
        }}
        style={{
          borderRadius: 18,
          padding: 14,
          border: `1px solid ${T.border}`,
          background: T.dark ? "rgba(44,96,250,0.18)" : "rgba(44,96,250,0.10)",
          color: T.text,
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            background: T.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            display: "grid",
            placeItems: "center",
            boxShadow: `0 0 0 3px ${T.glow}`,
            overflow: "hidden",
            flex: "0 0 auto",
          }}
        >
          <img
            src={mt5Logo}
            alt="MetaTrader 5"
            style={{ width: 28, height: 28, objectFit: "contain" }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 950, fontSize: 16, lineHeight: 1.1 }}>MT5</div>
          <div style={{ color: T.sub, fontWeight: 800, marginTop: 4 }}>MetaTrader 5</div>
        </div>
      </button>
    </div>

    <div style={{ color: T.sub, fontSize: 12, fontWeight: 800 }}>
     
    </div>
  </div>
)}


              {/* BROKER */}
              {step === Step.BROKER && (
                <div style={{ display: "grid", gap: 12 }}>
                  {!isManualEntry ? (
                    <>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <Input
                            T={T}
                            value={brokerSearch}
                            onChange={setBrokerSearch}
                            placeholder="Search brokers…"
                          />
                        </div>
                        <MiniIconButton
                          T={T}
                          onClick={() => setIsManualEntry(true)}
                          title="Other / Manual entry"
                        >
                          ⋯
                        </MiniIconButton>
                      </div>

                      {/* Broker list (paginated, no scroll) */}
                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                          gridTemplateColumns: "1fr",
                        }}
                      >
                        {isLoading ? (
                          <div style={{ color: T.sub, fontWeight: 800, padding: "10px 2px" }}>Loading…</div>
                        ) : (
                          pageItems.map((b) => (
                            <div
                              key={b.id}
                              style={{
                                borderRadius: 16,
                                border: `1px solid ${T.border}`,
                                background: T.card,
                                overflow: "hidden",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
                           
{(() => {
  const badge = versionBadge(b.version);
const logoSrc = brokerLogoSrc(b.logoURL || b.id);



  return (
    <>
      {/* LOGO LINKS */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          background: T.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          flex: "0 0 auto",
        }}
      >
        {logoSrc ? (
       <img
  src={logoSrc}
  alt={b.name}
  style={{
    width: "100%",
    height: "100%",
    objectFit: "contain",
    padding: 6,
    borderRadius: 12, // ✅ leicht abgerundet
  }}
  draggable={false}
/>

        ) : (
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: T.sub,
              opacity: 0.5,
            }}
          />
        )}
      </div>

      {/* NAME + BADGE (nur EINMAL!) */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 950 }}>{b.name}</div>
        {badge ? (
          <div style={{ color: T.sub, fontSize: 12, fontWeight: 850 }}>
            {badge}
          </div>
        ) : null}
      </div>
    </>
  );
})()}





                                <MiniIconButton
                                  T={T}
                                  onClick={() => toggleExpand(b.id)}
                                  title={expandedBrokerIDs.has(b.id) ? "Collapse" : "Expand servers"}
                                >
                                  {expandedBrokerIDs.has(b.id) ? "˄" : "˅"}
                                </MiniIconButton>
                              </div>

                              {expandedBrokerIDs.has(b.id) && (
                                <div
                                  style={{
                                    padding: "0 10px 10px 10px",
                                    display: "grid",
                                    gap: 6,
                                  }}
                                >
                                  {/* Server list: limit to keep view non-scrollable */}
                                  {(b.servers || []).slice(0, 6).map((server) => (
                                    <button
                                      key={server}
                                      onClick={() => {
                                        setSelectedBrokerID(b.id);
                                        setSelectedServer(server);
                                      }}
                                      style={{
                                        width: "100%",
                                        textAlign: "left",
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        border: `1px solid ${selectedServer === server ? "rgba(44,96,250,0.55)" : T.border}`,
                                        background:
                                          selectedServer === server
                                            ? (T.dark ? "rgba(44,96,250,0.14)" : "rgba(44,96,250,0.08)")
                                            : (T.dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"),
                                        color: T.text,
                                        cursor: "pointer",
                                        fontWeight: 850,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                      }}
                                    >
                                      <span style={{ color: selectedServer === server ? T.accent : T.text }}>
                                        {server}
                                      </span>
                                      <span style={{ marginLeft: "auto", color: selectedServer === server ? T.accent : "transparent" }}>
                                        ✓
                                      </span>
                                    </button>
                                  ))}

                                  {(b.servers || []).length > 6 && (
                                    <div style={{ color: T.sub, fontSize: 12, fontWeight: 800, paddingLeft: 6 }}>
                                      More servers available… refine search or use manual entry.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Pagination controls */}
                      {!isLoading && filteredBrokers.length > PAGE_SIZE && (
                        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                          <GhostButton
                            T={T}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                          >
                            ← Prev
                          </GhostButton>

                          <div style={{ color: T.sub, fontWeight: 900, fontSize: 12 }}>
                            Page {Math.min(page, totalPages)} / {totalPages}
                          </div>

                          <GhostButton
                            T={T}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          >
                            Next →
                          </GhostButton>
                        </div>
                      )}

                      <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                        <PrimaryButton
                          T={T}
                          disabled={!selectedServer}
                          onClick={() => setStep(Step.CREDENTIALS)}
                        >
                          Next
                        </PrimaryButton>

                        <button
                          onClick={() => setStep(Step.VERSION)}
                          style={{ color: T.sub, fontWeight: 900, fontSize: 12, background: "transparent", border: "none", cursor: "pointer" }}
                        >
                          ← Back
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontWeight: 950 }}>Manual Entry</div>
                        <div style={{ marginLeft: "auto" }}>
                          <MiniIconButton T={T} onClick={() => setShowInfo(true)} title="Broker Info">
                            ⓘ
                          </MiniIconButton>
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        <Input T={T} value={manualBrokerName} onChange={setManualBrokerName} placeholder="Broker (e.g. FTMO)" />
                        <Input T={T} value={manualServerName} onChange={setManualServerName} placeholder="Server (exact)" />
                        <Input T={T} value={investorLogin} onChange={setInvestorLogin} placeholder="Login" />
                        <Input
                          T={T}
                          value={investorPassword}
                          onChange={setInvestorPassword}
                          placeholder="Password"
                          type={showPassword ? "text" : "password"}
                          right={
                            <button
                              onClick={() => setShowPassword((v) => !v)}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 12,
                                border: `1px solid ${T.border}`,
                                background: T.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                                cursor: "pointer",
                                color: T.text,
                              }}
                              title="Show/Hide"
                            >
                              {showPassword ? "🙈" : "👁️"}
                            </button>
                          }
                        />

                        <PrimaryButton
                          T={T}
                          disabled={
                            !manualBrokerName.trim() ||
                            !manualServerName.trim() ||
                            !investorLogin.trim() ||
                            !investorPassword
                          }
                          onClick={async () => {
                            try {
                              await saveAccount({
                                version: selectedVersion,
                                brokerID: manualBrokerName.trim(),
                                server: manualServerName.trim(),
                                login: investorLogin.trim(),
                                password: investorPassword,
                              });
                              setSelectedBrokerID(manualBrokerName.trim());
                              setSelectedServer(manualServerName.trim());
                              setStep(Step.COMPLETED);
                            } catch (e) {
                              setAlert({ open: true, text: "Save failed: " + (e?.message || String(e)) });
                            }
                          }}
                        >
                          Save
                        </PrimaryButton>

                        <GhostButton
                          T={T}
                          onClick={() => {
                            setIsManualEntry(false);
                            setManualBrokerName("");
                            setManualServerName("");
                          }}
                        >
                          ← Back to broker list
                        </GhostButton>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* CREDENTIALS */}
              {step === Step.CREDENTIALS && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ color: T.sub, fontSize: 13, fontWeight: 850 }}>
                    Use your <b style={{ color: T.text }}>Investor</b> credentials (read-only).
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <Input T={T} value={investorLogin} onChange={setInvestorLogin} placeholder="login" />
                    <Input
                      T={T}
                      value={investorPassword}
                      onChange={setInvestorPassword}
                      placeholder="password"
                      type={showPassword ? "text" : "password"}
                      right={
                        <button
                          onClick={() => setShowPassword((v) => !v)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 12,
                            border: `1px solid ${T.border}`,
                            background: T.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                            cursor: "pointer",
                            color: T.text,
                          }}
                          title="Show/Hide"
                        >
                          {showPassword ? "🙈" : "👁️"}
                        </button>
                      }
                    />

                    <PrimaryButton
                      T={T}
                      disabled={!investorLogin.trim() || !investorPassword || !selectedServer}
                      onClick={async () => {
                        try {
                          await saveAccount({
                            version: selectedVersion,
                            brokerID: selectedBrokerID,
                            server: selectedServer,
                            login: investorLogin.trim(),
                            password: investorPassword,
                          });
                          setStep(Step.COMPLETED);
                        } catch (e) {
                          setAlert({ open: true, text: "Save failed: " + (e?.message || String(e)) });
                        }
                      }}
                    >
                      Save
                    </PrimaryButton>

                    <GhostButton T={T} onClick={() => setStep(Step.BROKER)}>
                      ← Back
                    </GhostButton>
                  </div>
                </div>
              )}

              {/* COMPLETED */}
{step === Step.COMPLETED && (
  <div style={{ display: "grid", gap: 12 }}>
    {/* Status Card */}
    <div
      style={{
        borderRadius: 18,
        border: `1px solid ${T.border}`,
        background: T.card,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {String(syncServerStatus).toLowerCase() === "online" ? (
          <>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: T.good, boxShadow: `0 0 0 5px rgba(28,191,115,0.12)` }} />
            <div style={{ fontWeight: 950, color: T.good }}>Online</div>
          </>
        ) : String(syncServerStatus).toLowerCase() === "offline" ? (
          <>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: T.bad, boxShadow: `0 0 0 5px rgba(238,78,78,0.12)` }} />
            <div style={{ fontWeight: 950, color: T.bad }}>Offline</div>
          </>
        ) : (
          <>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.25)" }} />
            <div style={{ fontWeight: 950, color: T.sub }}>Checking…</div>
          </>
        )}

        <div style={{ marginLeft: "auto", color: T.sub, fontWeight: 850, fontSize: 12 }}>
          lastLoginStatus: <span style={{ color: T.text }}>{lastLoginStatus || "—"}</span>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 6, color: T.sub, fontWeight: 850, fontSize: 12 }}>
        <div>
          Broker: <span style={{ color: T.text }}>{selectedBroker?.name || manualBrokerName || selectedBrokerID || "—"}</span>
        </div>
        <div>
          Server: <span style={{ color: T.text }}>{selectedServer || manualServerName || "—"}</span>
        </div>
        <div>
          Version: <span style={{ color: T.text }}>{selectedVersion || "—"}</span>
        </div>
      </div>
    </div>

    {/* SYNC CONTROLS */}
    <div
      style={{
        borderRadius: 18,
        border: `1px solid ${T.border}`,
        background: T.card,
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 950 }}>Trade Import</div>
      <div style={{ color: T.sub, fontWeight: 800, fontSize: 12, lineHeight: 1.35 }}>
        Click <b style={{ color: T.text }}>Sync</b> to import your MT5 trade history into a separate list.
        Then manually add trades to your journal.
      </div>

      <PrimaryButton T={T} disabled={syncing} onClick={runSyncNow}>
        {syncing ? "Syncing…" : "Sync now"}
      </PrimaryButton>

      {syncMsg ? (
        <div style={{ color: T.good, fontWeight: 900, fontSize: 12 }}>{syncMsg}</div>
      ) : null}
      {syncErr ? (
        <div style={{ color: T.bad, fontWeight: 900, fontSize: 12 }}>{syncErr}</div>
      ) : null}
    </div>

    {/* IMPORTED TRADES LIST */}
    <div
      style={{
        borderRadius: 18,
        border: `1px solid ${T.border}`,
        background: T.card,
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
     <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
  <div style={{ fontWeight: 950 }}>MT Trades</div>
  <div style={{ color: T.sub, fontWeight: 900, fontSize: 12 }}>
    {visibleMtTrades.length} trades
  </div>
</div>

{visibleMtTrades.length === 0 ? (
  <div style={{ color: T.sub, fontWeight: 800, fontSize: 12 }}>
    No MT trades yet. Press “Sync now”.
  </div>
) : (
  <div style={{ display: "grid", gap: 10 }}>
    {visibleMtTrades.slice(0, 25).map((tr) => {
      const sym = tr.symbol || "—";
      const pos = tr.position || "—";
      const outcome = tr.outcome || "—";

      const profit = tr?.mt5?.profit;
      const dateStr = tr.exitDate || tr.date || "—"; // ✅ Datum anzeigen

      // ✅ Status: schon verschoben?
      const done = tr.journaled === true || !!tr.journaledAt;

      return (
        <div
          key={tr.id}
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            padding: 12,
            display: "grid",
            gap: 8,
            background: T.dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            opacity: done ? 0.72 : 1, // ✅ visuell “deaktiviert”
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 950 }}>{sym}</div>

            <div style={{ color: T.sub, fontWeight: 900, fontSize: 12 }}>
              {pos} • {outcome} • {dateStr}
            </div>

            <div
              style={{
                marginLeft: "auto",
                fontWeight: 950,
                color:
                  typeof profit === "number"
                    ? profit >= 0
                      ? T.good
                      : T.bad
                    : T.sub,
              }}
            >
              {typeof profit === "number" ? profit.toFixed(2) : "—"}
            </div>
          </div>

          <button
            disabled={done}
            onClick={() => addMtTradeToJournal(tr)} // ✅ richtige Funktion
            style={{
              width: "100%",
              borderRadius: 14,
              padding: "10px 12px",
              fontWeight: 950,

              // ✅ anderer Button-Style wenn done
              border: `1px solid ${
                done ? T.border : "rgba(44,96,250,0.45)"
              }`,
              background: done
                ? (T.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)")
                : (T.dark ? "rgba(44,96,250,0.18)" : "rgba(44,96,250,0.10)"),
              color: done ? T.sub : T.text,
              cursor: done ? "not-allowed" : "pointer",
            }}
          >
            {done ? "Already in Trades ✅" : "Move to Trades"}
          </button>
        </div>
      );
    })}

    {visibleMtTrades.length > 25 && (
      <div style={{ color: T.sub, fontWeight: 800, fontSize: 12 }}>
        Showing first 25 trades. (You can paginate later.)
      </div>
    )}
  </div>
)}


  

  
    </div>

    {/* Existing button */}
    
  </div>
)}

            </div>
          </Card>
        </div>
      </div>

      

      {/* Modals */}
      <Modal T={T} open={showInfo} title="Broker Info" onClose={() => setShowInfo(false)}>
        <div style={{ color: T.sub, fontWeight: 800 }}>
         { /* Hier kannst du Hinweise platzieren, was „Investor Login“ ist, wie man den Servernamen findet,
          und warum du für Live-Sync ggf. einen Bridge/Connector benötigst. */ }
        </div>
      </Modal>

      <Modal T={T} open={showUnlinkConfirm} title="Log out?" onClose={() => setShowUnlinkConfirm(false)}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: T.sub, fontWeight: 800 }}>
            Disconnect this account?
Your saved broker and login data will be deleted.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <button
              onClick={() => {
                setShowUnlinkConfirm(false);
                unlinkBroker();
              }}
              style={{
                width: "100%",
                borderRadius: 14,
                padding: "12px 14px",
                fontWeight: 950,
                border: `1px solid rgba(238,78,78,0.55)`,
                background: T.dark ? "rgba(238,78,78,0.18)" : "rgba(238,78,78,0.10)",
                color: T.dark ? "#ffd9d9" : "#7a1111",
                cursor: "pointer",
              }}
            >
              Log Out
            </button>
            <GhostButton T={T} onClick={() => setShowUnlinkConfirm(false)}>
              Cancel
            </GhostButton>
          </div>
        </div>
      </Modal>

      <Modal T={T} open={alert.open} title="Notification" onClose={() => setAlert({ open: false, text: "" })}>
        {alert.text}
      </Modal>
    </div>
  );
}
