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
import { useAuth } from "@workspace/replit-auth-web";
import type { Tool, Planning, Log, TabType } from "@/types";

const CREATED_WITH_OPTIONS = ["Z.ai", "Gemini Canvas", "Lovable", "Replit", "GPT", "Manual Coding"];
const DEPLOY_WITH_OPTIONS = ["Lovable", "Replit", "GitHub Pages", "Vercel", "Netlify"];

function Toast({ message, show }: { message: string; show: boolean }) {
  return (
    <div className={`toast fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl z-50 font-bold text-sm text-emerald-400 transition-all duration-300 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "Publish" ? "badge-publish" : status === "Deploy" ? "badge-deploy" : "badge-pending";
  return <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${cls}`}>{status}</span>;
}

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, string> = {
    "Ide": "badge-ide", "Untuk Dijual": "badge-dijual",
    "Portofolio": "badge-portfolio", "Internal": "badge-internal", "Abandon": "badge-abandon",
  };
  return <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${map[category] || "badge-ide"}`}>{category}</span>;
}

function LogSection({
  logs, onAddLog, onEditLog, onDeleteLog, onToggleComplete,
}: {
  logs: Log[];
  onAddLog: () => void;
  onEditLog: (log: Log) => void;
  onDeleteLog: (logId: number) => void;
  onToggleComplete: (log: Log) => void;
}) {
  const [open, setOpen] = useState(false);
  const done = logs.filter(l => l.completed).length;

  return (
    <div className="border-t border-slate-700/40 mt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-[10px] text-slate-400 hover:text-slate-300 transition py-2 px-4"
      >
        <span>Catatan ({done}/{logs.length})</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      <div className={`collapsible-content ${open ? "expanded" : "collapsed"}`}>
        <div className="px-3 pb-3 space-y-1.5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Riwayat</span>
            <button onClick={onAddLog} className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Tambah
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {logs.length === 0 && <p className="text-[11px] text-slate-600 text-center py-3">Belum ada catatan</p>}
            {logs.map(log => (
              <div key={log.id} className={`log-item rounded-lg border border-slate-700/30 p-2 text-xs ${log.completed ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-2">
                  <button onClick={() => onToggleComplete(log)} className={`w-4 h-4 flex-shrink-0 rounded border mt-0.5 flex items-center justify-center transition ${log.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-500 hover:border-emerald-500"}`}>
                    {log.completed && <svg className="w-2.5 h-2.5 stroke-slate-900" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] text-slate-500">{log.date}</span>
                      <div className="flex gap-1">
                        <button onClick={() => onEditLog(log)} className="text-slate-500 hover:text-emerald-400 transition">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => onDeleteLog(log.id)} className="text-slate-500 hover:text-red-400 transition">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    <p className={`text-slate-300 leading-relaxed whitespace-pre-line ${log.completed ? "line-through text-slate-500" : ""}`}>{log.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool, onEdit, onDelete, onLog, onEditLog, onDeleteLog, onToggleLog }: {
  tool: Tool;
  onEdit: () => void;
  onDelete: () => void;
  onLog: () => void;
  onEditLog: (log: Log) => void;
  onDeleteLog: (logId: number) => void;
  onToggleLog: (log: Log) => void;
}) {
  const progCls = tool.status === "Publish" ? "progress-publish" : tool.status === "Deploy" ? "progress-deploy" : "progress-pending";
  const createdInfo = [tool.createdWith, tool.createdByAccount].filter(Boolean).join(" / ");
  const deployInfo = [tool.deployWith, tool.deployByAccount].filter(Boolean).join(" / ");

  return (
    <div className="card-enter glass-card rounded-2xl overflow-hidden flex flex-col">
      <div className="p-4 flex-1">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <h3 className="font-bold text-white text-sm tracking-tight truncate">{tool.name}</h3>
              <StatusBadge status={tool.status} />
              {tool.version && <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">v{tool.version}</span>}
            </div>
            {tool.description && <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{tool.description}</p>}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onEdit} className="action-btn p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg bg-slate-800/60" title="Edit">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={onDelete} className="action-btn p-1.5 text-slate-400 hover:text-red-400 rounded-lg bg-slate-800/60" title="Hapus">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>

        <div className="space-y-1 text-[11px]">
          {createdInfo && (
            <div className="flex gap-2">
              <span className="text-slate-500 w-14 flex-shrink-0">Dibuat</span>
              <span className="text-slate-300 truncate">{createdInfo}</span>
            </div>
          )}
          {deployInfo && (
            <div className="flex gap-2">
              <span className="text-slate-500 w-14 flex-shrink-0">Deploy</span>
              <span className="text-sky-400 truncate">{deployInfo}</span>
            </div>
          )}
          {tool.releaseDate && (
            <div className="flex gap-2">
              <span className="text-slate-500 w-14 flex-shrink-0">Rilis</span>
              <span className="text-emerald-400">{new Date(tool.releaseDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          )}
          {tool.url && (
            <div className="flex gap-2">
              <span className="text-slate-500 w-14 flex-shrink-0">Link</span>
              <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 truncate flex items-center gap-1">
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                <span className="truncate">{tool.url.replace(/^https?:\/\//, "")}</span>
              </a>
            </div>
          )}
        </div>

        <div className="progress-track mt-3">
          <div className={`progress-fill ${progCls}`} />
        </div>
      </div>

      <LogSection
        logs={tool.logs}
        onAddLog={onLog}
        onEditLog={onEditLog}
        onDeleteLog={onDeleteLog}
        onToggleComplete={onToggleLog}
      />
    </div>
  );
}

function PlanningCard({ plan, onEdit, onDelete, onConvert, onLog, onEditLog, onDeleteLog, onToggleLog }: {
  plan: Planning;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
  onLog: () => void;
  onEditLog: (log: Log) => void;
  onDeleteLog: (logId: number) => void;
  onToggleLog: (log: Log) => void;
}) {
  const priceFormatted = plan.price ? `Rp ${parseInt(plan.price).toLocaleString("id-ID")}` : null;

  return (
    <div className="card-enter glass-card rounded-2xl overflow-hidden flex flex-col border-l-2 border-amber-500/40">
      <div className="p-4 flex-1">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <h3 className="font-bold text-white text-sm tracking-tight truncate">{plan.name}</h3>
              <CategoryBadge category={plan.category} />
            </div>
            {plan.description && <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{plan.description}</p>}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onConvert} className="action-btn p-1.5 text-sky-400 hover:text-sky-300 rounded-lg bg-sky-900/30" title="Jadikan Tool">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button onClick={onEdit} className="action-btn p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg bg-slate-800/60" title="Edit">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button onClick={onDelete} className="action-btn p-1.5 text-slate-400 hover:text-red-400 rounded-lg bg-slate-800/60" title="Hapus">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>

        <div className="space-y-1 text-[11px]">
          {priceFormatted && (
            <div className="flex gap-2">
              <span className="text-slate-500 w-14 flex-shrink-0">Harga</span>
              <span className="text-amber-400 font-bold">{priceFormatted}</span>
            </div>
          )}
          {plan.target && (
            <div className="flex gap-2">
              <span className="text-slate-500 w-14 flex-shrink-0">Target</span>
              <span className="text-slate-300 truncate">{plan.target}</span>
            </div>
          )}
          {plan.url && (
            <div className="flex gap-2">
              <span className="text-slate-500 w-14 flex-shrink-0">Link</span>
              <a href={plan.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 truncate">
                {plan.url.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
        </div>
      </div>

      <LogSection
        logs={plan.logs}
        onAddLog={onLog}
        onEditLog={onEditLog}
        onDeleteLog={onDeleteLog}
        onToggleComplete={onToggleLog}
      />
    </div>
  );
}

function AccountSelect({ label, value, onChange, accounts, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accounts: string[];
  placeholder?: string;
}) {
  const [showCustom, setShowCustom] = useState(!accounts.includes(value) && value !== "");

  return (
    <div>
      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">{label}</label>
      <select
        value={showCustom ? "__custom__" : value}
        onChange={e => {
          if (e.target.value === "__custom__") { setShowCustom(true); onChange(""); }
          else { setShowCustom(false); onChange(e.target.value); }
        }}
        className="input-field w-full p-2 rounded-lg text-xs"
        style={{ appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "14px", paddingRight: "32px" }}
      >
        <option value="">Pilih Akun</option>
        {accounts.map(a => <option key={a} value={a}>{a}</option>)}
        <option value="__custom__">Tambah Baru...</option>
      </select>
      {(showCustom || (!accounts.includes(value) && value !== "")) && (
        <input
          type="email"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || "email@contoh.com"}
          className="input-field w-full p-2 rounded-lg text-xs mt-1"
          autoFocus
        />
      )}
    </div>
  );
}

function PlatformSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [showCustom, setShowCustom] = useState(!options.includes(value) && value !== "");

  return (
    <div>
      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">{label}</label>
      <select
        value={showCustom ? "__custom__" : value}
        onChange={e => {
          if (e.target.value === "__custom__") { setShowCustom(true); onChange(""); }
          else { setShowCustom(false); onChange(e.target.value); }
        }}
        className="input-field w-full p-2 rounded-lg text-xs"
        style={{ appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "14px", paddingRight: "32px" }}
      >
        <option value="">Pilih...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__custom__">Lainnya...</option>
      </select>
      {(showCustom || (!options.includes(value) && value !== "")) && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Nama platform"
          className="input-field w-full p-2 rounded-lg text-xs mt-1"
          autoFocus
        />
      )}
    </div>
  );
}

interface FormState {
  name: string;
  description: string;
  url: string;
  status: "Pending" | "Deploy" | "Publish";
  createdWith: string;
  createdByAccount: string;
  deployWith: string;
  deployByAccount: string;
  version: string;
  releaseDate: string;
  category: "Ide" | "Untuk Dijual" | "Portofolio" | "Internal" | "Abandon";
  price: string;
  target: string;
}

const defaultForm: FormState = {
  name: "", description: "", url: "", status: "Pending",
  createdWith: "", createdByAccount: "", deployWith: "", deployByAccount: "",
  version: "", releaseDate: "", category: "Ide", price: "", target: "",
};

type LogTarget = { type: "tool" | "planning"; itemId: number; log?: Log } | null;

export default function Dashboard() {
  const { user, logout } = useAuth();
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
  const [toast, setToast] = useState({ show: false, msg: "" });
  const [logTarget, setLogTarget] = useState<LogTarget>(null);
  const [logText, setLogText] = useState("");
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

  const resetForm = useCallback(() => {
    setForm(defaultForm);
    setEditId(null);
  }, []);

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

    if (tab === "tools") {
      const payload = {
        name: form.name, description: form.description, url: form.url,
        status: form.status, createdWith: form.createdWith, createdByAccount: form.createdByAccount,
        deployWith: form.deployWith, deployByAccount: form.deployByAccount,
        version: form.version, releaseDate: form.releaseDate,
      };
      await maybeAddAccount(form.createdByAccount);
      await maybeAddAccount(form.deployByAccount);

      if (editId !== null) {
        await updateTool.mutateAsync({ toolId: editId, data: payload });
        notify("Tool diupdate");
      } else {
        await createTool.mutateAsync({ data: payload });
        notify("Tool disimpan");
      }
    } else {
      const payload = {
        name: form.name, description: form.description, url: form.url,
        category: form.category, price: form.price, target: form.target,
      };
      if (editId !== null) {
        await updatePlanning.mutateAsync({ planningId: editId, data: payload });
        notify("Planning diupdate");
      } else {
        await createPlanning.mutateAsync({ data: payload });
        notify("Planning disimpan");
      }
    }
    invalidateAll();
    resetForm();
  };

  const handleEditTool = (tool: Tool) => {
    setTab("tools");
    setEditId(tool.id);
    setForm({
      name: tool.name, description: tool.description, url: tool.url,
      status: tool.status as FormState["status"],
      createdWith: tool.createdWith, createdByAccount: tool.createdByAccount,
      deployWith: tool.deployWith, deployByAccount: tool.deployByAccount,
      version: tool.version, releaseDate: tool.releaseDate,
      category: "Ide", price: "", target: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditPlanning = (plan: Planning) => {
    setTab("planning");
    setEditId(plan.id);
    setForm({
      ...defaultForm,
      name: plan.name, description: plan.description, url: plan.url,
      category: plan.category as FormState["category"],
      price: plan.price, target: plan.target,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteTool = async (id: number) => {
    if (!confirm("Hapus tool ini?")) return;
    await deleteTool.mutateAsync({ toolId: id });
    invalidateAll();
    notify("Tool dihapus");
  };

  const handleDeletePlanning = async (id: number) => {
    if (!confirm("Hapus planning ini?")) return;
    await deletePlanning.mutateAsync({ planningId: id });
    invalidateAll();
    notify("Planning dihapus");
  };

  const handleConvert = async (planId: number) => {
    if (!confirm("Pindahkan ke Tool Aktif?")) return;
    await convertPlan.mutateAsync({ planningId: planId });
    invalidateAll();
    setTab("tools");
    notify("Dipindahkan ke Tool Aktif");
  };

  const openLogModal = (target: LogTarget) => {
    setLogTarget(target);
    setLogText(target?.log?.text || "");
  };
  const closeLogModal = () => { setLogTarget(null); setLogText(""); };

  const handleSaveLog = async () => {
    if (!logTarget || !logText.trim()) { notify("Catatan kosong"); return; }
    const { type, itemId, log } = logTarget;
    if (log) {
      await updateLog.mutateAsync({ logId: log.id, data: { text: logText } });
      notify("Catatan diperbarui");
    } else {
      if (type === "tool") await createToolLog.mutateAsync({ toolId: itemId, data: { text: logText } });
      else await createPlanningLog.mutateAsync({ planningId: itemId, data: { text: logText } });
      notify("Catatan ditambahkan");
    }
    invalidateAll();
    closeLogModal();
  };

  const handleDeleteLog = async (logId: number) => {
    await deleteLog.mutateAsync({ logId });
    invalidateAll();
    notify("Catatan dihapus");
  };

  const handleToggleLog = async (log: Log) => {
    await updateLog.mutateAsync({ logId: log.id, data: { completed: !log.completed } });
    invalidateAll();
  };

  const handleBackup = () => {
    const data = JSON.stringify({ tools, plannings, accounts }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gibikey_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    notify("Backup diunduh");
  };

  const filteredTools = tools.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const inProgress = filteredTools.filter(t => t.status !== "Publish");
  const ready = filteredTools.filter(t => t.status === "Publish");
  const filteredPlannings = plannings.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const statData = stats || { totalTools: tools.length, publishedTools: tools.filter((t: Tool) => t.status === "Publish").length, totalPlannings: plannings.length, potentialRevenue: 0 };

  return (
    <>
      <div className="bg-animated"><div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" /></div>
      <div className="grid-pattern" />

      <div className="p-4 md:p-6 relative min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                  <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Gibikey Studio</span>
                  <span className="version-badge">V6.0</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Tool <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Tracker</span>
                </h1>
                <p className="text-slate-400 text-sm mt-1">Dashboard Monitoring Proyek & Planning</p>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-3">
                {/* Stats */}
                <div className="flex gap-2">
                  {[
                    { label: "Tool", value: statData.totalTools, color: "text-white" },
                    { label: "Publish", value: statData.publishedTools, color: "text-emerald-400" },
                    { label: "Planning", value: statData.totalPlannings, color: "text-amber-400" },
                  ].map(s => (
                    <div key={s.label} className="glass-card px-3 py-2 rounded-xl text-center">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
                      <div className={`text-xl font-bold font-display ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                  {statData.potentialRevenue > 0 && (
                    <div className="glass-card px-3 py-2 rounded-xl text-center hidden md:block">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-sky-400">Potensi</div>
                      <div className="text-sm font-bold text-sky-400">Rp {statData.potentialRevenue.toLocaleString("id-ID")}</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 items-center">
                  <button onClick={handleBackup} className="text-[10px] bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 px-3 py-2 rounded-lg font-bold transition border border-slate-700/50 flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Backup
                  </button>
                  <button onClick={logout} className="text-[10px] bg-slate-800/60 hover:bg-red-900/30 text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg font-bold transition border border-slate-700/50">
                    Keluar
                  </button>
                  {user?.profileImage && <img src={user.profileImage} alt="" className="w-8 h-8 rounded-full border border-emerald-500/30" />}
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar Form */}
            <aside className="lg:col-span-3">
              <div className="glass-card rounded-2xl sticky top-6 overflow-hidden">
                <div className="p-4 border-b border-slate-700/50">
                  <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    {editId ? "Edit" : "Tambah"} {tab === "tools" ? "Tool" : "Planning"}
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama *</label>
                    <input value={form.name} onChange={e => setF("name", e.target.value)} required placeholder="Nama tool..." className="input-field w-full p-2.5 text-sm" />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deskripsi</label>
                    <textarea value={form.description} onChange={e => setF("description", e.target.value)} rows={2} placeholder="Catatan singkat..." className="input-field w-full p-2.5 text-sm resize-none" />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Link</label>
                    <input type="url" value={form.url} onChange={e => setF("url", e.target.value)} placeholder="https://..." className="input-field w-full p-2.5 text-sm" />
                  </div>

                  {tab === "tools" && (
                    <>
                      {/* Dibuat Dengan */}
                      <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/40 space-y-2">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase">Dibuat Dengan</span>
                        <div className="grid grid-cols-2 gap-2">
                          <PlatformSelect label="Platform" value={form.createdWith} onChange={v => setF("createdWith", v)} options={CREATED_WITH_OPTIONS} />
                          <AccountSelect label="Akun Email" value={form.createdByAccount} onChange={v => setF("createdByAccount", v)} accounts={accounts} placeholder="email@lovable.app" />
                        </div>
                      </div>

                      {/* Deploy Dengan */}
                      <div className="p-3 rounded-xl bg-sky-900/15 border border-sky-800/30 space-y-2">
                        <span className="text-[9px] font-bold text-sky-400 uppercase">Di-deploy Dengan</span>
                        <div className="grid grid-cols-2 gap-2">
                          <PlatformSelect label="Platform" value={form.deployWith} onChange={v => setF("deployWith", v)} options={DEPLOY_WITH_OPTIONS} />
                          <AccountSelect label="Akun Email" value={form.deployByAccount} onChange={v => setF("deployByAccount", v)} accounts={accounts} placeholder="email@vercel.app" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                        <select value={form.status} onChange={e => setF("status", e.target.value)} className="input-field w-full p-2.5 text-sm" style={{ appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px", paddingRight: "36px" }}>
                          <option value="Pending">Dalam Pengerjaan</option>
                          <option value="Deploy">Deploy</option>
                          <option value="Publish">Publish (Siap Pakai)</option>
                        </select>
                      </div>

                      {form.status === "Publish" && (
                        <div className="p-3 rounded-xl bg-emerald-900/15 border border-emerald-700/30 space-y-2">
                          <span className="text-[9px] font-bold text-emerald-400 uppercase">Informasi Rilis</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Versi</label>
                              <input value={form.version} onChange={e => setF("version", e.target.value)} placeholder="1.0.0" className="input-field w-full p-2 text-sm" />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Tgl Rilis</label>
                              <input type="date" value={form.releaseDate} onChange={e => setF("releaseDate", e.target.value)} className="input-field w-full p-2 text-sm" />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {tab === "planning" && (
                    <>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori</label>
                        <select value={form.category} onChange={e => setF("category", e.target.value)} className="input-field w-full p-2.5 text-sm" style={{ appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: "14px", paddingRight: "36px" }}>
                          <option value="Ide">Ide Mentah</option>
                          <option value="Untuk Dijual">Untuk Dijual</option>
                          <option value="Portofolio">Portofolio</option>
                          <option value="Internal">Internal</option>
                          <option value="Abandon">Abandon</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estimasi Harga (Rp)</label>
                        <input type="number" value={form.price} onChange={e => setF("price", e.target.value)} placeholder="50000" className="input-field w-full p-2.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Market</label>
                        <input value={form.target} onChange={e => setF("target", e.target.value)} placeholder="UMKM, Pelajar..." className="input-field w-full p-2.5 text-sm" />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="btn-primary flex-1 py-2.5 rounded-xl text-sm">
                      {editId ? `Update ${tab === "tools" ? "Tool" : "Planning"}` : "Simpan"}
                    </button>
                    {editId !== null && (
                      <button type="button" onClick={resetForm} className="bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-sm transition">
                        Batal
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-9">
              {/* Tabs + Search */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex gap-2">
                  {(["tools", "planning"] as TabType[]).map(t => (
                    <button key={t} onClick={() => { setTab(t); resetForm(); }} className={`tab-btn ${tab === t ? "active" : ""}`}>
                      {t === "tools" ? "Tool Aktif" : "Planning & Ideas"}
                    </button>
                  ))}
                </div>
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..." className="input-field w-full p-2.5 pl-9 text-sm" />
                </div>
              </div>

              {tab === "tools" && (
                <>
                  {filteredTools.length === 0 ? (
                    <div className="text-center py-20 rounded-2xl border-2 border-dashed border-slate-700/40">
                      <p className="text-slate-500 font-medium">Belum ada tool</p>
                      <p className="text-slate-600 text-sm mt-1">Gunakan form di kiri untuk menambahkan</p>
                    </div>
                  ) : (
                    <>
                      {inProgress.length > 0 && (
                        <div className="card-grid mb-4">
                          {inProgress.map(tool => (
                            <ToolCard key={tool.id} tool={tool}
                              onEdit={() => handleEditTool(tool)}
                              onDelete={() => handleDeleteTool(tool.id)}
                              onLog={() => openLogModal({ type: "tool", itemId: tool.id })}
                              onEditLog={log => openLogModal({ type: "tool", itemId: tool.id, log })}
                              onDeleteLog={handleDeleteLog}
                              onToggleLog={handleToggleLog}
                            />
                          ))}
                        </div>
                      )}
                      {ready.length > 0 && (
                        <>
                          <div className="section-divider">
                            <div className="section-line" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Tool Siap Pakai
                            </span>
                            <div className="section-line" />
                          </div>
                          <div className="card-grid">
                            {ready.map(tool => (
                              <ToolCard key={tool.id} tool={tool}
                                onEdit={() => handleEditTool(tool)}
                                onDelete={() => handleDeleteTool(tool.id)}
                                onLog={() => openLogModal({ type: "tool", itemId: tool.id })}
                                onEditLog={log => openLogModal({ type: "tool", itemId: tool.id, log })}
                                onDeleteLog={handleDeleteLog}
                                onToggleLog={handleToggleLog}
                              />
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
                    <div className="text-center py-20 rounded-2xl border-2 border-dashed border-slate-700/40">
                      <p className="text-slate-500 font-medium">Belum ada planning</p>
                      <p className="text-slate-600 text-sm mt-1">Gunakan form di kiri untuk menambahkan</p>
                    </div>
                  ) : (
                    <div className="card-grid">
                      {filteredPlannings.map(plan => (
                        <PlanningCard key={plan.id} plan={plan}
                          onEdit={() => handleEditPlanning(plan)}
                          onDelete={() => handleDeletePlanning(plan.id)}
                          onConvert={() => handleConvert(plan.id)}
                          onLog={() => openLogModal({ type: "planning", itemId: plan.id })}
                          onEditLog={log => openLogModal({ type: "planning", itemId: plan.id, log })}
                          onDeleteLog={handleDeleteLog}
                          onToggleLog={handleToggleLog}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Log Modal */}
      <div className={`modal-overlay ${logTarget ? "active" : ""}`} onClick={e => { if (e.target === e.currentTarget) closeLogModal(); }}>
        <div className="modal-content p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-base">{logTarget?.log ? "Edit Catatan" : "Tambah Catatan"}</h3>
            <button onClick={closeLogModal} className="text-slate-400 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <textarea
            rows={5}
            value={logText}
            onChange={e => setLogText(e.target.value)}
            className="input-field w-full p-3 text-sm resize-none"
            placeholder="Tulis catatan aktivitas..."
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button onClick={handleSaveLog} className="btn-primary flex-1 py-2.5 rounded-xl text-sm">Simpan</button>
            <button onClick={closeLogModal} className="bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 font-bold px-5 py-2.5 rounded-xl text-sm transition">Batal</button>
          </div>
        </div>
      </div>

      <Toast message={toast.msg} show={toast.show} />
    </>
  );
}
