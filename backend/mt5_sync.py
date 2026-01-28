import os
import time
import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel

import MetaTrader5 as mt5

import firebase_admin
from firebase_admin import credentials, auth
from google.cloud import firestore

# =========================
# BOOT / ENV
# =========================
load_dotenv()

PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "").strip()
CRED_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccount.json")
MT5_PATH = os.getenv("MT5_PATH", r"C:\Program Files\MetaTrader 5\terminal64.exe")
DEFAULT_LOOKBACK_DAYS = int(os.getenv("LOOKBACK_DAYS", "365"))

print(f"[BOOT] project={PROJECT_ID}")
print(f"[BOOT] cred={CRED_PATH}")
print(f"[BOOT] mt5={MT5_PATH}")
print(f"[BOOT] lookbackDays={DEFAULT_LOOKBACK_DAYS}")

if not PROJECT_ID:
    raise SystemExit("FIREBASE_PROJECT_ID fehlt in .env")

cred = credentials.Certificate(CRED_PATH)
firebase_admin.initialize_app(cred, {"projectId": PROJECT_ID})
db = firestore.Client(project=PROJECT_ID)

app = FastAPI(title="Acardia MT5 Sync")

from fastapi.middleware.cors import CORSMiddleware

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,   # <- wichtig: bei "*" ginge es nicht mit True, für Dev hier False ok
    allow_methods=["*"],
    allow_headers=["*"],
)



# =========================
# Helpers
# =========================
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def fmt_date(dt: datetime) -> str:
    return dt.astimezone().strftime("%d.%m.%y")

def fmt_time(dt: datetime) -> str:
    return dt.astimezone().strftime("%H:%M")

def stable_trade_id(login: int, position_id: int) -> str:
    return f"{login}:{position_id}"

def mt5_shutdown_quiet():
    try:
        mt5.shutdown()
    except:
        pass

def mt5_init_and_login(login: int, password: str, server: str) -> None:
    """
    IMPORTANT:
    - Wir initialisieren jedes Mal frisch (kein Polling, kein Dauerzustand).
    - Wenn MT5 gerade hängt → IPC timeout möglich.
    """
    mt5_shutdown_quiet()
    time.sleep(0.2)

    ok = mt5.initialize(
        path=MT5_PATH,
        login=login,
        password=password,
        server=server,
        portable=False,   # für "Sync on demand" meistens am stabilsten
        timeout=20000
    )
    if not ok:
        err = mt5.last_error()
        raise RuntimeError(f"MT5 initialize/login failed: {err}")

    ai = mt5.account_info()
    if ai is None:
        raise RuntimeError(f"MT5 account_info None: {mt5.last_error()}")

    print(f"[MT5] login OK account={ai.login} name={ai.name} server={server}")

def get_meta_doc(uid: str):
    return db.collection("users").document(uid).collection("metaAccounts").document(uid)

def mt_trades_col(uid: str):
    return db.collection("users").document(uid).collection("mtTrades")

def journal_trades_col(uid: str):
    return db.collection("users").document(uid).collection("trades")

def normalize_position_to_trade(login: int, position_id: int, deals: list) -> Optional[dict]:
    """
    Baut 1 "Trade" pro Position (Position-ID).
    Speichert NUR, wenn Position geschlossen ist (OUT/OUT_BY/INOUT existiert).
    """

    DEAL_ENTRY_IN = getattr(mt5, "DEAL_ENTRY_IN", 0)
    OUT_ENTRIES = {
        getattr(mt5, "DEAL_ENTRY_OUT", 1),
        getattr(mt5, "DEAL_ENTRY_OUT_BY", 3),
        getattr(mt5, "DEAL_ENTRY_INOUT", 2),
    }

    deals = sorted(deals, key=lambda d: d.time)

    entry_deal = next((d for d in deals if getattr(d, "entry", None) == DEAL_ENTRY_IN), deals[0])
    exit_candidates = [d for d in deals if getattr(d, "entry", None) in OUT_ENTRIES]
    if not exit_candidates:
        return None  # noch offen → nicht in mtTrades

    exit_deal = exit_candidates[-1]

    entry_dt = datetime.fromtimestamp(entry_deal.time, tz=timezone.utc)
    exit_dt  = datetime.fromtimestamp(exit_deal.time,  tz=timezone.utc)

    symbol = getattr(entry_deal, "symbol", "") or getattr(exit_deal, "symbol", "") or ""
    deal_type = getattr(entry_deal, "type", None)
    position = "Buy" if str(deal_type) in ("0", str(getattr(mt5, "DEAL_TYPE_BUY", 0))) else "Sell"

    total_profit = 0.0
    for d in deals:
        p = getattr(d, "profit", 0.0)
        if isinstance(p, (int, float)):
            total_profit += float(p)

    outcome = "Win" if total_profit > 0 else ("Loss" if total_profit < 0 else "Breakeven")
    trade_id = stable_trade_id(login, position_id)

    entry_price = getattr(entry_deal, "price", None)
    exit_price  = getattr(exit_deal, "price", None)
    volume      = getattr(entry_deal, "volume", None)

    # Wichtig: zusätzlich timestamps speichern, damit du später sortieren kannst
    return {
        "id": trade_id,
        "source": "mt5",
        "accountLogin": login,
        "positionId": int(position_id),

       "entryTs": entry_dt,
"exitTs": exit_dt,

        "date": fmt_date(exit_dt),
        "time": fmt_time(exit_dt),
        "entryDate": fmt_date(entry_dt),
        "exitDate": fmt_date(exit_dt),
        "timeZone": fmt_time(exit_dt),

        "symbol": symbol,
        "position": position,
        "outcome": outcome,

       "risk": total_profit,  # profit zusätzlich in risk speichern

        "riskReward": "",
        "confluenceEntries": [],
        "images": [],
        "positiveFeedback": "",
        "negativeFeedback": "",
        "emotions": {
            "selectedEmotion": "",
            "confluenceEntries": [],
            "positiveFeedback": "",
            "negativeFeedback": "",
        },

        "mt5": {
            "profit": total_profit,
            "entry_ticket": getattr(entry_deal, "ticket", None),
            "exit_ticket": getattr(exit_deal, "ticket", None),
            "entry_price": entry_price,
            "exit_price": exit_price,
            "volume": volume,
            "deal_tickets": [getattr(d, "ticket", None) for d in deals],
        },

        "journaled": False,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }

def verify_user(authorization: Optional[str]) -> str:
    """
    Erwartet: Authorization: Bearer <firebase_id_token>
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")

    token = authorization.split(" ", 1)[1].strip()
    try:
        decoded = auth.verify_id_token(token)
        return decoded["uid"]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

# =========================
# API Models
# =========================
class SyncRequest(BaseModel):
    lookbackDays: Optional[int] = None

class JournalRequest(BaseModel):
    tradeId: str

# =========================
# Endpoints
# =========================
@app.get("/api/mt5/health")

def health():
    return {"ok": True}

@app.post("/api/mt5/sync")

def sync(req: SyncRequest, authorization: Optional[str] = Header(default=None)):
    uid = verify_user(authorization)

    meta_ref = get_meta_doc(uid)
    meta_snap = meta_ref.get()
    if not meta_snap.exists:
        raise HTTPException(status_code=400, detail="No metaAccounts doc for user")

    d = meta_snap.to_dict() or {}
    version = (d.get("version") or "").strip()
    if version != "MetaTrader 5":
        raise HTTPException(status_code=400, detail=f"Only MT5 supported. version={version}")

    server = (d.get("server") or "").strip()
    login_raw = str(d.get("investorLogin") or "").strip()
    password = d.get("investorPassword") or ""

    if not server or not login_raw or not password:
        raise HTTPException(status_code=400, detail="Missing server/login/password")

    try:
        login = int(login_raw)
    except:
        raise HTTPException(status_code=400, detail="Login must be int")

    lookback = req.lookbackDays if req.lookbackDays else DEFAULT_LOOKBACK_DAYS
    start_dt = now_utc() - timedelta(days=int(lookback))
    end_dt = now_utc()

    print(f"[{uid}] SYNC start={start_dt.isoformat()} end={end_dt.isoformat()} server={server} login={login}")

    try:
        mt5_init_and_login(login, password, server)

        deals = mt5.history_deals_get(start_dt, end_dt)
        if deals is None:
            raise RuntimeError(f"history_deals_get failed: {mt5.last_error()}")

        deals = list(deals)
        print(f"[{uid}] deals={len(deals)}")

        by_pos = {}
        newest = None

        for deal in deals:
            pid = getattr(deal, "position_id", None)
            if pid is None:
                continue
            by_pos.setdefault(int(pid), []).append(deal)

            dt = datetime.fromtimestamp(deal.time, tz=timezone.utc)
            if newest is None or dt > newest:
                newest = dt

        imported = 0
        updated = 0
        closed_positions = 0

        col = mt_trades_col(uid)

        for pid, pdeals in by_pos.items():
            trade = normalize_position_to_trade(login, pid, pdeals)
            if not trade:
                continue
            closed_positions += 1

            doc_id = trade["id"]
            ref = col.document(doc_id)

            # merge=True: wenn schon da, updaten wir Felder (aber lassen journaled stehen)
            existing = ref.get()
            if existing.exists:
                # journaled flag beibehalten
                old = existing.to_dict() or {}
                trade["journaled"] = bool(old.get("journaled", False))
                ref.set(trade, merge=True)
                updated += 1
            else:
                ref.set(trade, merge=True)
                imported += 1

        meta_ref.set(
            {
                "lastSyncAt": firestore.SERVER_TIMESTAMP,
                "lastLoginStatus": "Sync OK",
                "syncServerStatus": "online",
            },
            merge=True,
        )

        return {
            "uid": uid,
            "closedPositions": closed_positions,
            "imported": imported,
            "updated": updated,
        }

    except Exception as e:
        meta_ref.set(
            {
                "lastLoginStatus": f"Sync failed: {e}",
                "syncServerStatus": "offline",
            },
            merge=True,
        )
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        mt5_shutdown_quiet()

@app.post("/api/mt5/add-to-journal")
def add_to_journal(req: JournalRequest, authorization: Optional[str] = Header(default=None)):
    uid = verify_user(authorization)

    # 1) Quelle laden
    src_ref = mt_trades_col(uid).document(req.tradeId)
    snap = src_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="mtTrade not found")

    trade = snap.to_dict() or {}

    # Schon verschoben?
    if trade.get("journaled") is True:
        return {"ok": True, "already": True}

    # 2) Profit zusätzlich in risk speichern (Fallback)
    profit = (trade.get("mt5") or {}).get("profit", None)
    if profit is not None and (trade.get("risk") in ("", None)):
        trade["risk"] = profit

    # 3) Ziel: users/{uid}/trades/{tradeId}
    dst_ref = journal_trades_col(uid).document(req.tradeId)

    # 4) ins Journal schreiben
    trade["journaled"] = True
    trade["journaledAt"] = firestore.SERVER_TIMESTAMP
    dst_ref.set(trade, merge=True)

    # 5) Quelle markieren
    src_ref.set({"journaled": True, "journaledAt": firestore.SERVER_TIMESTAMP}, merge=True)

    return {"ok": True, "tradeId": req.tradeId}
