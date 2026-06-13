import { useMemo, useState, useEffect } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  login,
  requestPasswordReset,
  resetPassword,
} from "../../services/auth";
import { useLanguage } from "../../contexts/LanguageContext";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export default function LoginPage({ onLoginSuccess }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regRole, setRegRole] = useState(""); // Ahora inicia vacío, se llena con la DB

  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 NUEVO: Estado para almacenar los roles de la base de datos
  const [dbRoles, setDbRoles] = useState([]);

  // 🔥 NUEVO: Cargar los roles de Neon al montar la pantalla de Login
  useEffect(() => {
    fetch(`${API_BASE}/api/roles`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          setDbRoles(data.data);
          // Si hay roles, seleccionamos el primero por defecto para que el select no quede en blanco
          if (data.data.length > 0) {
            setRegRole(data.data[0].id.toString());
          }
        }
      })
      .catch((err) => console.error("Error cargando roles desde la BD:", err));
  }, []);

  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";

  const loginEmailError = getEmailError(email, t);
  const loginPasswordError = password ? "" : t("login.validation.passwordRequired");

  const regNameError = getNameError(regFullName, t);
  const regEmailError = getEmailError(regEmail, t);
  const regPasswordError = getPasswordError(regPassword, t);
  const regConfirmError =
    regConfirm && regPassword !== regConfirm
      ? t("login.validation.passwordsMismatch")
      : "";

  const resetEmailError = getEmailError(resetEmail, t);
  const resetCodeError = getCodeError(resetCode, t);
  const resetPasswordError = getPasswordError(resetNewPassword, t);
  const resetConfirmError =
    resetConfirm && resetNewPassword !== resetConfirm
      ? t("login.validation.passwordsMismatch")
      : "";

  const regPasswordStrength = usePasswordStrength(regPassword, t);
  const resetPasswordStrength = usePasswordStrength(resetNewPassword, t);

  const switchMode = (nextMode) => {
    if (loading) return;

    setMode(nextMode);
    setError("");
    setSuccess("");
    setTouched({});

    if (nextMode === "forgot") {
      setResetEmail(email);
      setResetCode("");
      setResetNewPassword("");
      setResetConfirm("");
    }
  };

  const markTouched = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  async function handleLogin(e) {
    e.preventDefault();

    setTouched({ email: true, password: true });
    setError("");
    setSuccess("");

    if (loginEmailError || loginPasswordError) {
      setError(t("login.errors.fixFields"));
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err) {
      setError(
        err.message ||
          t("login.errors.invalidCredentials")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();

    setTouched({
      regFullName: true,
      regEmail: true,
      regPassword: true,
      regConfirm: true,
    });

    setError("");
    setSuccess("");

    if (regNameError || regEmailError || regPasswordError || regConfirmError) {
      setError(t("login.errors.fixFieldsRegister"));
      return;
    }

    const cleanFullName = regFullName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();

    setLoading(true);

    try {
      // 🔥 NUEVO: Enviar role_id como número, no como texto
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: cleanFullName,
          email: cleanEmail,
          password: regPassword,
          role_id: regRole ? Number(regRole) : null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.detail ?? t("login.errors.registerFailed"));
        return;
      }

      setSuccess(t("login.success.accountCreated"));
      setTouched({});
      setRegFullName("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirm("");

      setTimeout(() => {
        setEmail(data?.data?.email || cleanEmail);
        switchMode("login");
      }, 1400);
    } catch {
      setError(t("login.errors.connectionError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e?.preventDefault();

    setTouched({ resetEmail: true });
    setError("");
    setSuccess("");

    if (resetEmailError) {
      setError(t("login.errors.validEmailRequired"));
      return;
    }

    setLoading(true);

    try {
      const payload = await requestPasswordReset(resetEmail.trim().toLowerCase());
      setSuccess(payload.message || t("login.success.codeSentIfExists"));
      setMode("reset");
      setTouched({});
    } catch (err) {
      setError(err.message || t("login.errors.codeSendFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();

    setTouched({
      resetCode: true,
      resetNewPassword: true,
      resetConfirm: true,
    });

    setError("");
    setSuccess("");

    if (resetCodeError || resetPasswordError || resetConfirmError) {
      setError(t("login.errors.fixResetFields"));
      return;
    }

    setLoading(true);

    try {
      await resetPassword(
        resetEmail.trim().toLowerCase(),
        resetCode.trim(),
        resetNewPassword
      );

      setSuccess(t("login.success.passwordUpdated"));
      setTouched({});
      setEmail(resetEmail.trim().toLowerCase());
      setPassword("");
      setResetCode("");
      setResetNewPassword("");
      setResetConfirm("");

      setTimeout(() => {
        switchMode("login");
      }, 1500);
    } catch (err) {
      setError(err.message || t("login.errors.passwordUpdateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020817] px-4 py-5 text-white">
      <style>{`
        @keyframes wellqFadeIn {
          from { opacity: 0; transform: translate3d(0, 8px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }

        .wellq-fade-in {
          animation: wellqFadeIn 200ms ease-out both;
        }

        .wellq-control {
          color-scheme: dark;
        }

        .wellq-control:-webkit-autofill,
        .wellq-control:-webkit-autofill:hover,
        .wellq-control:-webkit-autofill:focus,
        .wellq-control:-webkit-autofill:active {
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0 1000px #0b1423 inset !important;
          box-shadow: 0 0 0 1000px #0b1423 inset !important;
          border-color: rgba(103, 232, 249, 0.4) !important;
          transition: background-color 9999s ease-in-out 0s;
          font-size: 14px !important;
          line-height: 20px !important;
        }

        .wellq-select option {
          background: #0b1423;
          color: #ffffff;
        }

        .wellq-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .wellq-scrollbar:hover {
          scrollbar-color: rgba(34, 211, 238, 0.3) transparent;
        }

        .wellq-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .wellq-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .wellq-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(34, 211, 238, 0);
          border-radius: 10px;
        }
        
        .wellq-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(34, 211, 238, 0.3);
        }
        
        .wellq-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(34, 211, 238, 0.6);
        }

        @media (prefers-reduced-motion: reduce) {
          .wellq-fade-in {
            animation: none;
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.05)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="pointer-events-none absolute left-[-150px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/18 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-130px] right-[-120px] h-[380px] w-[380px] rounded-full bg-blue-600/18 blur-[125px]" />

      <div className="relative isolate w-full max-w-[800px] overflow-hidden rounded-[14px] border border-cyan-300/30 bg-[#07101d]/95 shadow-[0_0_38px_rgba(34,211,238,.22),0_24px_80px_rgba(0,0,0,.62)] backdrop-blur-2xl md:h-[490px]">
        <div className="hidden h-full grid-cols-2 md:grid">
          
          <section key={`desktop-left-${mode}`} className="flex h-full items-center justify-center px-8 py-6 min-h-0">
            {isLogin && (
              <LoginForm
                email={email}
                password={password}
                setEmail={setEmail}
                setPassword={setPassword}
                showPassword={showLoginPassword}
                setShowPassword={setShowLoginPassword}
                touched={touched}
                markTouched={markTouched}
                emailError={loginEmailError}
                passwordError={loginPasswordError}
                error={error}
                success={success}
                loading={loading}
                handleLogin={handleLogin}
                switchMode={switchMode}
              />
            )}

            {isForgot && (
              <ForgotPasswordForm
                resetEmail={resetEmail}
                setResetEmail={setResetEmail}
                touched={touched}
                markTouched={markTouched}
                emailError={resetEmailError}
                error={error}
                success={success}
                loading={loading}
                handleForgotPassword={handleForgotPassword}
                switchMode={switchMode}
              />
            )}

            {isReset && (
              <ResetPasswordForm
                resetEmail={resetEmail}
                resetCode={resetCode}
                resetNewPassword={resetNewPassword}
                resetConfirm={resetConfirm}
                setResetCode={setResetCode}
                setResetNewPassword={setResetNewPassword}
                setResetConfirm={setResetConfirm}
                showPassword={showResetPassword}
                setShowPassword={setShowResetPassword}
                showConfirm={showResetConfirm}
                setShowConfirm={setShowResetConfirm}
                touched={touched}
                markTouched={markTouched}
                codeError={resetCodeError}
                passwordError={resetPasswordError}
                confirmError={resetConfirmError}
                passwordStrength={resetPasswordStrength}
                error={error}
                success={success}
                loading={loading}
                handleResetPassword={handleResetPassword}
                handleForgotPassword={handleForgotPassword}
                switchMode={switchMode}
              />
            )}
          </section>

          <section key={`desktop-right-${mode}`} className="flex h-full items-center justify-center px-8 py-6 min-h-0">
            {isRegister && (
              <RegisterForm
                regFullName={regFullName}
                regEmail={regEmail}
                regPassword={regPassword}
                regConfirm={regConfirm}
                regRole={regRole}
                setRegFullName={setRegFullName}
                setRegEmail={setRegEmail}
                setRegPassword={setRegPassword}
                setRegConfirm={setRegConfirm}
                setRegRole={setRegRole}
                showPassword={showRegPassword}
                setShowPassword={setShowRegPassword}
                showConfirm={showRegConfirm}
                setShowConfirm={setShowRegConfirm}
                touched={touched}
                markTouched={markTouched}
                nameError={regNameError}
                emailError={regEmailError}
                passwordError={regPasswordError}
                confirmError={regConfirmError}
                passwordStrength={regPasswordStrength}
                error={error}
                success={success}
                loading={loading}
                handleRegister={handleRegister}
                switchMode={switchMode}
                dbRoles={dbRoles} // 🔥 Pasamos los roles al formulario
              />
            )}
          </section>
        </div>

        <MovingPanel mode={mode} loading={loading} switchMode={switchMode} />

        <div className="md:hidden">
          <MobilePanel mode={mode} loading={loading} switchMode={switchMode} />

          <section key={`mobile-section-${mode}`} className="flex h-[calc(100vh-250px)] items-center justify-center px-6 py-5 min-h-0">
            {isLogin && (
              <LoginForm
                email={email}
                password={password}
                setEmail={setEmail}
                setPassword={setPassword}
                showPassword={showLoginPassword}
                setShowPassword={setShowLoginPassword}
                touched={touched}
                markTouched={markTouched}
                emailError={loginEmailError}
                passwordError={loginPasswordError}
                error={error}
                success={success}
                loading={loading}
                handleLogin={handleLogin}
                switchMode={switchMode}
              />
            )}

            {isRegister && (
              <RegisterForm
                regFullName={regFullName}
                regEmail={regEmail}
                regPassword={regPassword}
                regConfirm={regConfirm}
                regRole={regRole}
                setRegFullName={setRegFullName}
                setRegEmail={setRegEmail}
                setRegPassword={setRegPassword}
                setRegConfirm={setRegConfirm}
                setRegRole={setRegRole}
                showPassword={showRegPassword}
                setShowPassword={setShowRegPassword}
                showConfirm={showRegConfirm}
                setShowConfirm={setShowRegConfirm}
                touched={touched}
                markTouched={markTouched}
                nameError={regNameError}
                emailError={regEmailError}
                passwordError={regPasswordError}
                confirmError={regConfirmError}
                passwordStrength={regPasswordStrength}
                error={error}
                success={success}
                loading={loading}
                handleRegister={handleRegister}
                switchMode={switchMode}
                dbRoles={dbRoles} // 🔥 Pasamos los roles al formulario en vista móvil
              />
            )}

            {isForgot && (
              <ForgotPasswordForm
                resetEmail={resetEmail}
                setResetEmail={setResetEmail}
                touched={touched}
                markTouched={markTouched}
                emailError={resetEmailError}
                error={error}
                success={success}
                loading={loading}
                handleForgotPassword={handleForgotPassword}
                switchMode={switchMode}
              />
            )}

            {isReset && (
              <ResetPasswordForm
                resetEmail={resetEmail}
                resetCode={resetCode}
                resetNewPassword={resetNewPassword}
                resetConfirm={resetConfirm}
                setResetCode={setResetCode}
                setResetNewPassword={setResetNewPassword}
                setResetConfirm={setResetConfirm}
                showPassword={showResetPassword}
                setShowPassword={setShowResetPassword}
                showConfirm={showResetConfirm}
                setShowConfirm={setShowResetConfirm}
                touched={touched}
                markTouched={markTouched}
                codeError={resetCodeError}
                passwordError={resetPasswordError}
                confirmError={resetConfirmError}
                passwordStrength={resetPasswordStrength}
                error={error}
                success={success}
                loading={loading}
                handleResetPassword={handleResetPassword}
                handleForgotPassword={handleForgotPassword}
                switchMode={switchMode}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MovingPanel({ mode, loading, switchMode }) {
  const { t } = useLanguage();
  const isRegister = mode === "register";
  const isRecovery = mode === "forgot" || mode === "reset";
  const panelOnRight = !isRegister;
  const title = isRecovery
    ? t("login.movingPanel.recoverAccessTitle")
    : mode === "login"
      ? t("login.movingPanel.welcomeBackTitle")
      : t("login.movingPanel.welcomeTitle");
  const [titleFirst, ...titleRest] = title.split(" ");

  return (
    <aside
      className={`
        absolute inset-y-0 left-0 z-20 hidden w-[56%] transform-gpu overflow-hidden
        bg-gradient-to-br from-cyan-300 via-cyan-500 to-blue-600
        transition-[transform,clip-path] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]
        md:flex
        ${panelOnRight ? "translate-x-[78.6%]" : "translate-x-0"}
      `}
      style={{
        clipPath: panelOnRight
          ? "polygon(0 0, 100% 0, 100% 100%, 25% 100%)"
          : "polygon(0 0, 100% 0, 75% 100%, 0 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(224,255,255,.22),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,.10),transparent_34%,rgba(37,99,235,.18))]" />
      <div className="pointer-events-none absolute inset-0 bg-cyan-950/5" />

      <div
        className={`
          relative z-10 flex h-full w-full flex-col justify-between py-9
          ${panelOnRight ? "pl-[118px] pr-9" : "pl-9 pr-[118px]"}
        `}
      >
        <div>
          <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-xl bg-white/12 backdrop-blur">
            {isRecovery ? (
              <KeyRound className="h-5 w-5 text-cyan-50" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-cyan-50" />
            )}
          </div>

          <h1 key={`title-${mode}`} className="max-w-[250px] text-[38px] font-black leading-[1.06] tracking-tight text-white">
            {titleRest.length > 0 ? (
              <>
                {titleFirst} <br />
                {titleRest.join(" ")}
              </>
            ) : title}
          </h1>

          <p key={`desc-${mode}`} className="mt-5 max-w-[260px] text-sm font-medium leading-6 text-cyan-50/90">
            {isRecovery
              ? t("login.movingPanel.recoverDesc")
              : mode === "login"
                ? t("login.movingPanel.loginDesc")
                : t("login.movingPanel.registerDesc")}
          </p>
        </div>

        <button
          key={`btn-${mode}`}
          type="button"
          disabled={loading}
          onClick={() => switchMode(mode === "register" ? "login" : "register")}
          className="h-10 w-full rounded-full border border-white/30 bg-white/10 text-sm font-bold text-white backdrop-blur transition duration-200 hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "register" ? t("login.movingPanel.loginButton") : t("login.movingPanel.registerButton")}
        </button>
      </div>
    </aside>
  );
}

function MobilePanel({ mode, loading, switchMode }) {
  const { t } = useLanguage();
  const isRecovery = mode === "forgot" || mode === "reset";
  const title = isRecovery
    ? t("login.movingPanel.recoverAccessTitle")
    : mode === "login"
      ? t("login.movingPanel.welcomeBackTitle")
      : t("login.movingPanel.welcomeTitle");

  return (
    <aside className="relative overflow-hidden bg-gradient-to-br from-cyan-300 via-cyan-500 to-blue-600 px-6 py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(224,255,255,.2),transparent_30%)]" />

      <div className="relative z-10">
        <h1 key={`title-mobile-${mode}`} className="text-3xl font-black leading-tight text-white">
          {title}
        </h1>

        <button
          key={`btn-mobile-${mode}`}
          type="button"
          disabled={loading}
          onClick={() => switchMode(mode === "register" ? "login" : "register")}
          className="mt-5 h-10 w-full rounded-full border border-white/30 bg-white/10 text-sm font-bold text-white backdrop-blur transition hover:bg-white/18 disabled:opacity-60"
        >
          {mode === "register" ? t("login.movingPanel.loginButton") : t("login.movingPanel.registerButton")}
        </button>
      </div>
    </aside>
  );
}

function LoginForm({
  email,
  password,
  setEmail,
  setPassword,
  showPassword,
  setShowPassword,
  touched,
  markTouched,
  emailError,
  passwordError,
  error,
  success,
  loading,
  handleLogin,
  switchMode,
}) {
  const { t } = useLanguage();

  return (
    <div className="wellq-fade-in flex flex-col w-full h-full max-h-full max-w-[270px] transform-gpu text-center min-h-0">
      <div className="shrink-0 text-left">
        <FormHeader title={t("login.form.loginTitle")} subtitle={t("login.form.loginSubtitle")} />
      </div>
      
      <div className="flex-1 overflow-y-auto pr-3 wellq-scrollbar min-h-0 text-left">
        <div className="space-y-3 pb-2 pt-1">
          <FormStatus error={error} success={success} />

          <form onSubmit={handleLogin} className="space-y-3" noValidate>
            <Control
              id="login-email"
              label={t("login.form.emailLabel")}
              icon={Mail}
              type="email"
              name="email"
              autoComplete="email"
              placeholder={t("login.form.emailPlaceholder")}
              value={email}
              onBlur={() => markTouched("email")}
              onChange={(e) => setEmail(e.target.value)}
              error={touched.email ? emailError : ""}
              required
            />

            <PasswordControl
              id="login-password"
              label={t("login.form.passwordLabel")}
              name="password"
              autoComplete="current-password"
              placeholder={t("login.form.passwordPlaceholder")}
              value={password}
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              onBlur={() => markTouched("password")}
              onChange={(e) => setPassword(e.target.value)}
              error={touched.password ? passwordError : ""}
              required
            />

            <SubmitButton loading={loading} loadingText={t("login.form.loginLoading")}>
              {t("login.form.loginSubmit")}
            </SubmitButton>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">
            {t("login.form.noAccountText")}
            <button
              type="button"
              onClick={() => switchMode("register")}
              className="font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              {t("login.form.registerLink")}
            </button>
          </p>

          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="mt-3 text-xs font-semibold text-cyan-300 transition hover:text-cyan-200 w-full text-center"
          >
            {t("login.form.forgotPasswordLink")}
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterForm({
  regFullName,
  regEmail,
  regPassword,
  regConfirm,
  regRole,
  setRegFullName,
  setRegEmail,
  setRegPassword,
  setRegConfirm,
  setRegRole,
  showPassword,
  setShowPassword,
  showConfirm,
  setShowConfirm,
  touched,
  markTouched,
  nameError,
  emailError,
  passwordError,
  confirmError,
  passwordStrength,
  error,
  success,
  loading,
  handleRegister,
  switchMode,
  dbRoles, // 🔥 Recibimos los roles reales
}) {
  const { t } = useLanguage();

  return (
    <div className="wellq-fade-in flex flex-col w-full h-full max-h-full max-w-[270px] transform-gpu min-h-0">
      <div className="shrink-0">
        <FormHeader title={t("login.form.registerTitle")} subtitle={t("login.form.registerSubtitle")} compact />
      </div>

      <div className="flex-1 overflow-y-auto pr-3 wellq-scrollbar min-h-0">
        <div className="space-y-2 pb-2 pt-1">
          <FormStatus error={error} success={success} />

          <form onSubmit={handleRegister} className="space-y-2" noValidate>
            <Control
              id="register-name"
              label={t("login.form.fullNameLabel")}
              icon={User}
              type="text"
              name="full_name"
              autoComplete="name"
              placeholder={t("login.form.fullNamePlaceholder")}
              value={regFullName}
              onBlur={() => markTouched("regFullName")}
              onChange={(e) => setRegFullName(e.target.value)}
              error={touched.regFullName ? nameError : ""}
              compact
              required
            />

            <Control
              id="register-email"
              label={t("login.form.emailLabel")}
              icon={Mail}
              type="email"
              name="register_email"
              autoComplete="email"
              placeholder={t("login.form.emailPlaceholder")}
              value={regEmail}
              onBlur={() => markTouched("regEmail")}
              onChange={(e) => setRegEmail(e.target.value)}
              error={touched.regEmail ? emailError : ""}
              compact
              required
            />

            {/* 🔥 Actualizamos SelectControl para que acepte las opciones dinámicas */}
            <SelectControl
              id="register-role"
              label={t("login.form.roleLabel")}
              value={regRole}
              onChange={(e) => setRegRole(e.target.value)}
              options={dbRoles} 
              compact
            />

            <PasswordControl
              id="register-password"
              label={t("login.form.passwordLabel")}
              name="new_password"
              autoComplete="new-password"
              placeholder={t("login.form.passwordPlaceholder")}
              value={regPassword}
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              onBlur={() => markTouched("regPassword")}
              onChange={(e) => setRegPassword(e.target.value)}
              error={touched.regPassword ? passwordError : ""}
              compact
              required
            />

            <PasswordStrength strength={passwordStrength} />

            <PasswordControl
              id="register-confirm"
              label={t("login.form.confirmPasswordLabel")}
              name="confirm_password"
              autoComplete="new-password"
              placeholder={t("login.form.confirmPasswordPlaceholder")}
              value={regConfirm}
              visible={showConfirm}
              onToggle={() => setShowConfirm((value) => !value)}
              onBlur={() => markTouched("regConfirm")}
              onChange={(e) => setRegConfirm(e.target.value)}
              error={touched.regConfirm ? confirmError : ""}
              compact
              required
            />

            <SubmitButton loading={loading} loadingText={t("login.form.registerLoading")}>
              {t("login.form.registerSubmit")}
            </SubmitButton>
          </form>

          <p className="mt-3 text-center text-xs text-slate-400 pb-1">
            {t("login.form.hasAccountText")}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              {t("login.form.loginLink")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordForm({
  resetEmail,
  setResetEmail,
  touched,
  markTouched,
  emailError,
  error,
  success,
  loading,
  handleForgotPassword,
  switchMode,
}) {
  const { t } = useLanguage();

  return (
    <div className="wellq-fade-in flex flex-col w-full h-full max-h-full max-w-[270px] transform-gpu min-h-0">
      <div className="shrink-0">
        <FormHeader
          title={t("login.form.forgotTitle")}
          subtitle={t("login.form.forgotSubtitle")}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto pr-3 wellq-scrollbar min-h-0">
        <div className="space-y-3 pb-2 pt-1">
          <FormStatus error={error} success={success} />

          <form onSubmit={handleForgotPassword} className="space-y-3" noValidate>
            <Control
              id="reset-email"
              label={t("login.form.emailLabel")}
              icon={Mail}
              type="email"
              name="reset_email"
              autoComplete="email"
              placeholder={t("login.form.emailPlaceholder")}
              value={resetEmail}
              onBlur={() => markTouched("resetEmail")}
              onChange={(e) => setResetEmail(e.target.value)}
              error={touched.resetEmail ? emailError : ""}
              required
            />

            <SubmitButton loading={loading} loadingText={t("login.form.sendLoading")}>
              <span className="inline-flex items-center gap-2">
                <Send className="h-4 w-4" />
                {t("login.form.sendCodeSubmit")}
              </span>
            </SubmitButton>
          </form>

          <button
            type="button"
            onClick={() => switchMode("login")}
            className="mt-5 flex w-full items-center justify-center gap-2 text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("login.form.backToLogin")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordForm({
  resetEmail,
  resetCode,
  resetNewPassword,
  resetConfirm,
  setResetCode,
  setResetNewPassword,
  setResetConfirm,
  showPassword,
  setShowPassword,
  showConfirm,
  setShowConfirm,
  touched,
  markTouched,
  codeError,
  passwordError,
  confirmError,
  passwordStrength,
  error,
  success,
  loading,
  handleResetPassword,
  handleForgotPassword,
  switchMode,
}) {
  const { t } = useLanguage();

  return (
    <div className="wellq-fade-in flex flex-col w-full h-full max-h-full max-w-[270px] transform-gpu min-h-0">
      <div className="shrink-0">
        <FormHeader
          title={t("login.form.resetTitle")}
          subtitle={t("login.form.resetSubtitle", { email: resetEmail || t("login.form.resetEmailFallback") })}
          compact
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-3 wellq-scrollbar min-h-0">
        <div className="space-y-2 pb-2 pt-1">
          <FormStatus error={error} success={success} />

          <form onSubmit={handleResetPassword} className="space-y-2.5" noValidate>
            <Control
              id="reset-code"
              label={t("login.form.codeLabel")}
              icon={KeyRound}
              type="text"
              name="reset_code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("login.form.codePlaceholder")}
              value={resetCode}
              onBlur={() => markTouched("resetCode")}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              error={touched.resetCode ? codeError : ""}
              compact
              required
            />

            <PasswordControl
              id="reset-new-password"
              label={t("login.form.newPasswordLabel")}
              name="reset_new_password"
              autoComplete="new-password"
              placeholder={t("login.form.newPasswordPlaceholder")}
              value={resetNewPassword}
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              onBlur={() => markTouched("resetNewPassword")}
              onChange={(e) => setResetNewPassword(e.target.value)}
              error={touched.resetNewPassword ? passwordError : ""}
              compact
              required
            />

            <PasswordStrength strength={passwordStrength} />

            <PasswordControl
              id="reset-confirm"
              label={t("login.form.confirmPasswordLabel")}
              name="reset_confirm_password"
              autoComplete="new-password"
              placeholder={t("login.form.confirmPasswordPlaceholder")}
              value={resetConfirm}
              visible={showConfirm}
              onToggle={() => setShowConfirm((value) => !value)}
              onBlur={() => markTouched("resetConfirm")}
              onChange={(e) => setResetConfirm(e.target.value)}
              error={touched.resetConfirm ? confirmError : ""}
              compact
              required
            />

            <SubmitButton loading={loading} loadingText={t("login.form.updateLoading")}>
              {t("login.form.updatePasswordSubmit")}
            </SubmitButton>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs pb-1">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="font-semibold text-cyan-300 transition hover:text-cyan-200 disabled:opacity-60"
            >
              {t("login.form.resendCode")}
            </button>

            <button
              type="button"
              onClick={() => switchMode("login")}
              disabled={loading}
              className="font-semibold text-slate-400 transition hover:text-cyan-200 disabled:opacity-60"
            >
              {t("login.form.back")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormHeader({ title, subtitle, compact = false }) {
  return (
    <div className={compact ? "mb-4" : "mb-5"}>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.9)]" />
        WellQ Admin
      </div>

      <h2 className="text-2xl font-black tracking-tight text-white leading-tight">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-5 text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

function FormStatus({ error, success }) {
  if (!error && !success) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
        error
          ? "border-red-400/20 bg-red-500/10 text-red-200"
          : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
      }`}
    >
      {error ? (
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : (
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      )}

      <span>{error || success}</span>
    </div>
  );
}

function Control({
  id,
  label,
  icon: Icon,
  compact = false,
  error = "",
  className = "",
  ...props
}) {
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        )}

        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
          className={`
            wellq-control
            w-full rounded-full border bg-white/[0.055] text-sm text-white
            outline-none transition-[border-color,background-color,box-shadow] duration-200
            placeholder:text-slate-500
            ${Icon ? "pl-10 pr-4" : "px-4"}
            ${compact ? "h-9" : "h-11"}
            ${
              error
                ? "border-red-400/35 focus:border-red-300/60 focus:shadow-[0_0_0_4px_rgba(248,113,113,.08)]"
                : "border-white/10 hover:border-cyan-300/25 focus:border-cyan-300/45 focus:bg-cyan-300/[0.055] focus:shadow-[0_0_0_4px_rgba(34,211,238,.08)]"
            }
            ${className}
          `}
        />
      </div>

      <FieldError id={describedBy} message={error} />
    </div>
  );
}

function PasswordControl({
  id,
  label,
  visible,
  onToggle,
  compact = false,
  error = "",
  ...props
}) {
  const { t } = useLanguage();
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
          className={`
            wellq-control
            w-full rounded-full border bg-white/[0.055] pl-10 pr-11 text-sm text-white
            outline-none transition-[border-color,background-color,box-shadow] duration-200
            placeholder:text-slate-500
            ${compact ? "h-9" : "h-11"}
            ${
              error
                ? "border-red-400/35 focus:border-red-300/60 focus:shadow-[0_0_0_4px_rgba(248,113,113,.08)]"
                : "border-white/10 hover:border-cyan-300/25 focus:border-cyan-300/45 focus:bg-cyan-300/[0.055] focus:shadow-[0_0_0_4px_rgba(34,211,238,.08)]"
            }
          `}
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? t("login.a11y.hidePassword") : t("login.a11y.showPassword")}
          className="absolute right-2 top-0 flex h-full w-8 items-center justify-center rounded-full text-slate-400 transition hover:text-cyan-200"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      <FieldError id={describedBy} message={error} />
    </div>
  );
}

// 🔥 NUEVO: Recibe 'options' para hacer el .map() iterando los roles de la base de datos
function SelectControl({ id, label, value, onChange, options = [], compact = false }) {
  const { t } = useLanguage();

  return (
    <div>
      <div className="relative">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>

        <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

        <select
          id={id}
          value={value}
          onChange={onChange}
          className={`
            wellq-control wellq-select w-full appearance-none rounded-full border border-white/10
            bg-white/[0.055] pl-10 pr-10 text-sm text-white outline-none
            transition-[border-color,background-color,box-shadow] duration-200
            hover:border-cyan-300/25 focus:border-cyan-300/45
            focus:bg-cyan-300/[0.055] focus:shadow-[0_0_0_4px_rgba(34,211,238,.08)]
            ${compact ? "h-9" : "h-11"}
          `}
        >
          {options.length > 0 ? (
            options.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))
          ) : (
            <option value="">{t("login.form.rolesLoading")}</option>
          )}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
    </div>
  );
}

function PasswordStrength({ strength }) {
  const { t } = useLanguage();

  if (!strength.hasValue) return null;

  return (
    <div className="space-y-1 py-0.5" aria-live="polite">
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${strength.percent}%` }}
        />
      </div>

      <p className={`text-[10px] font-medium leading-none ${strength.textColor}`}>
        {t("login.passwordStrength.prefix")}{strength.label}
      </p>
    </div>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      className="mt-1 truncate text-[10px] font-medium leading-none text-red-300"
    >
      {message}
    </p>
  );
}

function SubmitButton({ loading, loadingText, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-500 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(34,211,238,.24)] transition-[box-shadow,opacity,background-color] duration-200 hover:shadow-[0_0_30px_rgba(34,211,238,.35)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && (
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
      )}

      <span className="min-w-[104px] text-center">
        {loading ? loadingText : children}
      </span>
    </button>
  );
}

function getEmailError(value, t) {
  const email = value.trim();

  if (!email) return t("login.validation.emailRequired");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return t("login.validation.emailInvalid");
  }

  return "";
}

function getNameError(value, t) {
  const name = value.trim();

  if (!name) return t("login.validation.nameRequired");
  if (name.length < 3) return t("login.validation.nameMinLength");

  return "";
}

function getPasswordError(value, t) {
  if (!value) return t("login.validation.passwordRequired");
  if (value.length < 8) return t("login.validation.passwordMinLength");

  return "";
}

function getCodeError(value, t) {
  const code = value.trim();

  if (!code) return t("login.validation.codeRequired");
  if (!/^\d{6}$/.test(code)) return t("login.validation.codeFormat");

  return "";
}

function usePasswordStrength(password, t) {
  return useMemo(() => {
    if (!password) {
      return {
        hasValue: false,
        percent: 0,
        label: "",
        color: "bg-slate-500",
        textColor: "text-slate-400",
      };
    }

    let score = 0;

    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) {
      return {
        hasValue: true,
        percent: 34,
        label: t("login.passwordStrength.low"),
        color: "bg-red-400",
        textColor: "text-red-300",
      };
    }

    if (score <= 4) {
      return {
        hasValue: true,
        percent: 68,
        label: t("login.passwordStrength.medium"),
        color: "bg-amber-300",
        textColor: "text-amber-200",
      };
    }

    return {
      hasValue: true,
      percent: 100,
      label: t("login.passwordStrength.high"),
      color: "bg-emerald-300",
      textColor: "text-emerald-200",
    };
  }, [password, t]);
}
