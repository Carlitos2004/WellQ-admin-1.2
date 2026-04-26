import { useState, useEffect } from "react";
import Dashboard from "./wellq-admin-wireframe";
import LoginPage from "./components/LoginPage";
import { isAuthenticated, logout } from "./services/auth";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setChecking(false);
  }, []);

  async function handleLogout() {
    await logout();
    setAuthed(false);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Cargando...</span>
      </div>
    );
  }

  if (!authed) {
    return <LoginPage onLoginSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra superior con botón de logout */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="text-xs text-slate-500 hover:text-slate-700 bg-white border border-slate-200
                     rounded-lg px-3 py-1.5 shadow-sm transition"
        >
          Cerrar sesión
        </button>
      </div>
      <Dashboard />
    </div>
  );
}
