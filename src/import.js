// src/utils/mtImport.js

// CSV in Zeilen + Objekt-Array verwandeln
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const row = {};
    header.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return row;
  });
}

// MT4/5 Datum "2025.11.23 14:44" oder "2025-11-23 14:44" -> Date
function parseMtDateTime(str) {
  if (!str) return null;
  // Trenne Datum/Zeit
  const [datePart, timePart] = str.split(" ");
  if (!datePart) return null;

  const sep = datePart.includes(".") ? "." : "-";
  const [y, m, d] = datePart.split(sep).map(x => parseInt(x, 10));
  if (!y || !m || !d) return null;

  const [hh = "0", mm = "0"] = (timePart || "00:00").split(":");
  const dt = new Date(y, m - 1, d, parseInt(hh, 10), parseInt(mm, 10), 0, 0);
  return dt;
}

// 23.11.25 (dd.mm.yy) – passend zu deiner Gallery-Logik
function formatDdMmYy(date) {
  if (!(date instanceof Date)) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

// 14:44
function formatTime(date) {
  if (!(date instanceof Date)) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// outcome aus Profit ableiten
function mapOutcomeFromProfit(p) {
  const val = Number(p) || 0;
  if (val > 0) return "Win";
  if (val < 0) return "Loss";
  return "BE";
}

/**
 * Row (MT4/5) -> Trade-Dokumentstruktur
 * Erwartete Spaltennamen: "Open Time", "Close Time", "Type", "Symbol", "Profit"
 */
export function mapMtRowToTrade(row) {
  const openDt  = parseMtDateTime(row["Open Time"] || row["Time"] || "");
  const closeDt = parseMtDateTime(row["Close Time"] || row["Close Time "] || "");

  const entryDateStr = formatDdMmYy(openDt);
  const exitDateStr  = formatDdMmYy(closeDt);
  const timeStr      = formatTime(openDt);
  const exitTimeStr  = formatTime(closeDt);

  const profit = Number(row["Profit"] || row["Profit "] || 0) || 0;
  const positionRaw = (row["Type"] || "").toLowerCase();
  const position =
    positionRaw.includes("buy")  ? "Buy" :
    positionRaw.includes("sell") ? "Sell" :
    "";

  const symbol = row["Symbol"] || row["Item"] || row["Symbol "] || "";

  const outcome = mapOutcomeFromProfit(profit);

  // Haupt-Dokument (wie in deinem Screenshot unten)
  const tradeDoc = {
    date: entryDateStr,            // für Calendar/Gallery
    entryDate: entryDateStr,       // Detail-View
    exitDate: exitDateStr || "",   // kann leer sein
    time: timeStr,                 // Entry-Zeit
    timeZone: exitTimeStr,         // hier nutzt du aktuell Exit-Zeit

    symbol,
    position,
    outcome,
    risk: profit,                  // P/L wird bei dir als "risk" gespeichert
    riskReward: "",                // kannst du später befüllen

    positiveFeedback: "",
    negativeFeedback: "",
    selectedEmotion: "",
    images: [],

    // Confluences leer – kannst du über UI nachpflegen
    confluenceEntries: [],

    // optional nested emotions-Objekt im gleichen Stil
    emotions: {
      confluenceEntries: [],
      negativeFeedback: "",
      positiveFeedback: "",
      selectedEmotion: "",
      entryDate: entryDateStr,
      exitDate: exitDateStr || "",
      // id lassen wir leer; kannst du bei Bedarf später mit doc.id updaten
      id: "",
    },
  };

  return tradeDoc;
}

/**
 * Komplettes CSV -> Array von Trade-Dokumenten
 */
export function mapMtCsvToTrades(csvText) {
  const rows = parseCsv(csvText);
  return rows
    .map((row) => mapMtRowToTrade(row))
    // Filtere Zeilen ohne Symbol weg
    .filter((t) => t.symbol);
}
