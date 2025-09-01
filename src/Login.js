import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
   GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  setPersistence, // <--- hinzufügen!
  browserLocalPersistence,
  browserSessionPersistence
} from "firebase/auth";
import { auth } from "./firebase";
import ReCAPTCHA from "react-google-recaptcha";

// Verbesserte Hilfsfunktion für verständlichere Fehlermeldungen
function friendlyError(err) {
  if (!err || !err.message) return "An unknown error occurred.";
  const code = err.code || err.message;
  if (code.includes("auth/user-not-found")) return "No account with this email found.";
  if (code.includes("auth/wrong-password")) return "Incorrect password. Please try again.";
  if (code.includes("auth/email-already-in-use")) return "This email is already registered.";
  if (code.includes("auth/invalid-email")) return "Please enter a valid email address.";
  if (code.includes("auth/too-many-requests")) return "Too many attempts. Please try again later.";
  if (code.includes("auth/popup-closed-by-user")) return "Login popup closed. Please try again.";
  if (code.includes("auth/popup-blocked")) return "Popup blocked. Please allow popups and try again.";
  if (code.includes("auth/account-exists-with-different-credential")) return "This account exists with a different login method.";
  if (code.includes("auth/missing-email")) return "Please enter your email address.";
  return "Something went wrong. Please try again.";
}

export default function Login() {
  const [mode, setMode] = useState("select"); // select | login | register | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [gifPaused, setGifPaused] = useState(false);
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [resetSent, setResetSent] = useState(false);
 
  const [setCaptchaToken] = useState(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
const [rememberMe, setRememberMe] = useState(false);
const facebookProvider = new FacebookAuthProvider();
  const twitterProvider = new OAuthProvider("twitter.com")
  // Social Login
    const isEmailInvalid = emailTouched && (!email || !/\S+@\S+\.\S+/.test(email));
  const isPasswordInvalid = passwordTouched && password.length < 1;
 const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account" // immer Konto-Auswahl anzeigen!
});

 

  // Dummy-Captcha-Code (für Demo)
  const captchaCode = "A7P2D";
async function handleEmailAuth(e) {
  e.preventDefault();
  setError("");
  setLoading(true);
  try {
    // Persistence setzen JE NACH Zustand der Checkbox!
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
    if (mode === "register") {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/AnalyticsPage");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/AnalyticsPage");
    }
  } catch (err) {
    setError(friendlyError(err));
  }
  setLoading(false);
}

async function handleFacebook() {
  setError("");
  setLoading(true);
  try {
    await signInWithPopup(auth, facebookProvider);
    navigate("/AnalyticsPage");
  } catch (err) {
    setError(friendlyError(err));
  }
  setLoading(false);
}

  async function handleTwitter() {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, twitterProvider);
      navigate("/AnalyticsPage");
    } catch (err) {
      setError(friendlyError(err));
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/AnalyticsPage");
    } catch (err) {
      setError(friendlyError(err));
    }
    setLoading(false);
  }

  

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setResetSent(false);
    setCaptchaError("");
    if (captchaValue.trim().toUpperCase() !== captchaCode) {
      setCaptchaError("Captcha code is incorrect.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      setError(friendlyError(err));
    }
    setLoading(false);
  }

  // Reset State for different modes
  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setPassword("");
    setCaptchaValue("");
    setCaptchaError("");
    setResetSent(false);
  }

 return (
    <div className="min-h-screen w-full flex bg-black text-white">
      {/* Left Panel: Infinite Tech GIF */}
      <div className="hidden md:flex md:w-1/2 h-screen relative overflow-hidden p-4">
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg">
          <img
            src="/loop.gif"
            alt="Fusion Reactor Animation"
            className={`w-full h-full object-cover object-center opacity-70 transition-all duration-300 ${gifPaused ? 'opacity-30 grayscale' : ''}`}
            style={{ maxHeight: "100vh", borderRadius: "1.5rem" }}
            draggable={false}
            {...(gifPaused ? { style: { ...{ maxHeight: "100vh", borderRadius: "1.5rem" }, filter: "grayscale(100%) blur(2px)", opacity: 0.3 } } : {})}
          />
          {/* Pause Button unten links */}
         <button
  className="absolute left-4 bottom-4 bg-black bg-opacity-60 hover:bg-opacity-90 text-white rounded-full shadow-lg transition z-20 flex items-center justify-center"
  style={{ width: 48, height: 48 }} // Button bleibt immer 48x48px, egal wie groß das Icon ist
  onClick={() => setGifPaused(p => !p)}
  title={gifPaused ? "Play animation" : "Pause animation"}
>
  {gifPaused ? (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
         stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5 3v18l15-9L5 3z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
         stroke="currentColor" className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 9v6m4-6v6" />
    </svg>
  )}
</button>

          <div className="absolute bottom-8 left-0 w-full text-center z-10">
            <h2 className="text-2xl font-bold tracking-wide drop-shadow-xl select-none">Insights. Every Trade. Every Time.</h2>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Content */}
      <div className="flex flex-1 flex-col items-center justify-center min-h-screen px-4 relative">
        {/* Logo und X Button */}
   <div className="absolute top-3 left-0 w-full flex justify-center items-center gap-4 mt-8">
  <img
    src="/logo.png"
    alt="Acardia Logo"
    className="w-11 h-11 object-contain"
    style={{ aspectRatio: "1/1" }}
  />
  <span className="text-2xl font-bold tracking-tight select-none" style={{ letterSpacing: "0.02em" }}>
    Acardia Journal
  </span>
</div>


{/* X-Button */}
<button
  className="absolute right-8"
  style={{
    top: 30,
    width: 58,
    height: 58,
    borderRadius: "50%",
    background: "transparent",
    color: "white",
    fontSize: "2.9rem",
    lineHeight: "1",
    fontWeight: "semibold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    border: "none",
    outline: "none",
  }}
  onClick={() => window.location.href = "/"}
  title="Close"
>
  ×
</button>

        {/* Login-Box */}
        <div className="w-full max-w-md bg-black bg-opacity-70 rounded-2xl shadow-2xl p-8 mt-16">
          {/* Socials oder Login/Register oder Forgot */}
          {mode === "select" && (
            <>
              <h1 className="text-2xl font-bold text-center mb-8 mt-4 tracking-tight">Sign in</h1>
              <div className="flex flex-col gap-3 mb-5">
                <button
                  onClick={handleGoogle}
                  className="flex items-center justify-center gap-3 border border-gray-700 rounded-lg py-2 text-base font-medium hover:bg-gray-800 transition"
                  type="button"
                >
                  <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" alt="" className="w-5 h-5" />
                  Sign with Google
                </button>
                <button
                  onClick={handleFacebook}
                  className="flex items-center justify-center gap-3 border border-gray-700 rounded-lg py-2 text-base font-medium hover:bg-gray-800 transition"
                  type="button"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="" className="w-5 h-5" />
                  Sign with Facebook
                </button>
                <button
                  onClick={handleTwitter}
                  className="flex items-center justify-center gap-3 border border-gray-700 rounded-lg py-2 text-base font-medium hover:bg-gray-800 transition"
                  type="button"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/33/X_logo-white.png" alt="" className="w-5 h-5" />
                  Sign with X
                </button>
              </div>
              <div className="flex items-center my-5">
                <div className="flex-grow border-t border-gray-800"></div>
                <span className="mx-3 text-xs text-gray-500">or</span>
                <div className="flex-grow border-t border-gray-800"></div>
              </div>
              <button
                onClick={() => switchMode("login")}
                className="flex items-center justify-center gap-2 border border-gray-700 rounded-lg py-2 text-base font-medium hover:bg-gray-800 w-full mb-2 transition"
                type="button"
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 5A2.5 2.5 0 0 1 5 2.5h10A2.5 2.5 0 0 1 17.5 5v10A2.5 2.5 0 0 1 15 17.5H5A2.5 2.5 0 0 1 2.5 15V5Z" stroke="#8da1b9" strokeWidth="2"/><path d="M5.833 8.333h8.334M5.833 11.667h5" stroke="#8da1b9" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Sign in with email
              </button>
              <div className="mt-7 text-center text-gray-500 text-sm">
                Do not have an account?{" "}
                <button className="text-blue-400 hover:underline" onClick={() => switchMode("register")}>Sign up</button>
              </div>
            </>
          )}

          {/* E-Mail Login */}
          {mode === "login" && (
            <>
              <h1 className="text-2xl font-bold text-center mb-8 mt-4">Sign in with email</h1>
              <form onSubmit={handleEmailAuth} className="flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="email">Email or Username</label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-blue-900 text-white rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-blue-900 text-white rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl text-gray-400 hover:text-gray-200"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        // Sichtbares Auge (Eye Open)
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5-9 9-9 9s-9-4-9-9 9-9 9-9 9 4 9 9z" /></svg>
                      ) : (
                        // Durchgestrichenes Auge (Eye Off)
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.088 0 2.136.174 3.125.5m5.292 4.292A9.977 9.977 0 0121 12c0 3-4 7-9 7a9.978 9.978 0 01-7.293-2.708M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5-9 9-9 9s-9-4-9-9a9.978 9.978 0 017.293-2.708" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-xs text-blue-400 hover:underline"
                    onClick={() => switchMode("forgot")}
                  >
                    I forgot password or can't sign in
                  </button>
                 <label className="inline-flex items-center text-xs">
  <input
    type="checkbox"
    className="form-checkbox accent-blue-500 mr-2"
    checked={rememberMe}
    onChange={e => setRememberMe(e.target.checked)}
  />
  Remember me
</label>

                </div>
                <button
                  disabled={loading}
                  className="w-full mt-3 py-3 bg-white text-black text-base rounded-lg font-semibold hover:bg-gray-100 transition"
                  type="submit"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>
              {error && (
                <div className="text-center mt-4 text-base text-red-400 font-medium">
                  Error: {error}
                </div>
              )}
              <div className="mt-8 text-center text-gray-500 text-sm">
                Do not have an account?{" "}
                <button className="text-blue-400 hover:underline" onClick={() => switchMode("register")}>Sign up</button>
              </div>
            </>
          )}

          {mode === "register" && (
  <>
    <h1 className="text-2xl font-bold text-center mb-8 mt-4 text-white">
      Sign up with email
    </h1>
    <form onSubmit={handleEmailAuth} className="flex flex-col items-center gap-7 w-full max-w-sm mx-auto">
      {/* EMAIL */}
      <div className="w-full">
        <label className="block text-base font-medium mb-1 text-white" htmlFor="regemail">
          Email
        </label>
        <div className="relative">
          <input
            id="regemail"
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onBlur={() => setEmailTouched(true)}
            onChange={e => setEmail(e.target.value)}
            className={`w-full px-4 py-3 rounded-lg text-base bg-black border text-white focus:outline-none transition
              ${isEmailInvalid ? "border-red-500 focus:ring-2 focus:ring-red-600" : "border-neutral-500 focus:ring-2 focus:ring-blue-600"}
              pl-10
            `}
          />
          {/* E-Mail-Icon */}
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-gray-400 pointer-events-none">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M3 7.5v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z"/><path stroke="currentColor" strokeWidth="2" d="m3.75 7.5 7.984 6.518a2 2 0 0 0 2.531 0L22.25 7.5"/></svg>
          </span>
        </div>
        {isEmailInvalid && (
          <p className="text-sm text-red-500 mt-1 ml-1">Please enter a valid email address</p>
        )}
      </div>
      {/* PASSWORT */}
      <div className="w-full">
        <label className="block text-base font-medium mb-1 text-white" htmlFor="regpassword">
          Password
        </label>
        <div className="relative">
          <input
            id="regpassword"
            type={showPassword ? "text" : "password"}
            required
            placeholder="Password"
            value={password}
            onBlur={() => setPasswordTouched(true)}
            onChange={e => setPassword(e.target.value)}
            className={`w-full px-4 py-3 rounded-lg text-base bg-black border text-white focus:outline-none pr-10 transition
              ${isPasswordInvalid ? "border-red-500 focus:ring-2 focus:ring-red-600" : "border-neutral-500 focus:ring-2 focus:ring-blue-600"}
            `}
          />
          {/* Auge */}
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl text-gray-400 hover:text-gray-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              // Auge offen
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5-9 9-9 9s-9-4-9-9 9-9 9-9 9 4 9 9z" /></svg>
            ) : (
              // Auge zu
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.088 0 2.136.174 3.125.5m5.292 4.292A9.977 9.977 0 0121 12c0 3-4 7-9 7a9.978 9.978 0 01-7.293-2.708M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5-9 9-9 9s-9-4-9-9a9.978 9.978 0 017.293-2.708" /></svg>
            )}
          </button>
        </div>
        {isPasswordInvalid && (
          <p className="text-sm text-red-500 mt-1 ml-1">This field is required</p>
        )}
      </div>
      {/* CAPTCHA */}
      <div className="w-full flex justify-center mb-2">
        <ReCAPTCHA
          sitekey="DEIN_SITE_KEY_HIER"
          theme="dark"
          onChange={token => setCaptchaValue(token)}
        />
      </div>
      {/* Error von Firebase */}
      {error && (
        <div className="w-full text-left text-red-400 font-medium text-base mb-2">
          Error: {error}
        </div>
      )}
      {/* BUTTON */}
      <button
        type="submit"
        className="w-full py-3 bg-white text-black text-lg font-semibold rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading || isEmailInvalid || isPasswordInvalid || !captchaValue}
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
    <div className="mt-8 text-center text-gray-500 text-sm">
      Already have an account?{" "}
      <button className="text-blue-400 hover:underline" onClick={() => switchMode("login")}>
        Sign in
      </button>
    </div>
  </>
)}
 {mode === "forgot" && (
  <>
    <h1 className="text-2xl font-bold text-center mb-8 mt-4">Find your account</h1>
    {resetSent ? (
      <div className="text-center text-green-400 font-semibold mb-6">
        A reset link was sent to your email.
      </div>
    ) : (
      <form onSubmit={handleReset} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="forgotemail">
            Email address
          </label>
          <input
            id="forgotemail"
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-black border border-blue-900 text-white rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="recaptcha">
            Please solve the captcha
          </label>
          <ReCAPTCHA
            sitekey="6LeUdZgrAAAAAMRAZf5F1WtTlm7WCDG_IhTK948k" // <-- DEIN KEY HIER!
            onChange={token => setCaptchaToken(token)}
            theme="dark"
          />
          {captchaError && (
            <div className="text-center mt-2 text-base text-red-400 font-medium">
              {captchaError}
            </div>
          )}
        </div>
        <button
          className="w-full mt-3 py-3 bg-white text-black text-base rounded-lg font-semibold hover:bg-gray-100 transition"
          type="submit"
          disabled={loading}
        >
          {loading ? "Sending link..." : "Send link"}
        </button>
      </form>
    )}
    {error && (
      <div className="text-center mt-4 text-base text-red-400 font-medium">
        Error: {error}
      </div>
    )}
    <div className="mt-8 text-center text-gray-500 text-sm">
      Already have an account?{" "}
      <button className="text-blue-400 hover:underline" onClick={() => switchMode("login")}>
        Sign in
      </button>
    </div>
  </>
)}



      </div>
    </div>
  </div>
);
}
