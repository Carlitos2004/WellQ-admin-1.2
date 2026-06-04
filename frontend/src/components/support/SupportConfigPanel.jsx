import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Settings, Users, Tags, Plus, Trash2, Edit2, Loader2,
  Mail, ShieldCheck, AlertCircle, CheckCircle2, UserCog, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';

// Importamos TODAS las funciones que acabamos de agregar a client.js
import {
  fetchTicketCategories,
  createTicketCategory,
  updateTicketCategory,
  deleteTicketCategory,
  fetchSupportResponders,
  createResponder,
  updateResponder,
  deleteResponder,
} from '../../api/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Componente Principal ─────────────────────────────────────────────────────
export const SupportConfigPanel = ({ onClose, onCategoriesChanged }) => {
  const { t } = useLanguage();
  const tr = (key, fallback) => { const v = t(key); return v === key ? (fallback ?? key) : v; };
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'responders'

  // Estados de datos
  const [categories, setCategories] = useState([]);
  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de modales anidados (Formularios)
  const [formModal, setFormModal] = useState({ isOpen: false, type: null, mode: 'create', data: null });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, respRes] = await Promise.all([
        fetchTicketCategories(),
        fetchSupportResponders(),
      ]);
      setCategories(catRes?.details ?? []);
      setResponders(respRes?.responders ?? []);
    } catch (error) {
      toast.error(tr('support.errorLoadConfig', 'Error al cargar la configuración'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
    // Bloquear scroll de fondo
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [loadData]);

  const handleClose = () => {
    if (onCategoriesChanged) onCategoriesChanged();
    onClose();
  };

  const openForm = (type, mode, data = null) => {
    setFormModal({ isOpen: true, type, mode, data });
  };

  // ─── Animaciones ────────────────────────────────────────────────────────────
  const panelVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit: { opacity: 0, scale: 0.96, y: 20, transition: { duration: 0.2 } },
  };

  const listVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-wellq-dark/40 dark:bg-black/60 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="pointer-events-auto w-full max-w-5xl h-[85vh] flex flex-col bg-white dark:bg-[#0B1120] rounded-2xl shadow-2xl border border-wellq-gray/20 dark:border-white/10 font-sans overflow-hidden relative"
        >
          {/* Header Glassmórfico */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between px-8 py-6 border-b border-wellq-gray/10 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-wellq-blue to-wellq-cyan flex items-center justify-center shadow-lg shadow-wellq-cyan/20 ring-1 ring-white/20">
                <Settings size={22} className="text-wellq-dark" strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-xl font-black text-wellq-dark dark:text-white tracking-tight leading-none">
                  {tr('support.configTitle', 'Configuración de Soporte')}
                </h2>
                <p className="text-xs font-medium text-wellq-gray mt-1.5">
                  {tr('support.configSubtitle', 'Gestiona las categorías dinámicas y los resolutores del sistema')}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="absolute right-6 top-6 p-2 rounded-xl text-wellq-gray hover:text-wellq-dark dark:hover:text-white hover:bg-wellq-gray/10 dark:hover:bg-white/10 transition-colors"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          {/* Tabs Nav */}
          <div className="flex items-center px-8 pt-4 border-b border-wellq-gray/10 dark:border-white/5 bg-wellq-gray/3 dark:bg-white/[0.02]">
            <TabButton
              active={activeTab === 'categories'}
              onClick={() => setActiveTab('categories')}
              icon={Tags}
              label={tr('support.tabCategories', 'Categorías y Correos')}
            />
            <TabButton
              active={activeTab === 'responders'}
              onClick={() => setActiveTab('responders')}
              icon={Users}
              label={tr('support.tabResponders', 'Equipo de Resolutores')}
            />
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0B1120] p-8 relative [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-wellq-gray/20 dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <Loader2 size={32} className="text-wellq-cyan animate-spin" />
                <span className="text-xs font-bold text-wellq-gray tracking-widest uppercase">Cargando...</span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="space-y-4"
                >
                  {/* Vista Categorías */}
                  {activeTab === 'categories' && (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-wellq-gray">
                          Categorías Activas
                        </h3>
                        <PrimaryButton icon={Plus} label="Nueva Categoría" onClick={() => openForm('category', 'create')} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categories.map((cat) => (
                          <motion.div key={cat.category_id} variants={itemVariants}>
                            <CategoryCard
                              category={cat}
                              onEdit={() => openForm('category', 'edit', cat)}
                              onToggleStatus={async () => {
                                // Lógica de Soft Delete rápida y optimista
                                const original = [...categories];
                                setCategories(categories.map(c => c.category_id === cat.category_id ? { ...c, is_active: !c.is_active } : c));
                                try {
                                  if (cat.is_active) {
                                    await deleteTicketCategory(cat.category_id);
                                    toast.success('Categoría desactivada');
                                  } else {
                                    await updateTicketCategory(cat.category_id, { is_active: true });
                                    toast.success('Categoría reactivada');
                                  }
                                } catch (e) {
                                  setCategories(original);
                                  toast.error('Error al cambiar el estado');
                                }
                              }}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Vista Resolutores */}
                  {activeTab === 'responders' && (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-wellq-gray">
                          Agentes de Soporte
                        </h3>
                        <PrimaryButton icon={Plus} label="Nuevo Resolutor" onClick={() => openForm('responder', 'create')} />
                      </div>
                      <div className="rounded-xl border border-wellq-gray/20 dark:border-white/10 overflow-hidden divide-y divide-wellq-gray/10 dark:divide-white/5 bg-white dark:bg-white/[0.02]">
                        {responders.map((resp) => (
                          <motion.div key={resp.id} variants={itemVariants}>
                            <ResponderRow
                              responder={resp}
                              onEdit={() => openForm('responder', 'edit', resp)}
                              onDelete={async () => {
                                if (!window.confirm(`¿Seguro que deseas eliminar a ${resp.name}?`)) return;
                                try {
                                  await deleteResponder(resp.id);
                                  toast.success('Resolutor eliminado');
                                  loadData();
                                } catch (error) {
                                  // Capturar específicamente el 409 (Conflict) del backend
                                  if (error.message.includes('409') || error.message.includes('ticket')) {
                                    toast.error('No se puede eliminar: Tiene tickets activos asignados. Reasígnalos primero.', { duration: 5000 });
                                  } else {
                                    toast.error('Error al eliminar el resolutor');
                                  }
                                }
                              }}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>

      {/* Nested Form Modals */}
      <AnimatePresence>
        {formModal.isOpen && formModal.type === 'category' && (
          <CategoryFormModal
            mode={formModal.mode}
            initialData={formModal.data}
            onClose={() => setFormModal({ isOpen: false })}
            onSaved={() => {
              setFormModal({ isOpen: false });
              loadData();
            }}
          />
        )}
        {formModal.isOpen && formModal.type === 'responder' && (
          <ResponderFormModal
            mode={formModal.mode}
            initialData={formModal.data}
            onClose={() => setFormModal({ isOpen: false })}
            onSaved={() => {
              setFormModal({ isOpen: false });
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </>,
    document.body
  );
};

// ─── Sub-componentes Visuales ─────────────────────────────────────────────────

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-2 px-6 py-4 text-[13px] font-bold outline-none transition-colors ${active ? 'text-wellq-dark dark:text-white' : 'text-wellq-gray hover:text-wellq-dark dark:hover:text-white/80'}`}
  >
    <Icon size={16} strokeWidth={active ? 2.5 : 2} />
    {label}
    {active && (
      <motion.div
        layoutId="tab-indicator"
        className="absolute bottom-0 left-0 right-0 h-[3px] bg-wellq-cyan rounded-t-full"
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      />
    )}
  </button>
);

const PrimaryButton = ({ icon: Icon, label, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-wellq-blue to-wellq-cyan text-wellq-dark rounded-xl text-xs font-bold shadow-sm shadow-wellq-cyan/20 hover:shadow-md transition-all"
  >
    <Icon size={14} strokeWidth={2.5} />
    {label}
  </motion.button>
);

const CategoryCard = ({ category, onEdit, onToggleStatus }) => {
  let emails = [];
  try { emails = category.emails ? JSON.parse(category.emails) : []; } catch (e) { emails = []; }

  return (
    <div className={`p-5 rounded-xl border transition-all ${category.is_active ? 'bg-white dark:bg-white/[0.02] border-wellq-gray/20 dark:border-white/10 hover:shadow-md' : 'bg-wellq-gray/5 dark:bg-white/[0.01] border-wellq-gray/10 dark:border-white/5 opacity-70 grayscale-[30%]'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-black text-wellq-dark dark:text-white tracking-tight">{category.name}</h4>
            {!category.is_active && (
              <span className="px-2 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 rounded-md uppercase">Inactiva</span>
            )}
          </div>
          {category.team && (
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-wellq-cyan uppercase tracking-wider">
              <ShieldCheck size={12} strokeWidth={2.5} />
              Equipo: {category.team}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 text-wellq-gray hover:text-wellq-blue bg-wellq-gray/5 hover:bg-wellq-blue/10 rounded-lg transition-colors">
            <Edit2 size={14} strokeWidth={2.5} />
          </button>
          <button onClick={onToggleStatus} className={`p-2 rounded-lg transition-colors ${category.is_active ? 'text-wellq-gray hover:text-red-500 bg-wellq-gray/5 hover:bg-red-500/10' : 'text-wellq-gray hover:text-emerald-500 bg-wellq-gray/5 hover:bg-emerald-500/10'}`}>
            {category.is_active ? <Trash2 size={14} strokeWidth={2.5} /> : <CheckCircle2 size={14} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {emails.length > 0 ? emails.map((email, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-wellq-gray/10 dark:bg-white/10 rounded-lg text-[11px] font-medium text-wellq-dark dark:text-white/80 border border-wellq-gray/20 dark:border-white/5">
            <Mail size={10} className="text-wellq-gray" />
            {email}
          </span>
        )) : (
          <span className="text-[11px] text-wellq-gray/60 italic font-medium">Sin correos de notificación</span>
        )}
      </div>
    </div>
  );
};

const ResponderRow = ({ responder, onEdit, onDelete }) => (
  <div className="flex items-center gap-4 px-6 py-4 hover:bg-wellq-gray/5 dark:hover:bg-white/[0.04] transition-colors group">
    <div className="w-10 h-10 rounded-xl bg-wellq-cyan/10 text-wellq-cyan flex items-center justify-center font-black text-sm ring-1 ring-wellq-cyan/20">
      {responder.name.substring(0, 2).toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-wellq-dark dark:text-white truncate">{responder.name}</p>
      <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold text-wellq-gray uppercase tracking-wider">
        <span className="flex items-center gap-1"><UserCog size={11} /> {responder.user || responder.username}</span>
        {responder.email && <span className="flex items-center gap-1 lowercase normal-case tracking-normal"><Mail size={11} /> {responder.email}</span>}
      </div>
    </div>
    <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-md uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20">
      {responder.group || 'General'}
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
      <button onClick={onEdit} className="p-2 text-wellq-gray hover:text-wellq-blue transition-colors rounded-lg"><Edit2 size={16} strokeWidth={2.5}/></button>
      <button onClick={onDelete} className="p-2 text-wellq-gray hover:text-red-500 transition-colors rounded-lg"><Trash2 size={16} strokeWidth={2.5}/></button>
    </div>
  </div>
);

// ─── Modales de Formularios (Nested) ──────────────────────────────────────────

const FormModalBase = ({ title, icon: Icon, onClose, children, onSave, saving }) => (
  <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="relative w-full max-w-lg bg-white dark:bg-wellq-dark rounded-2xl shadow-2xl border border-white/10 font-sans overflow-hidden"
    >
      <div className="flex items-center gap-3 px-6 py-5 border-b border-wellq-gray/10 dark:border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wellq-blue to-wellq-cyan flex items-center justify-center shadow-sm">
          <Icon size={16} className="text-wellq-dark" strokeWidth={2.2} />
        </div>
        <h2 className="flex-1 text-base font-black text-wellq-dark dark:text-white tracking-tight">{title}</h2>
        <button onClick={onClose} className="p-2 text-wellq-gray hover:text-white transition-colors"><X size={18} strokeWidth={2.5} /></button>
      </div>
      <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-white/10">
        {children}
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/5 bg-black/5 dark:bg-white/[0.02]">
        <button onClick={onClose} disabled={saving} className="px-4 py-2 text-[13px] font-bold text-wellq-gray hover:text-white transition-colors">Cancelar</button>
        <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold bg-gradient-to-r from-wellq-blue to-wellq-cyan text-wellq-dark hover:shadow-md transition-all disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Guardar
        </button>
      </div>
    </motion.div>
  </div>
);

const CategoryFormModal = ({ mode, initialData, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: '', team: '', emails: [] });
  const [saving, setSaving] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      let parsed = [];
      try { parsed = JSON.parse(initialData.emails || '[]'); } catch(e){}
      setForm({ name: initialData.name || '', team: initialData.team || '', emails: parsed });
    }
  }, [mode, initialData]);

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      const val = emailInput.trim().replace(',', '');
      if (EMAIL_RE.test(val) && !form.emails.includes(val)) {
        setForm(prev => ({ ...prev, emails: [...prev.emails, val] }));
        setEmailInput('');
      } else if (val) {
        toast.error('Formato de correo inválido o duplicado');
      }
    }
  };

  const removeEmail = (em) => setForm(prev => ({ ...prev, emails: prev.emails.filter(e => e !== em) }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('El nombre es obligatorio');
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), team: form.team.trim() || undefined, emails: JSON.stringify(form.emails) };
      if (mode === 'create') await createTicketCategory(payload);
      else await updateTicketCategory(initialData.category_id, payload);
      toast.success('Categoría guardada');
      onSaved();
    } catch (e) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModalBase title={mode === 'create' ? 'Nueva Categoría' : 'Editar Categoría'} icon={Tags} onClose={onClose} onSave={handleSave} saving={saving}>
      <Input label="Nombre de la Categoría *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Social Media" />
      <Input label="Equipo Encargado (Opcional)" value={form.team} onChange={e => setForm({...form, team: e.target.value})} placeholder="Ej: Marketing" />
      
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-wellq-gray">Correos de Notificación</label>
        <div className="w-full p-2 min-h-[46px] rounded-xl border border-wellq-gray/20 dark:border-white/10 bg-white dark:bg-black/20 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-wellq-cyan/50">
          {form.emails.map(em => (
            <span key={em} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-wellq-blue/10 text-wellq-blue text-[11px] font-bold rounded-lg">
              {em}
              <button onClick={() => removeEmail(em)} className="p-0.5 hover:bg-wellq-blue/20 rounded-md"><X size={12}/></button>
            </span>
          ))}
          <input
            type="text"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={handleEmailKeyDown}
            placeholder={form.emails.length === 0 ? "Escribe el correo y presiona Enter..." : ""}
            className="flex-1 min-w-[150px] bg-transparent text-sm text-wellq-dark dark:text-white focus:outline-none placeholder:text-wellq-gray/50 px-2"
          />
        </div>
        <p className="text-[10px] text-wellq-gray/70 font-medium pt-1"><AlertCircle size={10} className="inline mr-1" />Presiona <kbd className="bg-white/10 px-1 rounded">Enter</kbd> o <kbd className="bg-white/10 px-1 rounded">Espacio</kbd> para agregar múltiples correos.</p>
      </div>
    </FormModalBase>
  );
};

const ResponderFormModal = ({ mode, initialData, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: '', username: '', team: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setForm({ name: initialData.name || '', username: initialData.user || initialData.username || '', team: initialData.group || '', email: initialData.email || '', password: '' });
    }
  }, [mode, initialData]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) return toast.error('Nombre y Username son obligatorios');
    // ── NUEVO: validar team — el backend lo requiere en CreateResponderBody ──
    if (!form.team.trim()) return toast.error('El equipo es obligatorio');
    if (mode === 'create' && !form.password) return toast.error('La contraseña es obligatoria para nuevos usuarios');
    if (form.email && !EMAIL_RE.test(form.email)) return toast.error('Formato de correo inválido');
    
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), username: form.username.trim(), team: form.team.trim() || undefined, email: form.email.trim() || undefined };
      if (mode === 'create') await createResponder({ ...payload, password: form.password });
      else await updateResponder(initialData.id, payload);
      toast.success('Resolutor guardado');
      onSaved();
    } catch (e) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModalBase title={mode === 'create' ? 'Nuevo Resolutor' : 'Editar Resolutor'} icon={Users} onClose={onClose} onSave={handleSave} saving={saving}>
      <Input label="Nombre Completo *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Pedro Facturas" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Username (Login) *" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="pedro_f" />
        <Input label="Equipo *" value={form.team} onChange={e => setForm({...form, team: e.target.value})} placeholder="Ej: Financiero" />
      </div>
      <Input label="Correo Electrónico (Notificaciones)" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="pedro@wellq.co" />
      {mode === 'create' && (
        <Input label="Contraseña Temporal *" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
      )}
    </FormModalBase>
  );
};

const Input = ({ label, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold uppercase tracking-widest text-wellq-gray">{label}</label>
    <input
      {...props}
      className="w-full px-4 py-2.5 text-sm font-medium rounded-xl border border-wellq-gray/20 dark:border-white/10 bg-white dark:bg-black/20 text-wellq-dark dark:text-white placeholder:text-wellq-gray/40 focus:outline-none focus:ring-2 focus:ring-wellq-cyan/50 transition-all"
    />
  </div>
);