import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTools, useCreateTool, useUpdateTool, useDeleteTool,
  useCreateToolLog, getGetToolsQueryKey,
  useGetPlannings, useCreatePlanning, useUpdatePlanning, useDeletePlanning,
  useCreatePlanningLog, getGetPlanningsQueryKey,
  useConvertPlanningToToolFromPlanning,
  useUpdateLog, useDeleteLog,
  useGetAccounts, useCreateAccount, getGetAccountsQueryKey,
  useGetStats, getGetStatsQueryKey,
} from "@workspace/api-client-react";
import type { Tool, Planning, Log, TabType } from "@/types";

const CREATED_WITH_OPTIONS = ["Z.ai", "Gemini Canvas", "Lovable", "Replit", "GPT", "Manual Coding"];
const DEPLOY_WITH_OPTIONS = ["Lovable", "Replit", "GitHub Pages", "Vercel", "Netlify"];
const SELECT_ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;
const SELECT_STYLE = { appearance: "none" as const, backgroundImage: SELECT_ARROW, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px", paddingRight: "36px" };

/* ─────────────── tiny helpers ─────────────── */
function Toast({ message, show }: { message: string; show: boolean }) {
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl font-bold text-sm text-emerald-400 toast whitespace-nowrap transition-all duration-300 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "Publish" ? "badge-publish" : status === "Deploy" ? "badge-deploy" : "badge-pending";
  return <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${cls}`}>{status}</span>;
}

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, string> = { "Ide": "badge-ide", "Untuk Dijual": "badge-dijual", "Portofolio": "badge-portfolio", "Internal": "badge-internal", "Abandon": "badge-abandon" };
  return <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${map[category] || "badge-ide"}`}>{category}</span>;
}

/* ─────────────── log section ─────────────── */
function LogSection({ logs, onAddLog, onEditLog, onDeleteLog, onToggleComplete }: {
  logs: Log[]; onAddLog: () => void; onEditLog: (l: Log) => void;
  onDeleteLog: (id: number) => void; onToggleComplete: (l: Log) => void;
}) {
  const [open, setOpen] = useState(false);
  const done = logs.filter(l => l.completed).length;

  return (
    <div className="border-t border-slate-700/40">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-2.5 px-4 text-[11px] text-slate-400 active:bg-white/5 transition">
        <span className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <span>Catatan <span className="text-emerald-400 font-bold">{done}/{logs.length}</span></span>
        </span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      <div className={`collapsible-content ${open ? "expanded" : "collapsed"}`}>
        <div className="px-3 pb-3 space-y-2">
          <button onClick={onAddLog} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-emerald-600/40 text-emerald-400 text-xs font-bold hover:bg-emerald-900/20 active:bg-emerald-900/30 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Tambah Catatan
          </button>
          {logs.length === 0 && <p className="text-[11px] text-slate-600 text-center py-2">Belum ada catatan</p>}
          {logs.map(log => (
            <div key={log.id} className={`rounded-xl border border-slate-700/30 p-3 ${log.completed ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-2">
                <button onClick={() => onToggleComplete(log)}
                  className={`w-5 h-5 flex-shrink-0 rounded-md border mt-0.5 flex items-center justify-center transition ${log.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-500"}`}>
                  {log.completed && <svg className="w-3 h-3 stroke-slate-900" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-500">{log.date}</span>
                    <div className="flex gap-2">
                      <button onClick={() => onEditLog(log)} className="text-slate-500 active:text-emerald-400 p-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => onDeleteLog(log.id)} className="text-slate-500 active:text-red-400 p-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <p className={`text-xs text-slate-300 leading-relaxed whitespace-pre-line ${log.completed ? "line-through text-slate-500" : ""}`}>{log.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── tool card ─────────────── */
function ToolCard({ tool, onEdit, onDelete, onLog, onEditLog, onDeleteLog, onToggleLog }: {
  tool: Tool; onEdit: () => void; onDelete: () => void; onLog: () => void;
  onEditLog: (l: Log) => void; onDeleteLog: (id: number) => void; onToggleLog: (l: Log) => void;
}) {
  const progCls = tool.status === "Publish" ? "progress-publish" : tool.status === "Deploy" ? "progress-deploy" : "progress-pending";
  const createdInfo = [tool.createdWith, tool.createdByAccount].filter(Boolean).join(" · ");
  const deployInfo = [tool.deployWith, tool.deployByAccount].filter(Boolean).join(" · ");

  return (
    <div className="card-enter glass-card rounded-2xl overflow-hidden flex flex-col">
      <div className="p-4 flex-1">
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <h3 className="font-bold text-white text-base tracking-tight">{tool.name}</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-1">
              <StatusBadge status={tool.status} />
              {tool.version && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-300 font-mono">v{tool.version}</span>}
            </div>
            {tool.description && <p className="text-xs text-slate-400 leading-snug line-clamp-2 mt-1">{tool.description}</p>}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={onEdit} className="w-9 h-9 flex items-center justify-center text-slate-400 active:text-emerald-400 rounded-xl bg-slate-800/70 active:bg-emerald-900/30 transition" title="Edit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={onDelete} className="w-9 h-9 flex items-center justify-center text-slate-400 active:text-red-400 rounded-xl bg-slate-800/70 active:bg-red-900/30 transition" title="Hapus">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          {createdInfo && (
            <div className="flex gap-2 items-start">
              <span className="text-slate-500 w-14 flex-shrink-0 mt-0.5">Dibuat</span>
              <span className="text-slate-300 flex-1">{createdInfo}</span>
            </div>
          )}
          {deployInfo && (
            <div className="flex gap-2 items-start">
              <span className="text-slate-500 w-14 flex-shrink-0 mt-0.5">Deploy</span>
              <span className="text-sky-400 flex-1">{deployInfo}</span>
            </div>
          )}
          {tool.releaseDate && (
            <div className="flex gap-2">
              <span className="text-slate-500 w-14 flex-shrink-0">Rilis</span>
              <span className="text-emerald-400">{new Date(tool.releaseDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          )}
          {tool.url && (
            <div className="flex gap-2 items-center">
              <span className="text-slate-500 w-14 flex-shrink-0">Link</span>
              <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 flex items-center gap-1 flex-1 min-w-0">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                <span className="truncate text-xs">{tool.url.replace(/^https?:\/\//, "")}</span>
              </a>
            </div>
          )}
        </div>

        <div className="progress-track mt-3">
          <div className={`progress-fill ${progCls}`} />
        </div>
      </div>

      <LogSection logs={tool.logs} onAddLog={onLog} onEditLog={onEditLog} onDeleteLog={onDeleteLog} onToggleComplete={onToggleLog} />
    </div>
  );
}

/* ─────────────── planning card ─────────────── */
function PlanningCard({ plan, onEdit, onDelete, onConvert, onLog, onEditLog, onDeleteLog, onToggleLog }: {
  plan: Planning; onEdit: () => void; onDelete: () => void; onConvert: () => void; onLog: () => void;
  onEditLog: (l: Log) => void; onDeleteLog: (id: number) => void; onToggleLog: (l: Log) => void;
}) {
  const priceFormatted = plan.price ? `Rp ${parseInt(plan.price).toLocaleString("id-ID")}` : null;

  return (
    <div className="card-enter glass-card rounded-2xl overflow-hidden flex flex-col border-l-[3px] border-amber-500/50">
      <div className="p-4 flex-1">
        <div className="flex justify-between items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base tracking-tight mb-1">{plan.name}</h3>
            <CategoryBadge category={plan.category} />
            {plan.description && <p className="text-xs text-slate-400 leading-snug line-clamp-2 mt-1.5">{plan.description}</p>}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={onConvert} className="w-9 h-9 flex items-center justify-center text-sky-400 active:text-sky-300 rounded-xl bg-sky-900/30 active:bg-sky-900/50 transition" title="Jadikan Tool">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button onClick={onEdit} className="w-9 h-9 flex items-center justify-center text-slate-400 active:text-emerald-400 rounded-xl bg-slate-800/70 active:bg-emerald-900/30 transition" title="Edit">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={onDelete} className="w-9 h-9 flex items-center justify-center text-slate-400 active:text-red-400 rounded-xl bg-slate-800/70 active:bg-red-900/30 transition" title="Hapus">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          {priceFormatted && (
            <div className="flex gap-2">
              <span className="text-slate-500 w-14 flex-shrink-0">Harga</span>
              <span className="text-amber-400 font-bold">{priceFormatted}</span>
            </div>
          )}
          {plan.target && (
            <div className="flex gap-2">
              <span className="text-slate-500 w-14 flex-shrink-0">Target</span>
              <span className="text-slate-300 flex-1">{plan.target}</span>
            </div>
          )}
          {plan.url && (
            <div className="flex gap-2 items-center">
              <span className="text-slate-500 w-14 flex-shrink-0">Link</span>
              <a href={plan.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 truncate flex-1">{plan.url.replace(/^https?:\/\//, "")}</a>
            </div>
          )}
        </div>
      </div>

      <LogSection logs={plan.logs} onAddLog={onLog} onEditLog={onEditLog} onDeleteLog={onDeleteLog} onToggleComplete={onToggleLog} />
    </div>
  );
}

/* ─────────────── dropdown helpers ─────────────── */
function AccountSelect({ label, value, onChange, accounts, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; accounts: string[]; placeholder?: string;
}) {
  const isCustom = value !== "" && !accounts.includes(value);
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-400">{label}</label>
      <select value={isCustom ? "__custom__" : value}
        onChange={e => onChange(e.target.value === "__custom__" ? "" : e.target.value)}
        className="input-field w-full px-3 py-3 rounded-xl text-sm" style={SELECT_STYLE}>
        <option value="">Pilih Akun</option>
        {accounts.map(a => <option key={a} value={a}>{a}</option>)}
        <option value="__custom__">+ Ketik Email Baru</option>
      </select>
      {(isCustom || (value === "" && accounts.length === 0)) && (
        <input type="email" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder || "email@contoh.com"}
          className="input-field w-full px-3 py-3 rounded-xl text-sm" autoFocus />
      )}
    </div>
  );
}

function PlatformSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  const isCustom = value !== "" && !options.includes(value);
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-400">{label}</label>
      <select value={isCustom ? "__custom__" : value}
        onChange={e => onChange(e.target.value === "__custom__" ? "" : e.target.value)}
        className="input-field w-full px-3 py-3 rounded-xl text-sm" style={SELECT_STYLE}>
        <option value="">Pilih Platform</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__custom__">+ Ketik Manual</option>
      </select>
      {isCustom && (
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder="Nama platform" className="input-field w-full px-3 py-3 rounded-xl text-sm" autoFocus />
      )}
    </div>
  );
}

/* ─────────────── form state ─────────────── */
interface FormState {
  name: string; description: string; url: string;
  status: "Pending" | "Deploy" | "Publish";
  createdWith: string; createdByAccount: string;
  deployWith: string; deployByAccount: string;
  version: string; releaseDate: string;
  category: "Ide" | "Untuk Dijual" | "Portofolio" | "Internal" | "Abandon";
  price: string; target: string;
}
const defaultForm: FormState = {
  name: "", description: "", url: "", status: "Pending",
  createdWith: "", createdByAccount: "", deployWith: "", deployByAccount: "",
  version: "", releaseDate: "", category: "Ide", price: "", target: "",
};

type LogTarget = { type: "tool" | "planning"; itemId: number; log?: Log } | null;

/* ─────────────── main dashboard ─────────────── */
export default function Dashboard() {
  const qc = useQueryClient();

  const { data: tools = [] } = useGetTools<Tool[]>();
  const { data: plannings = [] } = useGetPlannings<Planning[]>();
  const { data: accounts = [] } = useGetAccounts<string[]>();
  const { data: stats } = useGetStats();

  const createTool = useCreateTool();
  const updateTool = useUpdateTool();
  const deleteTool = useDeleteTool();
  const createPlanning = useCreatePlanning();
  const updatePlanning = useUpdatePlanning();
  const deletePlanning = useDeletePlanning();
  const convertPlan = useConvertPlanningToToolFromPlanning();
  const createToolLog = useCreateToolLog();
  const createPlanningLog = useCreatePlanningLog();
  const updateLog = useUpdateLog();
  const deleteLog = useDeleteLog();
  const createAccount = useCreateAccount();

  const [tab, setTab] = useState<TabType>("tools");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<TabType>("tools");
  const [toast, setToast] = useState({ show: false, msg: "" });
  const [logTarget, setLogTarget] = useState<LogTarget>(null);
  const [logText, setLogText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetToolsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetPlanningsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetStatsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetAccountsQueryKey() });
  }, [qc]);

  const notify = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, msg });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2500);
  }, []);

  const openAddForm = (type: TabType) => {
    setFormType(type);
    setForm(defaultForm);
    setEditId(null);
    setFormOpen(true);
    setMenuOpen(false);
  };

  const closeForm = () => { setFormOpen(false); setEditId(null); setForm(defaultForm); };

  const setF = (key: keyof FormState, val: string) => setForm(prev => ({ ...prev, [key]: val as never }));

  const maybeAddAccount = async (email: string) => {
    if (email && !accounts.includes(email)) {
      await createAccount.mutateAsync({ data: { email } });
      qc.invalidateQueries({ queryKey: getGetAccountsQueryKey() });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { notify("Nama tidak boleh kosong"); return; }
    setSaving(true);
    try {
      if (formType === "tools") {
        const payload = {
          name: form.name, description: form.description, url: form.url,
          status: form.status, createdWith: form.createdWith, createdByAccount: form.createdByAccount,
          deployWith: form.deployWith, deployByAccount: form.deployByAccount,
          version: form.version, releaseDate: form.releaseDate,
        };
        await maybeAddAccount(form.createdByAccount);
        await maybeAddAccount(form.deployByAccount);
        if (editId !== null) { await updateTool.mutateAsync({ toolId: editId, data: payload }); notify("Tool diupdate ✓"); }
        else { await createTool.mutateAsync({ data: payload }); notify("Tool ditambahkan ✓"); }
      } else {
        const payload = { name: form.name, description: form.description, url: form.url, category: form.category, price: form.price, target: form.target };
        if (editId !== null) { await updatePlanning.mutateAsync({ planningId: editId, data: payload }); notify("Planning diupdate ✓"); }
        else { await createPlanning.mutateAsync({ data: payload }); notify("Planning ditambahkan ✓"); }
      }
      invalidateAll();
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleEditTool = (tool: Tool) => {
    setFormType("tools");
    setEditId(tool.id);
    setForm({ name: tool.name, description: tool.description, url: tool.url, status: tool.status as FormState["status"], createdWith: tool.createdWith, createdByAccount: tool.createdByAccount, deployWith: tool.deployWith, deployByAccount: tool.deployByAccount, version: tool.version, releaseDate: tool.releaseDate, category: "Ide", price: "", target: "" });
    setFormOpen(true);
  };

  const handleEditPlanning = (plan: Planning) => {
    setFormType("planning");
    setEditId(plan.id);
    setForm({ ...defaultForm, name: plan.name, description: plan.description, url: plan.url, category: plan.category as FormState["category"], price: plan.price, target: plan.target });
    setFormOpen(true);
  };

  const handleDeleteTool = async (id: number) => {
    if (!confirm("Hapus tool ini?")) return;
    await deleteTool.mutateAsync({ toolId: id });
    invalidateAll(); notify("Tool dihapus");
  };

  const handleDeletePlanning = async (id: number) => {
    if (!confirm("Hapus planning ini?")) return;
    await deletePlanning.mutateAsync({ planningId: id });
    invalidateAll(); notify("Planning dihapus");
  };

  const handleConvert = async (planId: number) => {
    if (!confirm("Pindahkan ke Tool Aktif?")) return;
    await convertPlan.mutateAsync({ planningId: planId });
    invalidateAll(); setTab("tools"); notify("Dipindahkan ke Tool Aktif ✓");
  };

  const openLogModal = (target: LogTarget) => { setLogTarget(target); setLogText(target?.log?.text || ""); };
  const closeLogModal = () => { setLogTarget(null); setLogText(""); };

  const handleSaveLog = async () => {
    if (!logTarget || !logText.trim()) { notify("Catatan kosong"); return; }
    const { type, itemId, log } = logTarget;
    if (log) { await updateLog.mutateAsync({ logId: log.id, data: { text: logText } }); notify("Catatan diperbarui ✓"); }
    else {
      if (type === "tool") await createToolLog.mutateAsync({ toolId: itemId, data: { text: logText } });
      else await createPlanningLog.mutateAsync({ planningId: itemId, data: { text: logText } });
      notify("Catatan disimpan ✓");
    }
    invalidateAll(); closeLogModal();
  };

  const handleDeleteLog = async (logId: number) => {
    await deleteLog.mutateAsync({ logId }); invalidateAll(); notify("Catatan dihapus");
  };

  const handleToggleLog = async (log: Log) => {
    await updateLog.mutateAsync({ logId: log.id, data: { completed: !log.completed } }); invalidateAll();
  };

  const handleBackup = () => {
    const blob = new Blob([JSON.stringify({ tools, plannings, accounts }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gibikey_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    notify("Backup diunduh");
  };

  const statData = (stats as { totalTools?: number; publishedTools?: number; totalPlannings?: number; potentialRevenue?: number } | undefined) || {
    totalTools: tools.length,
    publishedTools: tools.filter((t: Tool) => t.status === "Publish").length,
    totalPlannings: plannings.length,
    potentialRevenue: 0,
  };

  const filteredTools = tools.filter((t: Tool) => t.name.toLowerCase().includes(search.toLowerCase()));
  const inProgress = filteredTools.filter((t: Tool) => t.status !== "Publish");
  const ready = filteredTools.filter((t: Tool) => t.status === "Publish");
  const filteredPlannings = plannings.filter((p: Planning) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {/* Background */}
      <div className="bg-animated"><div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" /></div>
      <div className="grid-pattern" />

      <div className="min-h-screen pb-28">
        {/* ── Top Header ── */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/40">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <div>
                <div className="text-[9px] font-bold tracking-widest text-emerald-400 uppercase leading-none">Gibikey</div>
                <div className="text-sm font-bold text-white leading-tight">Tool Tracker</div>
              </div>
              <span className="version-badge hidden sm:inline">V6</span>
            </div>

            {/* Stats chips */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 justify-center">
              {[
                { label: "Tool", value: statData.totalTools, color: "text-white" },
                { label: "Live", value: statData.publishedTools, color: "text-emerald-400" },
                { label: "Idea", value: statData.totalPlannings, color: "text-amber-400" },
              ].map(s => (
                <div key={s.label} className="flex-shrink-0 glass-card px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <span className={`text-base font-bold font-display ${s.color}`}>{s.value}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Menu */}
            <div className="relative flex-shrink-0">
              <button onClick={() => setMenuOpen(v => !v)}
                className="w-9 h-9 rounded-xl bg-slate-800/70 flex items-center justify-center text-slate-400 active:text-white transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-11 z-50 glass-card rounded-2xl overflow-hidden min-w-44 shadow-xl border border-slate-700/40">
                  <button onClick={handleBackup} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-slate-300 hover:bg-white/5 active:bg-white/10 transition">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Backup Data
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tab + Search row */}
          <div className="max-w-3xl mx-auto px-4 pb-3 flex gap-2">
            <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl flex-shrink-0">
              {(["tools", "planning"] as TabType[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${tab === t ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "text-slate-500 hover:text-slate-300"}`}>
                  {t === "tools" ? "Tool" : "Planning"}
                </button>
              ))}
            </div>
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." className="input-field w-full px-3 py-2.5 pl-9 text-sm rounded-xl" />
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="max-w-3xl mx-auto px-3 pt-4">
          {tab === "tools" && (
            <>
              {filteredTools.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                  <p className="text-slate-400 font-semibold mb-1">Belum ada tool</p>
                  <p className="text-slate-600 text-sm">Ketuk tombol <span className="text-emerald-400 font-bold">+</span> di bawah untuk menambahkan</p>
                </div>
              ) : (
                <>
                  {inProgress.length > 0 && (
                    <>
                      {inProgress.length > 0 && ready.length > 0 && (
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span>Dalam Proses</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{inProgress.length}</span>
                        </div>
                      )}
                      <div className="card-grid mb-4">
                        {inProgress.map(tool => (
                          <ToolCard key={tool.id} tool={tool}
                            onEdit={() => handleEditTool(tool)} onDelete={() => handleDeleteTool(tool.id)}
                            onLog={() => openLogModal({ type: "tool", itemId: tool.id })}
                            onEditLog={log => openLogModal({ type: "tool", itemId: tool.id, log })}
                            onDeleteLog={handleDeleteLog} onToggleLog={handleToggleLog} />
                        ))}
                      </div>
                    </>
                  )}
                  {ready.length > 0 && (
                    <>
                      <div className="section-divider">
                        <div className="section-line" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Publish ({ready.length})
                        </span>
                        <div className="section-line" />
                      </div>
                      <div className="card-grid">
                        {ready.map(tool => (
                          <ToolCard key={tool.id} tool={tool}
                            onEdit={() => handleEditTool(tool)} onDelete={() => handleDeleteTool(tool.id)}
                            onLog={() => openLogModal({ type: "tool", itemId: tool.id })}
                            onEditLog={log => openLogModal({ type: "tool", itemId: tool.id, log })}
                            onDeleteLog={handleDeleteLog} onToggleLog={handleToggleLog} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {tab === "planning" && (
            <>
              {filteredPlannings.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <p className="text-slate-400 font-semibold mb-1">Belum ada planning</p>
                  <p className="text-slate-600 text-sm">Ketuk tombol <span className="text-amber-400 font-bold">+</span> di bawah untuk menambahkan</p>
                </div>
              ) : (
                <div className="card-grid">
                  {filteredPlannings.map(plan => (
                    <PlanningCard key={plan.id} plan={plan}
                      onEdit={() => handleEditPlanning(plan)} onDelete={() => handleDeletePlanning(plan.id)}
                      onConvert={() => handleConvert(plan.id)}
                      onLog={() => openLogModal({ type: "planning", itemId: plan.id })}
                      onEditLog={log => openLogModal({ type: "planning", itemId: plan.id, log })}
                      onDeleteLog={handleDeleteLog} onToggleLog={handleToggleLog} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── FAB (Floating Action Button) ── */}
      <div className="fixed bottom-6 right-4 z-40 flex flex-col items-end gap-2">
        <button
          onClick={() => openAddForm(tab)}
          className="btn-primary w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/40"
          aria-label="Tambah"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      {/* ── Form Modal (bottom sheet) ── */}
      <div
        className={`fixed inset-0 z-50 flex flex-col justify-end transition-all duration-300 ${formOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={e => { if (e.target === e.currentTarget) closeForm(); }}
        style={{ background: formOpen ? "rgba(0,0,0,0.65)" : "transparent", backdropFilter: formOpen ? "blur(4px)" : "none" }}
      >
        <div className={`bg-slate-900 rounded-t-3xl border-t border-slate-700/50 max-h-[92vh] flex flex-col transition-transform duration-300 ${formOpen ? "translate-y-0" : "translate-y-full"}`}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-slate-800 flex-shrink-0">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{editId ? "Edit" : "Tambah"}</div>
              <h2 className="text-lg font-bold text-white">{formType === "tools" ? "Tool Aktif" : "Planning / Ide"}</h2>
            </div>
            <button onClick={closeForm} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 active:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Scrollable form body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            {/* Nama */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Nama *</label>
              <input value={form.name} onChange={e => setF("name", e.target.value)} required placeholder={formType === "tools" ? "Nama tool..." : "Nama ide / proyek..."} className="input-field w-full px-4 py-3.5 text-base rounded-xl" autoFocus />
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Deskripsi</label>
              <textarea value={form.description} onChange={e => setF("description", e.target.value)} rows={2} placeholder="Catatan singkat..." className="input-field w-full px-4 py-3 text-sm rounded-xl resize-none" />
            </div>

            {/* Link */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">Link</label>
              <input type="url" value={form.url} onChange={e => setF("url", e.target.value)} placeholder="https://..." className="input-field w-full px-4 py-3 text-sm rounded-xl" />
            </div>

            {formType === "tools" && (
              <>
                {/* Status */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Pending", "Deploy", "Publish"] as FormState["status"][]).map(s => (
                      <button key={s} type="button" onClick={() => setF("status", s)}
                        className={`py-3 rounded-xl text-xs font-bold border transition ${form.status === s ? (s === "Publish" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : s === "Deploy" ? "bg-sky-500/15 border-sky-500/40 text-sky-400" : "bg-amber-500/15 border-amber-500/40 text-amber-400") : "bg-slate-800/60 border-slate-700/40 text-slate-500"}`}>
                        {s === "Pending" ? "Proses" : s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dibuat dengan */}
                <div className="rounded-2xl bg-slate-800/50 border border-slate-700/40 p-4 space-y-3">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Dibuat Dengan</div>
                  <PlatformSelect label="Platform" value={form.createdWith} onChange={v => setF("createdWith", v)} options={CREATED_WITH_OPTIONS} />
                  <AccountSelect label="Akun Email" value={form.createdByAccount} onChange={v => setF("createdByAccount", v)} accounts={accounts} placeholder="email@lovable.app" />
                </div>

                {/* Deploy dengan */}
                <div className="rounded-2xl bg-sky-950/30 border border-sky-800/30 p-4 space-y-3">
                  <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Di-deploy Dengan</div>
                  <PlatformSelect label="Platform" value={form.deployWith} onChange={v => setF("deployWith", v)} options={DEPLOY_WITH_OPTIONS} />
                  <AccountSelect label="Akun Email" value={form.deployByAccount} onChange={v => setF("deployByAccount", v)} accounts={accounts} placeholder="email@vercel.app" />
                </div>

                {/* Rilis (only when Publish) */}
                {form.status === "Publish" && (
                  <div className="rounded-2xl bg-emerald-950/30 border border-emerald-800/30 p-4 space-y-3">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Info Rilis</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-400">Versi</label>
                        <input value={form.version} onChange={e => setF("version", e.target.value)} placeholder="1.0.0" className="input-field w-full px-3 py-3 rounded-xl text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-400">Tgl Rilis</label>
                        <input type="date" value={form.releaseDate} onChange={e => setF("releaseDate", e.target.value)} className="input-field w-full px-3 py-3 rounded-xl text-sm" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {formType === "planning" && (
              <>
                {/* Kategori */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400">Kategori</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Ide", "Untuk Dijual", "Portofolio", "Internal", "Abandon"] as FormState["category"][]).map(c => (
                      <button key={c} type="button" onClick={() => setF("category", c)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition ${form.category === c ? "bg-amber-500/15 border-amber-500/40 text-amber-400" : "bg-slate-800/60 border-slate-700/40 text-slate-500"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Estimasi Harga (Rp)</label>
                  <input type="number" value={form.price} onChange={e => setF("price", e.target.value)} placeholder="50000" className="input-field w-full px-4 py-3 text-sm rounded-xl" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Target Market</label>
                  <input value={form.target} onChange={e => setF("target", e.target.value)} placeholder="UMKM, Pelajar, Freelancer..." className="input-field w-full px-4 py-3 text-sm rounded-xl" />
                </div>
              </>
            )}

            {/* Submit */}
            <div className="flex gap-3 pb-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {editId ? "Simpan Perubahan" : `Tambah ${formType === "tools" ? "Tool" : "Planning"}`}
              </button>
              {editId && (
                <button type="button" onClick={closeForm} className="bg-slate-800 text-slate-300 font-bold px-5 py-4 rounded-2xl text-sm transition active:bg-slate-700">
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* ── Log Modal ── */}
      <div
        className={`fixed inset-0 z-[70] flex flex-col justify-end transition-all duration-300 ${logTarget ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={e => { if (e.target === e.currentTarget) closeLogModal(); }}
        style={{ background: logTarget ? "rgba(0,0,0,0.65)" : "transparent", backdropFilter: logTarget ? "blur(4px)" : "none" }}
      >
        <div className={`bg-slate-900 rounded-t-3xl border-t border-slate-700/50 transition-transform duration-300 ${logTarget ? "translate-y-0" : "translate-y-full"}`}>
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-slate-700" /></div>
          <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-slate-800">
            <h3 className="text-base font-bold">{logTarget?.log ? "Edit Catatan" : "Tambah Catatan"}</h3>
            <button onClick={closeLogModal} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-5 space-y-4">
            <textarea rows={4} value={logText} onChange={e => setLogText(e.target.value)} className="input-field w-full px-4 py-3 text-sm rounded-2xl resize-none" placeholder="Tulis aktivitas, progress, atau catatan..." autoFocus />
            <div className="flex gap-3">
              <button onClick={handleSaveLog} className="btn-primary flex-1 py-4 rounded-2xl text-sm font-bold">Simpan Catatan</button>
              <button onClick={closeLogModal} className="bg-slate-800 text-slate-300 font-bold px-5 py-4 rounded-2xl text-sm">Batal</button>
            </div>
          </div>
        </div>
      </div>

      {/* close dropdown overlay */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

      <Toast message={toast.msg} show={toast.show} />
    </>
  );
}
