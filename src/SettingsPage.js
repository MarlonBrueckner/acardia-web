// src/SettingsView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
  sendPasswordResetEmail
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import {
  FiCamera,
  FiTrash2,
  FiSave,
  FiAlertCircle,
  FiLogOut,
  FiShield,
  FiX
} from "react-icons/fi";

/* ---------------- theme ---------------- */
const palette = {
  dark: {
    bg: "#181818",
    panel: "#181818",
    text: "#ffffff",
    sub: "#bfc4cf",
    border: "#181818",
    input: "#1f1f1f",
    inputBorder: "#4e4e4e",
    accent: "#2c60fa",
    shadow: "0 6px 40px rgba(0,0,0,.45)"
  },
  light: {
    bg: "#dee3e9",
    panel: "#ffffff",
    text: "#23232a",
    sub: "#495060",
    border: "#e3e7ef",
    input: "#edf2fa",
    inputBorder: "#e3e7ef",
    accent: "#2c60fa",
    shadow: "0 10px 40px rgba(30,36,64,.18)"
  }
};

// Direkt unter den anderen Button-Styles einfügen:

const fabCam = (theme) => ({
  position: "absolute",
  right: -4,
  bottom: -4,
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: theme.accent,
  color: "#fff",
  border: "none",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  fontSize: 16
});

const fabRemove = (theme) => ({
  position: "absolute",
  left: -4,
  bottom: -4,
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "rgb(238,106,106)",
  color: "#fff",
  border: "none",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  fontSize: 16
});


const useTheme = (dark) => useMemo(() => (dark ? palette.dark : palette.light), [dark]);

const CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" }
];

export default function SettingsView() {
  const { dark } = useOutletContext();
  const theme = useTheme(dark);
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("settings");
  const [user, setUser] = useState(() => auth.currentUser);
  const [loading, setLoading] = useState(true);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [avatarPath, setAvatarPath] = useState(""); // <- Pfad in Storage
  const [currency, setCurrency] = useState("USD");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Upload
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadMsg, setUploadMsg] = useState("");

  // Security
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePw, setDeletePw] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const providerId = user?.providerData?.[0]?.providerId || "password";

useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (u) => {
    setUser(u || null);
    if (!u) return;

    const snap = await getDoc(doc(db, "users", u.uid));
    const data = snap.exists() ? snap.data() : {};

    // 1) erst einmal Baseline aus Auth/Firestore setzen
    setDisplayName(data.displayName || u.displayName || "");
    setPhotoURL(data.photoURL || u.photoURL || "");
    setAvatarPath(data.avatarPath || ""); 
    setCurrency(data.currency || "USD");

    // 2) Falls ein avatarPath existiert -> sichere frische URL aus Storage holen
    if (data.avatarPath) {
      const fresh = await resolveAvatarFromPath(storage, data.avatarPath);
      if (fresh) setPhotoURL(fresh);
    }

    setLoading(false);
    setOldPw(""); setNewPw(""); setNewPw2("");
  });
  return () => unsub();
}, [auth, db, storage]);

  /* ---------- profile actions ---------- */
// ganz oben bei den Imports ist storage schon vorhanden
async function resolveAvatarFromPath(storage, path) {
  try {
    const ref = storageRef(storage, path);
    return await getDownloadURL(ref);
  } catch (e) {
    console.error("resolveAvatarFromPath error:", e);
    return "";
  }
}

// oben neben den anderen Helpers
function extOf(file) {
  const n = (file?.name || "").toLowerCase();
  const m = n.match(/\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i);
  return m ? m[1].toLowerCase() : "jpg";
}
async function getUrlFromPath(storage, path) {
  try {
    const ref = storageRef(storage, path);
    return await getDownloadURL(ref);
  } catch (e) {
    console.error("getUrlFromPath:", e);
    return "";
  }
}

  async function saveProfile() {
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateProfile(user, { displayName, photoURL: photoURL || null });
      await setDoc(
        doc(db, "users", user.uid),
        { displayName, photoURL: photoURL || "", avatarPath: avatarPath || "", currency },
        { merge: true }
      );
      setProfileMsg("Saved!");
    } catch (e) {
      console.error(e);
      setProfileMsg("Could not save changes.");
    } finally {
      setSavingProfile(false);
      setTimeout(() => setProfileMsg(""), 2400);
    }
  }

async function handleUpload(file) {
  if (!user || !file) return;
  try {
    // Sofortige lokale Vorschau (damit die UI direkt reagiert)
    const localPreview = URL.createObjectURL(file);
    setPhotoURL(localPreview);
    setUploadMsg("");
    setUploadPct(0);

    // eindeutiger Pfad + richtige Endung
    const ext = extOf(file);                           // z.B. "png"
    const path = `avatars/${user.uid}/${Date.now()}.${ext}`;
    const ref  = storageRef(storage, path);

    const task = uploadBytesResumable(ref, file, {
      contentType: file.type || `image/${ext}`,
      cacheControl: "public,max-age=31536000"
    });

    task.on(
      "state_changed",
      (snap) => setUploadPct(Math.round(100 * snap.bytesTransferred / snap.totalBytes)),
      (err) => {
        console.error(err);
        setUploadMsg("Upload failed. Check Storage rules.");
        setTimeout(() => setUploadMsg(""), 3000);
        setUploadPct(0);
      },
      async () => {
        // Frische URL und Pfad persistieren
        const url = await getUrlFromPath(storage, path);
        const busted = url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : "";

        // 1) Lokaler State
        setPhotoURL(busted);
        setAvatarPath(path);

        // 2) Auth & Firestore
        await updateProfile(user, { photoURL: url || null });
        await setDoc(
          doc(db, "users", user.uid),
          { photoURL: url || "", avatarPath: path },     // <- avatarPath WIRD gespeichert
          { merge: true }
        );

        // 3) Auth neu laden, damit onAuthStateChanged künftig korrekte Werte hat
        await auth.currentUser?.reload();

        setUploadPct(0);
        setUploadMsg("Photo updated.");
        setTimeout(() => setUploadMsg(""), 2200);
      }
    );
  } catch (e) {
    console.error(e);
    setUploadMsg("Upload failed unexpectedly.");
    setTimeout(() => setUploadMsg(""), 3000);
    setUploadPct(0);
  }
}


  async function removePhoto() {
    if (!user) return;
    try {
      if (avatarPath) {
        await deleteObject(storageRef(storage, avatarPath)).catch(() => {});
      }
      setPhotoURL("");
      setAvatarPath("");
      await updateProfile(user, { photoURL: null });
      await setDoc(doc(db, "users", user.uid), { photoURL: "", avatarPath: "" }, { merge: true });
      setUploadMsg("Photo removed.");
    } catch (e) {
      console.error(e);
      setUploadMsg("Could not remove photo.");
    } finally {
      setTimeout(() => setUploadMsg(""), 2400);
    }
  }

  /* ---------- password & security ---------- */

  async function changePassword() {
    if (!user) return;
    if (providerId !== "password") {
      setPwMsg("Password is managed by your provider. Use 'Send reset email'.");
      setTimeout(() => setPwMsg(""), 3000);
      return;
    }
    if (!oldPw || !newPw || !newPw2) {
      setPwMsg("Please fill all password fields.");
      setTimeout(() => setPwMsg(""), 2400);
      return;
    }
    if (newPw !== newPw2) {
      setPwMsg("New passwords do not match.");
      setTimeout(() => setPwMsg(""), 2400);
      return;
    }
    setPwBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, oldPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setOldPw(""); setNewPw(""); setNewPw2("");
      setPwMsg("Password changed.");
    } catch (e) {
      console.error(e);
      setPwMsg(e.code === "auth/wrong-password" ? "Current password is incorrect." : "Could not change password.");
    } finally {
      setPwBusy(false);
      setTimeout(() => setPwMsg(""), 3000);
    }
  }

  async function sendReset() {
    if (!user?.email) return;
    try { await sendPasswordResetEmail(auth, user.email); setPwMsg("Reset email sent."); }
    catch (e) { console.error(e); setPwMsg("Could not send reset email."); }
    finally { setTimeout(() => setPwMsg(""), 3000); }
  }

  async function doSignOut() {
    await signOut(auth);
    navigate("/");
  }

  async function doDeleteAccount() {
    if (!user) return;
    if (deleteConfirm.trim().toLowerCase() !== "delete") {
      setPwMsg('Type "DELETE" to confirm.');
      setTimeout(() => setPwMsg(""), 2400);
      return;
    }
    setDeleteBusy(true);
    try {
      if (providerId === "password") {
        if (!deletePw) { setPwMsg("Enter your password to delete the account."); setDeleteBusy(false); return; }
        const cred = EmailAuthProvider.credential(user.email, deletePw);
        await reauthenticateWithCredential(user, cred);
      }
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      setDeleteBusy(false);
      setDeleteOpen(false);
      navigate("/");
    } catch (e) {
      console.error(e);
      setPwMsg("Could not delete account. Try re-logging first.");
      setDeleteBusy(false);
      setTimeout(() => setPwMsg(""), 3000);
    }
  }

  if (loading) return <div style={{ color: theme.sub }}>Loading settings…</div>;

  return (
    <div style={{ padding: "0 8px 28px" }}>
      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: theme.text }}>Account Settings</h1>
        <div style={{ color: theme.sub, marginTop: 4 }}>{user?.email || ""}</div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "inline-flex",
          gap: 6,
          background: dark ? "#202028" : "#f5f7fd",
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          padding: 4,
          marginBottom: 14
        }}
      >
        {["settings", "subscription"].map((key) => {
          const label = key === "settings" ? "Settings" : "Subscription";
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                color: active ? "#fff" : theme.text,
                background: active ? theme.accent : "transparent",
                whiteSpace: "nowrap"
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === "settings" ? (
        <div
          style={{
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            boxShadow: theme.shadow,
            overflow: "hidden"
          }}
        >
          {/* Profile */}
          <SectionHeader theme={theme}>Your Profile</SectionHeader>

          {/* Links ausgerichtet, feste Max-Breite */}
         <div
  style={{
    padding: 18,
    display: "grid",
    justifyItems: "start",
    gap: 16,
    width: "100%",
    maxWidth: 1420,     // länger als vorher
    margin: "0 auto"   // zentriert, bleibt links ausgerichtet
  }}
>
  {/* Profilbild mit Upload/Remove */}
  <div style={{ position: "relative", width: 92, height: 92 }}>
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        overflow: "hidden",
        border: `1px solid ${theme.border}`,
       background: "linear-gradient(135deg, #2c60fa 0%, #e82fa6 100%)",

        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontSize: 36,
        fontWeight: 800
      }}
    >
      {photoURL ? (
        <img src={photoURL} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span>{(displayName || user?.email || "?")[0].toUpperCase()}</span>
      )}
    </div> 

    <label htmlFor="avatarInput" title="Upload new photo" style={fabCam(theme)}>
      <FiCamera />
    </label>
    <input
      id="avatarInput"
      type="file"
      accept="image/*"
      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      style={{ display: "none" }}
    />

    {photoURL && (
      <button title="Remove photo" onClick={removePhoto} style={fabRemove(theme)}>
        <FiTrash2 />
      </button>
    )}
  </div>

  {/* Name */}
  <Field label="Name" theme={theme}>
    <input
      value={displayName}
      onChange={(e) => setDisplayName(e.target.value)}
      placeholder="Your name"
      style={inputStyle(theme)}      // width: 100% => jetzt schöner lang
      autoComplete="name"
    />
  </Field>

  {/* Currency */}
  <Field label="Currency" theme={theme}>
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      style={selectStyle(theme)}     // <— neue Style-Funktion (siehe unten)
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} — {c.label} ({c.code})
        </option>
      ))}
    </select>
  </Field>

  {/* Save */}
  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    <button onClick={saveProfile} disabled={savingProfile} style={primarySubtle(theme, savingProfile)}>
      <FiSave /> Save changes
    </button>
    {(uploadPct > 0 && uploadPct < 100) && <InlineMsg theme={theme} text={`Uploading… ${uploadPct}%`} />}
    {uploadMsg && <InlineMsg theme={theme} text={uploadMsg} />}
    {profileMsg && <InlineMsg theme={theme} text={profileMsg} />}
  </div>
  
</div>
          {/* Password & Security */}
          <SectionHeader theme={theme}>Password & Security</SectionHeader>

          {/* Untereinander + links ausgerichtet */}
          <div style={{ padding: 18, display: "grid", gap: 12, maxWidth: 940 }}>
            {providerId === "password" ? (
              <>
                <div>
                  <Label theme={theme}>Current password</Label>
                  <input
                    type="password"
                    value={oldPw}
                    onChange={(e) => setOldPw(e.target.value)}
                    style={inputStyle(theme)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    name="current-password"
                  />
                </div>
                <div>
                  <Label theme={theme}>New password</Label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    style={inputStyle(theme)}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    name="new-password"
                  />
                </div>
                <div>
                  <Label theme={theme}>Confirm new password</Label>
                  <input
                    type="password"
                    value={newPw2}
                    onChange={(e) => setNewPw2(e.target.value)}
                    style={inputStyle(theme)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    name="confirm-new-password"
                  />
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                  <button onClick={changePassword} disabled={pwBusy} style={neutralBtn(theme, pwBusy)}>
                    <FiShield /> Change password
                  </button>
                  <button onClick={sendReset} style={ghostBtn(theme)}>
                    Send reset email
                  </button>
                  {pwMsg && <InlineMsg theme={theme} text={pwMsg} />}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: theme.sub, fontSize: 14 }}>
                  You signed in with a provider ({providerId}). Password changes are managed by the provider.
                </span>
                <button onClick={sendReset} style={ghostBtn(theme)}>Send reset email</button>
                {pwMsg && <InlineMsg theme={theme} text={pwMsg} />}
              </div>
            )}


            {/* Session controls – einzeilig, keine Icons über Text */}
            <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={doSignOut} style={{ ...neutralOutline(theme), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <FiLogOut /> Sign out
              </button>
              <button onClick={() => setDeleteOpen(true)} style={{ ...dangerSoft(theme), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <FiTrash2 /> Delete account
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            boxShadow: theme.shadow,
            overflow: "hidden"
          }}
        >
          <SectionHeader theme={theme}>Subscription</SectionHeader>
          <div style={{ padding: 16, color: theme.sub }}>
            Manage your plan here. (Hook up to your billing provider.)
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {deleteOpen && (
        <div
          onMouseDown={(e) => e.target === e.currentTarget && setDeleteOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 2000, display: "grid", placeItems: "center" }}
        >
          <div
            style={{
              width: "min(560px, 92vw)",
              background: theme.panel,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 14,
              boxShadow: theme.shadow,
              overflow: "hidden"
            }}
          >
            <div style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ fontWeight: 700 }}>Delete account</div>
              <button onClick={() => setDeleteOpen(false)} style={iconBtn(theme)} aria-label="Close"><FiX /></button>
            </div>

            <div style={{ padding: 14, display: "grid", gap: 12 }}>
              <div style={{ color: theme.sub }}>
                This permanently deletes your account. This action cannot be undone.
              </div>
              {providerId === "password" && (
                <div>
                  <Label theme={theme}>Password (for confirmation)</Label>
                  <input
                    type="password"
                    value={deletePw}
                    onChange={(e) => setDeletePw(e.target.value)}
                    style={inputStyle(theme)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </div>
              )}
              <div>
                <Label theme={theme}>Type DELETE to confirm</Label>
                <input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  style={inputStyle(theme)}
                  placeholder='Type "DELETE"'
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setDeleteOpen(false)} style={ghostBtn(theme)}>Cancel</button>
                <button onClick={doDeleteAccount} disabled={deleteBusy} style={{ ...dangerSoft(theme), whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <FiTrash2 /> {deleteBusy ? "Deleting…" : "Delete account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const primarySubtle = (theme, disabled) => ({
  background: (theme === palette.dark)
    ? "rgba(44,96,250,.16)"
    : "rgba(44,96,250,.12)",
  color: theme.accent,
  border: `1px solid ${theme.accent}`,
  borderRadius: 10,
  padding: "9px 13px",
  fontWeight: 500,           // weniger fett
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.7 : 1,
  whiteSpace: "nowrap"
});

const selectStyle = (theme) => ({
  width: "100%",
  background: theme.input,
  color: theme.text,
  border: `1px solid ${theme.inputBorder}`,
  borderRadius: 12,
  padding: "10px 12px",
  outline: "none",
  fontSize: 15,
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",
  overflow: "hidden"
});


/* ---------- UI helpers ---------- */
function SectionHeader({ children, theme }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${theme.border}`,
        color: theme.sub,
        fontSize: 12,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: 0.6
      }}
    >
      {children}
    </div>
  );
}
function Field({ label, children, theme }) {
  return (
    <div>
      <Label theme={theme}>{label}</Label>
      {children}
    </div>
  );
}
function Label({ children, theme }) {
  return <div style={{ color: theme.sub, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{children}</div>;
}

const inputStyle = (theme) => ({
  width: "100%",
  background: theme.input,
  color: theme.text,
  border: `1px solid ${theme.inputBorder}`,
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
  fontSize: 15
});


const neutralBtn = (theme, disabled) => ({
  background: theme.panel,
  color: theme.text,
  border: `1px solid ${theme.inputBorder}`,
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.8 : 1,
  whiteSpace: "nowrap"
});
const ghostBtn = (theme) => ({
  background: "transparent",
  color: theme.text,
  border: `1px solid ${theme.inputBorder}`,
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap"
});
const neutralOutline = (theme) => ({
  background: "transparent",
  color: theme.text,
  border: `1px solid ${theme.inputBorder}`,
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap"
});
const dangerSoft = (theme) => ({
  background: "rgb(238,106,106)", // dezenter Rotton
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 600,
  cursor: "pointer"
});
const iconBtn = (theme) => ({
  border: "none",
  background: "transparent",
  color: theme.sub,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  width: 32,
  height: 32,
  borderRadius: 8
});


function InlineMsg({ theme, text }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: theme.text,
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        padding: "8px 10px",
        borderRadius: 10,
        fontSize: 13,
        whiteSpace: "nowrap"
      }}
    >
      <FiAlertCircle style={{ color: theme.accent }} />
      {text}
    </span>
  );
}
