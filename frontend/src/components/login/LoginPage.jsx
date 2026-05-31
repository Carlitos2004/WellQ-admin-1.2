import { useMemo, useState } from "react";
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

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regRole, setRegRole] = useState("admin");

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

  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";

  const loginEmailError = getEmailError(email);
  const loginPasswordError = password ? "" : "Ingresa tu contraseña.";

  const regNameError = getNameError(regFullName);
  const regEmailError = getEmailError(regEmail);
  const regPasswordError = getPasswordError(regPassword);
  const regConfirmError =
    regConfirm && regPassword !== regConfirm
      ? "Las contraseñas no coinciden."
      : "";

  const resetEmailError = getEmailError(resetEmail);
  const resetCodeError = getCodeError(resetCode);
  const resetPasswordError = getPasswordError(resetNewPassword);
  const resetConfirmError =
    resetConfirm && resetNewPassword !== resetConfirm
      ? "Las contraseñas no coinciden."
      : "";

  const regPasswordStrength = usePasswordStrength(regPassword);
  const resetPasswordStrength = usePasswordStrength(resetNewPassword);

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
      setError("Revisa los campos antes de iniciar sesión.");
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err) {
      setError(
        err.message ||
          "Credenciales incorrectas. Verifica tu email y contraseña."
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
      setError("Revisa los campos antes de crear la cuenta.");
      return;
    }

    const cleanFullName = regFullName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: cleanFullName,
          email: cleanEmail,
          password: regPassword,
          role: regRole,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.detail ?? "No se pudo crear la cuenta.");
        return;
      }

      setSuccess("Cuenta creada correctamente.");
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
      setError("Error de conexión. Verifica el servidor.");
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
      setError("Ingresa un correo válido para recuperar tu acceso.");
      return;
    }

    setLoading(true);

    try {
      const payload = await requestPasswordReset(resetEmail.trim().toLowerCase());
      setSuccess(payload.message || "Si el correo existe, enviaremos un código.");
      setMode("reset");
      setTouched({});
    } catch (err) {
      setError(err.message || "No se pudo enviar el código.");
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
      setError("Revisa el código y la nueva contraseña.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(
        resetEmail.trim().toLowerCase(),
        resetCode.trim(),
        resetNewPassword
      );

      setSuccess("Contraseña actualizada. Ya puedes iniciar sesión.");
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
      setError(err.message || "No se pudo actualizar la contraseña.");
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

        /* FIX: Scrollbar invisible por defecto y separado */
        .wellq-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .wellq-scrollbar:hover {
          scrollbar-color: rgba(34, 211, 238, 0.3) transparent;
        }

        .wellq-scrollbar::-webkit-scrollbar {
          width: 4px; /* Un poco más delgada para mayor sutileza */
        }
        .wellq-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        /* Oculto por defecto (sin color) para evitar el flash nativo */
        .wellq-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(34, 211, 238, 0);
          border-radius: 10px;
        }
        
        /* Aparece de forma sutil solo al hacer hover en el contenedor */
        .wellq-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(34, 211, 238, 0.3);
        }
        
        /* Brilla más al interactuar directamente con la barrita */
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
          
          {/* Se agregó key={mode} a la sección para evitar NotFoundError al destruir componentes */}
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

          {/* Se agregó key={mode} a la sección */}
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
              />
            )}
          </section>
        </div>

        <MovingPanel mode={mode} loading={loading} switchMode={switchMode} />

        <div className="md:hidden">
          <MobilePanel mode={mode} loading={loading} switchMode={switchMode} />

          {/* Se agregó key={mode} a la sección móvil */}
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
  const isRegister = mode === "register";
  const isRecovery = mode === "forgot" || mode === "reset";
  const panelOnRight = !isRegister;

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

          {/* Se agregó key={`title-${mode}`} */}
          <h1 key={`title-${mode}`} className="max-w-[250px] text-[38px] font-black leading-[1.06] tracking-tight text-white">
            {isRecovery ? (
              <>
                Recover <br />
                Access
              </>
            ) : mode === "login" ? (
              <>
                Welcome <br />
                Back
              </>
            ) : (
              <>Welcome</>
            )}
          </h1>

          {/* Se agregó key={`desc-${mode}`} */}
          <p key={`desc-${mode}`} className="mt-5 max-w-[260px] text-sm font-medium leading-6 text-cyan-50/90">
            {isRecovery
              ? "Solicita un código seguro y define una nueva contraseña para tu cuenta."
              : mode === "login"
                ? "Accede nuevamente a WellQ Admin con una experiencia moderna, elegante y rápida."
                : "Crea una cuenta y administra todo desde un solo lugar."}
          </p>
        </div>

        {/* Se agregó key={`btn-${mode}`} */}
        <button
          key={`btn-${mode}`}
          type="button"
          disabled={loading}
          onClick={() => switchMode(mode === "register" ? "login" : "register")}
          className="h-10 w-full rounded-full border border-white/30 bg-white/10 text-sm font-bold text-white backdrop-blur transition duration-200 hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "register" ? "Iniciar sesión" : "Crear cuenta"}
        </button>
      </div>
    </aside>
  );
}

function MobilePanel({ mode, loading, switchMode }) {
  const isRecovery = mode === "forgot" || mode === "reset";

  return (
    <aside className="relative overflow-hidden bg-gradient-to-br from-cyan-300 via-cyan-500 to-blue-600 px-6 py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(224,255,255,.2),transparent_30%)]" />

      <div className="relative z-10">
        {/* Se agregó key={`title-mobile-${mode}`} */}
        <h1 key={`title-mobile-${mode}`} className="text-3xl font-black leading-tight text-white">
          {isRecovery ? "Recover Access" : mode === "login" ? "Welcome Back" : "Welcome"}
        </h1>

        {/* Se agregó key={`btn-mobile-${mode}`} */}
        <button
          key={`btn-mobile-${mode}`}
          type="button"
          disabled={loading}
          onClick={() => switchMode(mode === "register" ? "login" : "register")}
          className="mt-5 h-10 w-full rounded-full border border-white/30 bg-white/10 text-sm font-bold text-white backdrop-blur transition hover:bg-white/18 disabled:opacity-60"
        >
          {mode === "register" ? "Iniciar sesión" : "Crear cuenta"}
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
  return (
    <div className="wellq-fade-in flex flex-col w-full h-full max-h-full max-w-[270px] transform-gpu text-center min-h-0">
      
      <div className="shrink-0 text-left">
        <FormHeader title="Login" subtitle="Inicia sesión para continuar" />
      </div>
      
      {/* FIX: Se agregó pr-3 para dar separación */}
      <div className="flex-1 overflow-y-auto pr-3 wellq-scrollbar min-h-0 text-left">
        <div className="space-y-3 pb-2 pt-1">
          <FormStatus error={error} success={success} />

          <form onSubmit={handleLogin} className="space-y-3" noValidate>
            <Control
              id="login-email"
              label="Correo electrónico"
              icon={Mail}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Correo electrónico"
              value={email}
              onBlur={() => markTouched("email")}
              onChange={(e) => setEmail(e.target.value)}
              error={touched.email ? emailError : ""}
              required
            />

            <PasswordControl
              id="login-password"
              label="Contraseña"
              name="password"
              autoComplete="current-password"
              placeholder="Contraseña"
              value={password}
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              onBlur={() => markTouched("password")}
              onChange={(e) => setPassword(e.target.value)}
              error={touched.password ? passwordError : ""}
              required
            />

            <SubmitButton loading={loading} loadingText="Iniciando...">
              Iniciar sesión
            </SubmitButton>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">
            ¿No tienes cuenta?{" "}
            <button
              type="button"
              onClick={() => switchMode("register")}
              className="font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              Regístrate
            </button>
          </p>

          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="mt-3 text-xs font-semibold text-cyan-300 transition hover:text-cyan-200 w-full text-center"
          >
            ¿Olvidaste tu contraseña?
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
}) {
  return (
    <div className="wellq-fade-in flex flex-col w-full h-full max-h-full max-w-[270px] transform-gpu min-h-0">
      
      <div className="shrink-0">
        <FormHeader title="Sign Up" subtitle="Crear nueva cuenta" compact />
      </div>

      {/* FIX: pr-3 para la separación visual de la barra */}
      <div className="flex-1 overflow-y-auto pr-3 wellq-scrollbar min-h-0">
        <div className="space-y-2 pb-2 pt-1">
          <FormStatus error={error} success={success} />

          {/* FIX: Reducción sutil de márgenes internos (space-y-2) para evitar desbordamiento inicial */}
          <form onSubmit={handleRegister} className="space-y-2" noValidate>
            <Control
              id="register-name"
              label="Nombre completo"
              icon={User}
              type="text"
              name="full_name"
              autoComplete="name"
              placeholder="Nombre completo"
              value={regFullName}
              onBlur={() => markTouched("regFullName")}
              onChange={(e) => setRegFullName(e.target.value)}
              error={touched.regFullName ? nameError : ""}
              compact
              required
            />

            <Control
              id="register-email"
              label="Correo electrónico"
              icon={Mail}
              type="email"
              name="register_email"
              autoComplete="email"
              placeholder="Correo electrónico"
              value={regEmail}
              onBlur={() => markTouched("regEmail")}
              onChange={(e) => setRegEmail(e.target.value)}
              error={touched.regEmail ? emailError : ""}
              compact
              required
            />

            <SelectControl
              id="register-role"
              label="Rol"
              value={regRole}
              onChange={(e) => setRegRole(e.target.value)}
              compact
            />

            <PasswordControl
              id="register-password"
              label="Contraseña"
              name="new_password"
              autoComplete="new-password"
              placeholder="Contraseña"
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
              label="Confirmar contraseña"
              name="confirm_password"
              autoComplete="new-password"
              placeholder="Confirmar contraseña"
              value={regConfirm}
              visible={showConfirm}
              onToggle={() => setShowConfirm((value) => !value)}
              onBlur={() => markTouched("regConfirm")}
              onChange={(e) => setRegConfirm(e.target.value)}
              error={touched.regConfirm ? confirmError : ""}
              compact
              required
            />

            <SubmitButton loading={loading} loadingText="Creando...">
              Crear cuenta
            </SubmitButton>
          </form>

          <p className="mt-3 text-center text-xs text-slate-400 pb-1">
            ¿Ya tienes cuenta?{" "}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              Inicia sesión
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
  return (
    <div className="wellq-fade-in flex flex-col w-full h-full max-h-full max-w-[270px] transform-gpu min-h-0">
      
      <div className="shrink-0">
        <FormHeader
          title="Recuperar acceso"
          subtitle="Te enviaremos un código de recuperación."
        />
      </div>
      
      <div className="flex-1 overflow-y-auto pr-3 wellq-scrollbar min-h-0">
        <div className="space-y-3 pb-2 pt-1">
          <FormStatus error={error} success={success} />

          <form onSubmit={handleForgotPassword} className="space-y-3" noValidate>
            <Control
              id="reset-email"
              label="Correo electrónico"
              icon={Mail}
              type="email"
              name="reset_email"
              autoComplete="email"
              placeholder="Correo electrónico"
              value={resetEmail}
              onBlur={() => markTouched("resetEmail")}
              onChange={(e) => setResetEmail(e.target.value)}
              error={touched.resetEmail ? emailError : ""}
              required
            />

            <SubmitButton loading={loading} loadingText="Enviando...">
              <span className="inline-flex items-center gap-2">
                <Send className="h-4 w-4" />
                Enviar código
              </span>
            </SubmitButton>
          </form>

          <button
            type="button"
            onClick={() => switchMode("login")}
            className="mt-5 flex w-full items-center justify-center gap-2 text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al login
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
  return (
    <div className="wellq-fade-in flex flex-col w-full h-full max-h-full max-w-[270px] transform-gpu min-h-0">
      
      <div className="shrink-0">
        <FormHeader
          title="Nuevo acceso"
          subtitle={`Código enviado a ${resetEmail || "tu correo"}`}
          compact
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-3 wellq-scrollbar min-h-0">
        <div className="space-y-2 pb-2 pt-1">
          <FormStatus error={error} success={success} />

          <form onSubmit={handleResetPassword} className="space-y-2.5" noValidate>
            <Control
              id="reset-code"
              label="Código"
              icon={KeyRound}
              type="text"
              name="reset_code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Código de 6 dígitos"
              value={resetCode}
              onBlur={() => markTouched("resetCode")}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              error={touched.resetCode ? codeError : ""}
              compact
              required
            />

            <PasswordControl
              id="reset-new-password"
              label="Nueva contraseña"
              name="reset_new_password"
              autoComplete="new-password"
              placeholder="Nueva contraseña"
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
              label="Confirmar contraseña"
              name="reset_confirm_password"
              autoComplete="new-password"
              placeholder="Confirmar contraseña"
              value={resetConfirm}
              visible={showConfirm}
              onToggle={() => setShowConfirm((value) => !value)}
              onBlur={() => markTouched("resetConfirm")}
              onChange={(e) => setResetConfirm(e.target.value)}
              error={touched.resetConfirm ? confirmError : ""}
              compact
              required
            />

            <SubmitButton loading={loading} loadingText="Actualizando...">
              Actualizar contraseña
            </SubmitButton>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs pb-1">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="font-semibold text-cyan-300 transition hover:text-cyan-200 disabled:opacity-60"
            >
              Reenviar código
            </button>

            <button
              type="button"
              onClick={() => switchMode("login")}
              disabled={loading}
              className="font-semibold text-slate-400 transition hover:text-cyan-200 disabled:opacity-60"
            >
              Volver
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
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
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

function SelectControl({ id, label, value, onChange, compact = false }) {
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
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
          <option value="viewer">Viewer solo lectura</option>
        </select>

        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>
    </div>
  );
}

function PasswordStrength({ strength }) {
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
        Fortaleza: {strength.label}
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

function getEmailError(value) {
  const email = value.trim();

  if (!email) return "Ingresa tu correo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return "Ingresa un correo válido.";
  }

  return "";
}

function getNameError(value) {
  const name = value.trim();

  if (!name) return "Ingresa tu nombre.";
  if (name.length < 3) return "Mínimo 3 caracteres.";

  return "";
}

function getPasswordError(value) {
  if (!value) return "Ingresa una contraseña.";
  if (value.length < 8) return "Mínimo 8 caracteres.";

  return "";
}

function getCodeError(value) {
  const code = value.trim();

  if (!code) return "Ingresa el código.";
  if (!/^\d{6}$/.test(code)) return "Debe tener 6 dígitos.";

  return "";
}

function usePasswordStrength(password) {
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
        label: "baja",
        color: "bg-red-400",
        textColor: "text-red-300",
      };
    }

    if (score <= 4) {
      return {
        hasValue: true,
        percent: 68,
        label: "media",
        color: "bg-amber-300",
        textColor: "text-amber-200",
      };
    }

    return {
      hasValue: true,
      percent: 100,
      label: "alta",
      color: "bg-emerald-300",
      textColor: "text-emerald-200",
    };
  }, [password]);
}