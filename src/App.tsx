import { useState, useEffect, useMemo } from "react";

// ─── Persistência ────────────────────────────────────────────────────────────
const STORAGE_KEY = "fs_patrimonial_v2";
function loadData() { try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {} return null; }
function saveData(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

// ─── Dados de exemplo ────────────────────────────────────────────────────────
const INITIAL_DATA = {
  imoveis: [
    { id: "1", nome: "Apto 101 - Centro", tipo: "Apartamento", endereco: "Rua das Flores, 101", status: "Alugado", valor_avaliado: 350000 },
    { id: "2", nome: "Casa Jardins", tipo: "Casa", endereco: "Av. dos Jardins, 45", status: "Disponível", valor_avaliado: 620000 },
    { id: "3", nome: "Sala Comercial 3B", tipo: "Comercial", endereco: "Av. Brasil, 300 - Sala 3B", status: "Alugado", valor_avaliado: 280000 },
    { id: "4", nome: "Cobertura Vila Nova", tipo: "Apartamento", endereco: "Rua Nova, 200 - Cobertura", status: "Temporada", valor_avaliado: 850000 },
  ],
  contratos: [
    { id: "1", imovel_id: "1", inquilino: "Carlos Mendes", tipo: "Mensal", valor: 2200, inicio: "2024-01-01", vencimento: "2025-12-31", dia_pagamento: 5, status: "Ativo" },
    { id: "2", imovel_id: "3", inquilino: "Empresa XYZ Ltda", tipo: "Mensal", valor: 3500, inicio: "2024-03-01", vencimento: "2026-02-28", dia_pagamento: 10, status: "Ativo" },
    { id: "3", imovel_id: "4", inquilino: "Família Souza", tipo: "Temporada", valor: 800, inicio: "2025-01-10", vencimento: "2025-01-20", dia_pagamento: 1, status: "Encerrado" },
  ],
  receitas: [
    { id: "1", imovel_id: "1", descricao: "Aluguel Janeiro", valor: 2200, data: "2025-01-05", tipo: "Aluguel", status: "Recebido" },
    { id: "2", imovel_id: "1", descricao: "Aluguel Fevereiro", valor: 2200, data: "2025-02-05", tipo: "Aluguel", status: "Recebido" },
    { id: "3", imovel_id: "3", descricao: "Aluguel Janeiro", valor: 3500, data: "2025-01-10", tipo: "Aluguel", status: "Recebido" },
    { id: "4", imovel_id: "3", descricao: "Aluguel Fevereiro", valor: 3500, data: "2025-02-10", tipo: "Aluguel", status: "Recebido" },
    { id: "5", imovel_id: "1", descricao: "Aluguel Março", valor: 2200, data: "2025-03-05", tipo: "Aluguel", status: "Pendente" },
  ],
  despesas: [
    { id: "1", imovel_id: "1", descricao: "IPTU", valor: 180, data: "2025-01-15", tipo: "Imposto", vencimento: "2025-01-15", status: "Pago" },
    { id: "2", imovel_id: "1", descricao: "Condomínio", valor: 420, data: "2025-02-10", tipo: "Condomínio", vencimento: "2025-02-10", status: "Pago" },
    { id: "3", imovel_id: "2", descricao: "IPTU", valor: 390, data: "2025-01-15", tipo: "Imposto", vencimento: "2025-03-15", status: "Pendente" },
    { id: "4", imovel_id: "3", descricao: "Manutenção elétrica", valor: 650, data: "2025-02-20", tipo: "Manutenção", vencimento: "2025-02-20", status: "Pago" },
  ],
  manutencoes: [
    { id: "1", imovel_id: "1", descricao: "Revisão hidráulica", responsavel: "João Encanador", data_prevista: "2025-03-20", status: "Pendente", prioridade: "Média", custo_estimado: 400, observacoes: "" },
    { id: "2", imovel_id: "3", descricao: "Pintura sala", responsavel: "Pedro Pintor", data_prevista: "2025-02-28", status: "Concluído", prioridade: "Baixa", custo_estimado: 1200, observacoes: "Finalizado com aprovação do inquilino" },
    { id: "3", imovel_id: "2", descricao: "Troca portão eletrônico", responsavel: "", data_prevista: "2025-04-05", status: "Agendado", prioridade: "Alta", custo_estimado: 2800, observacoes: "" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "-";
const today = () => new Date().toISOString().split("T")[0];
const daysUntil = (d) => { if (!d) return null; return Math.ceil((new Date(d + "T12:00:00") - new Date()) / 86400000); };
const uid = () => Math.random().toString(36).slice(2, 9);

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0f1117", surface: "#161b27", card: "#1c2333", border: "#252d3d",
  accent: "#c9a84c", accentDim: "#c9a84c20", text: "#e8eaf0",
  textMuted: "#7a8499", textSub: "#9aa0b4",
  green: "#3ecf8e", greenDim: "#3ecf8e18",
  red: "#f04f5a", redDim: "#f04f5a18",
  blue: "#4a9eff", blueDim: "#4a9eff18",
  orange: "#ff8c42", orangeDim: "#ff8c4218",
};

const statusColor = (s) => ({
  Ativo: C.green, Recebido: C.green, Pago: C.green, "Concluído": C.green, Alugado: C.green,
  Pendente: C.orange, Agendado: C.blue, Temporada: C.blue,
  "Disponível": C.textMuted, Encerrado: C.textMuted,
  Alta: C.red, "Média": C.orange, Baixa: C.green
}[s] || C.textMuted);

// ─── Atoms ────────────────────────────────────────────────────────────────────
const Badge = ({ color, children }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>
);

const Btn = ({ onClick, children, variant = "primary", style: s = {} }) => {
  const styles = {
    primary: { background: C.accent, color: "#0f1117", border: "none" },
    danger: { background: C.redDim, color: C.red, border: `1px solid ${C.red}44` },
    ghost: { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
  };
  return (
    <button onClick={onClick} style={{ ...styles[variant], borderRadius: 9, padding: "10px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit", transition: "opacity .15s", ...s }}>{children}</button>
  );
};

const Field = ({ label, value, onChange, type = "text", options, placeholder, required }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {label && <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}{required && " *"}</label>}
    {options
      ? <select value={value} onChange={e => onChange(e.target.value)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, fontFamily: "inherit" }}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
      : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%" }} />
    }
  </div>
);

const ImovelSelect = ({ value, onChange, imoveis }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Imóvel *</label>
    <select value={value} onChange={e => onChange(e.target.value)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, fontFamily: "inherit" }}>
      {imoveis.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
    </select>
  </div>
);

const Card = ({ children, style: s = {} }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, ...s }}>{children}</div>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, maxHeight: "92vh", overflow: "auto", padding: "20px 20px 36px" }}>
      <div style={{ width: 36, height: 4, background: C.border, borderRadius: 99, margin: "0 auto 18px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h3 style={{ margin: 0, color: C.text, fontSize: 16, fontWeight: 800 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const PageHeader = ({ title, sub, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 }}>
    <div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.text }}>{title}</h2>
      {sub && <p style={{ margin: "3px 0 0", color: C.textMuted, fontSize: 12 }}>{sub}</p>}
    </div>
    {action}
  </div>
);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ data, imoveis }) {
  const recConf = data.receitas.filter(r => r.status === "Recebido").reduce((a, r) => a + r.valor, 0);
  const recPend = data.receitas.filter(r => r.status === "Pendente").reduce((a, r) => a + r.valor, 0);
  const despPaga = data.despesas.filter(d => d.status === "Pago").reduce((a, d) => a + d.valor, 0);
  const despPend = data.despesas.filter(d => d.status === "Pendente").reduce((a, d) => a + d.valor, 0);
  const resultado = recConf - despPaga;
  const ocupados = imoveis.filter(i => i.status === "Alugado" || i.status === "Temporada").length;

  const alertas = [];
  data.contratos.filter(c => c.status === "Ativo").forEach(c => { const d = daysUntil(c.vencimento); if (d !== null && d <= 60) alertas.push({ tipo: "Contrato", desc: `${c.inquilino} vence em ${d}d`, urgente: d <= 30 }); });
  data.despesas.filter(d => d.status === "Pendente").forEach(d => { const dias = daysUntil(d.vencimento); if (dias !== null && dias <= 10) alertas.push({ tipo: "Conta", desc: `${d.descricao} vence em ${dias}d`, urgente: dias <= 3 }); });
  data.manutencoes.filter(m => m.status !== "Concluído").forEach(m => { const dias = daysUntil(m.data_prevista); if (dias !== null && dias <= 7) alertas.push({ tipo: "Manutenção", desc: `${m.descricao} em ${dias}d`, urgente: m.prioridade === "Alta" }); });

  const KPI = ({ label, value, color, sub }) => (
    <Card style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: color || C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{sub}</div>}
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 10, color: C.accent, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>FS Patrimonial</div>
        <h2 style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 900, color: C.text }}>Dashboard</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <KPI label="Receitas" value={fmt(recConf)} color={C.green} sub={`+${fmt(recPend)} pend.`} />
        <KPI label="Despesas" value={fmt(despPaga)} color={C.red} sub={`+${fmt(despPend)} pend.`} />
        <KPI label="Resultado" value={fmt(resultado)} color={resultado >= 0 ? C.green : C.red} />
        <KPI label="Ocupação" value={`${imoveis.length ? Math.round(ocupados / imoveis.length * 100) : 0}%`} color={C.accent} sub={`${ocupados}/${imoveis.length} imóveis`} />
      </div>

      {alertas.length > 0 && (
        <Card style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>⚠️ Alertas ({alertas.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {alertas.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: a.urgente ? C.redDim : C.orangeDim, border: `1px solid ${(a.urgente ? C.red : C.orange)}33`, borderRadius: 8 }}>
                <Badge color={a.urgente ? C.red : C.orange}>{a.tipo}</Badge>
                <span style={{ fontSize: 12, color: C.text }}>{a.desc}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12 }}>Imóveis por Status</div>
        {["Alugado", "Temporada", "Disponível"].map(s => {
          const count = imoveis.filter(i => i.status === s).length;
          const pct = imoveis.length ? (count / imoveis.length) * 100 : 0;
          return (
            <div key={s} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.textSub }}>{s}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: statusColor(s) }}>{count}</span>
              </div>
              <div style={{ height: 5, background: C.border, borderRadius: 99 }}>
                <div style={{ height: 5, width: `${pct}%`, background: statusColor(s), borderRadius: 99 }} />
              </div>
            </div>
          );
        })}
      </Card>

      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>Manutenções Ativas</div>
        {data.manutencoes.filter(m => m.status !== "Concluído").length === 0
          ? <div style={{ color: C.textMuted, fontSize: 12 }}>Nenhuma pendente ✓</div>
          : data.manutencoes.filter(m => m.status !== "Concluído").map(m => {
            const im = imoveis.find(i => i.id === m.imovel_id);
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{m.descricao}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{im?.nome}</div>
                </div>
                <Badge color={statusColor(m.prioridade)}>{m.prioridade}</Badge>
              </div>
            );
          })}
      </Card>
    </div>
  );
}

// ─── IMÓVEIS ──────────────────────────────────────────────────────────────────
function Imoveis({ imoveis, setImoveis }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const blank = { nome: "", tipo: "Apartamento", endereco: "", status: "Disponível", valor_avaliado: "" };
  const [form, setForm] = useState(blank);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setForm(blank); setEditing(null); setModal(true); };
  const openEdit = im => { setForm({ ...im, valor_avaliado: String(im.valor_avaliado) }); setEditing(im.id); setModal(true); };
  const remove = id => { if (confirm("Remover imóvel?")) setImoveis(p => p.filter(i => i.id !== id)); };
  const save = () => {
    if (!form.nome.trim()) return;
    const item = { ...form, valor_avaliado: parseFloat(form.valor_avaliado) || 0 };
    if (editing) setImoveis(p => p.map(i => i.id === editing ? { ...item, id: editing } : i));
    else setImoveis(p => [...p, { ...item, id: uid() }]);
    setModal(false);
  };

  return (
    <div>
      <PageHeader title="Imóveis" sub={`${imoveis.length} cadastrados`} action={<Btn onClick={openNew}>+ Novo</Btn>} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {imoveis.map(im => (
          <Card key={im.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: C.text, fontSize: 14, marginBottom: 3 }}>{im.nome}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{im.endereco}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge color={statusColor(im.status)}>{im.status}</Badge>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{im.tipo}</span>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.accent, marginLeft: 10 }}>{fmt(im.valor_avaliado)}</div>
            </div>
            <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              <Btn onClick={() => openEdit(im)} variant="ghost" style={{ flex: 1, fontSize: 12, padding: "8px" }}>Editar</Btn>
              <Btn onClick={() => remove(im.id)} variant="danger" style={{ fontSize: 12, padding: "8px 14px" }}>✕</Btn>
            </div>
          </Card>
        ))}
      </div>
      {modal && (
        <Modal title={editing ? "Editar Imóvel" : "Novo Imóvel"} onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nome" value={form.nome} onChange={f("nome")} required placeholder="Ex: Apto 101 - Centro" />
            <Field label="Tipo" value={form.tipo} onChange={f("tipo")} options={["Apartamento", "Casa", "Comercial", "Terreno", "Outro"]} />
            <Field label="Endereço" value={form.endereco} onChange={f("endereco")} placeholder="Rua, número, complemento" />
            <Field label="Status" value={form.status} onChange={f("status")} options={["Disponível", "Alugado", "Temporada", "Em Manutenção", "À Venda"]} />
            <Field label="Valor Avaliado (R$)" value={form.valor_avaliado} onChange={f("valor_avaliado")} type="number" />
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setModal(false)} style={{ flex: 1 }}>Cancelar</Btn>
              <Btn onClick={save} style={{ flex: 1 }}>Salvar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CONTRATOS ────────────────────────────────────────────────────────────────
function Contratos({ data, setData, imoveis }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const blank = { imovel_id: imoveis[0]?.id || "", inquilino: "", tipo: "Mensal", valor: "", inicio: today(), vencimento: "", dia_pagamento: "5", status: "Ativo" };
  const [form, setForm] = useState(blank);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setForm({ ...blank, imovel_id: imoveis[0]?.id || "" }); setEditing(null); setModal(true); };
  const openEdit = c => { setForm({ ...c, valor: String(c.valor), dia_pagamento: String(c.dia_pagamento) }); setEditing(c.id); setModal(true); };
  const remove = id => { if (confirm("Remover contrato?")) setData(p => ({ ...p, contratos: p.contratos.filter(c => c.id !== id) })); };
  const save = () => {
    if (!form.inquilino.trim()) return;
    const item = { ...form, valor: parseFloat(form.valor) || 0, dia_pagamento: parseInt(form.dia_pagamento) || 5 };
    if (editing) setData(p => ({ ...p, contratos: p.contratos.map(c => c.id === editing ? { ...item, id: editing } : c) }));
    else setData(p => ({ ...p, contratos: [...p.contratos, { ...item, id: uid() }] }));
    setModal(false);
  };

  return (
    <div>
      <PageHeader title="Contratos" sub={`${data.contratos.length} contratos`} action={<Btn onClick={openNew}>+ Novo</Btn>} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.contratos.map(c => {
          const im = imoveis.find(i => i.id === c.imovel_id);
          const dias = daysUntil(c.vencimento);
          const aviso = dias !== null && dias <= 60 && c.status === "Ativo";
          return (
            <Card key={c.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 14 }}>{c.inquilino}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, margin: "3px 0 8px" }}>{im?.nome} · {c.tipo}</div>
                  <Badge color={statusColor(c.status)}>{c.status}</Badge>
                </div>
                <div style={{ textAlign: "right", marginLeft: 10 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: C.accent }}>{fmt(c.valor)}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>dia {c.dia_pagamento}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.border}`, marginTop: 8 }}>
                <div>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Vence: </span>
                  <span style={{ fontSize: 12, fontWeight: aviso ? 700 : 400, color: aviso ? C.red : C.textSub }}>{fmtDate(c.vencimento)}</span>
                  {aviso && <span style={{ fontSize: 11, color: C.orange, marginLeft: 6 }}>({dias}d)</span>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn onClick={() => openEdit(c)} variant="ghost" style={{ fontSize: 11, padding: "6px 10px" }}>Editar</Btn>
                  <Btn onClick={() => remove(c.id)} variant="danger" style={{ fontSize: 11, padding: "6px 10px" }}>✕</Btn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title={editing ? "Editar Contrato" : "Novo Contrato"} onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <ImovelSelect value={form.imovel_id} onChange={f("imovel_id")} imoveis={imoveis} />
            <Field label="Inquilino / Locatário" value={form.inquilino} onChange={f("inquilino")} required />
            <Field label="Tipo" value={form.tipo} onChange={f("tipo")} options={["Mensal", "Temporada", "Anual"]} />
            <Field label="Valor (R$)" value={form.valor} onChange={f("valor")} type="number" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Início" value={form.inicio} onChange={f("inicio")} type="date" />
              <Field label="Vencimento" value={form.vencimento} onChange={f("vencimento")} type="date" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Dia Pgto" value={form.dia_pagamento} onChange={f("dia_pagamento")} type="number" />
              <Field label="Status" value={form.status} onChange={f("status")} options={["Ativo", "Encerrado", "Suspenso"]} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setModal(false)} style={{ flex: 1 }}>Cancelar</Btn>
              <Btn onClick={save} style={{ flex: 1 }}>Salvar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── FINANCEIRO ───────────────────────────────────────────────────────────────
function Financeiro({ data, setData, imoveis }) {
  const [tab, setTab] = useState("receitas");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const isR = tab === "receitas";
  const blankR = { imovel_id: imoveis[0]?.id || "", descricao: "", valor: "", data: today(), tipo: "Aluguel", status: "Pendente" };
  const blankD = { imovel_id: imoveis[0]?.id || "", descricao: "", valor: "", data: today(), tipo: "Manutenção", vencimento: today(), status: "Pendente" };
  const [form, setForm] = useState(blankR);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const lista = isR ? data.receitas : data.despesas;
  const confKey = isR ? "Recebido" : "Pago";
  const totalConf = lista.filter(i => i.status === confKey).reduce((a, i) => a + i.valor, 0);
  const totalPend = lista.filter(i => i.status === "Pendente").reduce((a, i) => a + i.valor, 0);

  const openNew = () => { setForm(isR ? { ...blankR, imovel_id: imoveis[0]?.id || "" } : { ...blankD, imovel_id: imoveis[0]?.id || "" }); setEditing(null); setModal(true); };
  const openEdit = item => { setForm({ ...item, valor: String(item.valor) }); setEditing(item.id); setModal(true); };
  const remove = id => { const key = isR ? "receitas" : "despesas"; if (confirm("Remover?")) setData(p => ({ ...p, [key]: p[key].filter(i => i.id !== id) })); };
  const save = () => {
    if (!form.descricao.trim()) return;
    const key = isR ? "receitas" : "despesas";
    const item = { ...form, valor: parseFloat(form.valor) || 0 };
    if (editing) setData(p => ({ ...p, [key]: p[key].map(i => i.id === editing ? { ...item, id: editing } : i) }));
    else setData(p => ({ ...p, [key]: [...p[key], { ...item, id: uid() }] }));
    setModal(false);
  };

  return (
    <div>
      <PageHeader title="Financeiro" action={<Btn onClick={openNew}>+ {isR ? "Receita" : "Despesa"}</Btn>} />
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["receitas", "despesas"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${tab === t ? C.accent : C.border}`, background: tab === t ? C.accentDim : "transparent", color: tab === t ? C.accent : C.textMuted, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit", textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[{ label: isR ? "Recebido" : "Pago", value: fmt(totalConf), color: isR ? C.green : C.red }, { label: "Pendente", value: fmt(totalPend), color: C.orange }, { label: "Total", value: fmt(totalConf + totalPend), color: C.text }].map(k => (
          <Card key={k.label} style={{ padding: 10, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: k.color }}>{k.value}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lista.length === 0 && <Card><div style={{ color: C.textMuted, fontSize: 13 }}>Nenhum registro.</div></Card>}
        {lista.map(item => {
          const im = imoveis.find(i => i.id === item.imovel_id);
          const vencAlerta = !isR && item.vencimento && daysUntil(item.vencimento) !== null && daysUntil(item.vencimento) <= 3;
          return (
            <Card key={item.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 3 }}>{item.descricao}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{im?.nome} · {item.tipo}</div>
                  <Badge color={statusColor(item.status)}>{item.status}</Badge>
                </div>
                <div style={{ textAlign: "right", marginLeft: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: isR ? C.green : C.red }}>{fmt(item.valor)}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{fmtDate(item.data)}</div>
                  {!isR && item.vencimento && <div style={{ fontSize: 11, color: vencAlerta ? C.red : C.textMuted }}>Vence: {fmtDate(item.vencimento)}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <Btn onClick={() => openEdit(item)} variant="ghost" style={{ flex: 1, fontSize: 12, padding: "7px" }}>Editar</Btn>
                <Btn onClick={() => remove(item.id)} variant="danger" style={{ fontSize: 12, padding: "7px 12px" }}>✕</Btn>
              </div>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title={editing ? "Editar" : (isR ? "Nova Receita" : "Nova Despesa")} onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <ImovelSelect value={form.imovel_id} onChange={f("imovel_id")} imoveis={imoveis} />
            <Field label="Descrição" value={form.descricao} onChange={f("descricao")} required />
            <Field label="Valor (R$)" value={form.valor} onChange={f("valor")} type="number" />
            <Field label="Tipo" value={form.tipo} onChange={f("tipo")} options={isR ? ["Aluguel", "Venda", "Temporada", "Outros"] : ["Manutenção", "Condomínio", "Imposto", "Seguro", "Água", "Energia", "Outros"]} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Data" value={form.data} onChange={f("data")} type="date" />
              {!isR && <Field label="Vencimento" value={form.vencimento || ""} onChange={f("vencimento")} type="date" />}
            </div>
            <Field label="Status" value={form.status} onChange={f("status")} options={isR ? ["Pendente", "Recebido"] : ["Pendente", "Pago"]} />
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setModal(false)} style={{ flex: 1 }}>Cancelar</Btn>
              <Btn onClick={save} style={{ flex: 1 }}>Salvar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── MANUTENÇÕES ──────────────────────────────────────────────────────────────
function Manutencoes({ data, setData, imoveis }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const blank = { imovel_id: imoveis[0]?.id || "", descricao: "", responsavel: "", data_prevista: today(), status: "Agendado", prioridade: "Média", custo_estimado: "", observacoes: "" };
  const [form, setForm] = useState(blank);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setForm({ ...blank, imovel_id: imoveis[0]?.id || "" }); setEditing(null); setModal(true); };
  const openEdit = m => { setForm({ ...m, custo_estimado: String(m.custo_estimado) }); setEditing(m.id); setModal(true); };
  const remove = id => { if (confirm("Remover?")) setData(p => ({ ...p, manutencoes: p.manutencoes.filter(m => m.id !== id) })); };
  const concluir = id => setData(p => ({ ...p, manutencoes: p.manutencoes.map(m => m.id === id ? { ...m, status: "Concluído" } : m) }));
  const save = () => {
    if (!form.descricao.trim()) return;
    const item = { ...form, custo_estimado: parseFloat(form.custo_estimado) || 0 };
    if (editing) setData(p => ({ ...p, manutencoes: p.manutencoes.map(m => m.id === editing ? { ...item, id: editing } : m) }));
    else setData(p => ({ ...p, manutencoes: [...p.manutencoes, { ...item, id: uid() }] }));
    setModal(false);
  };

  const ativas = data.manutencoes.filter(m => m.status !== "Concluído").sort((a, b) => ({ Alta: 0, Média: 1, Baixa: 2 }[a.prioridade] - { Alta: 0, Média: 1, Baixa: 2 }[b.prioridade]));
  const concluidas = data.manutencoes.filter(m => m.status === "Concluído");

  return (
    <div>
      <PageHeader title="Manutenções" sub="Agendamento e controle" action={<Btn onClick={openNew}>+ Agendar</Btn>} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ativas.map(m => {
          const im = imoveis.find(i => i.id === m.imovel_id);
          const dias = daysUntil(m.data_prevista);
          const atrasado = dias !== null && dias < 0;
          return (
            <Card key={m.id} style={{ borderLeft: `3px solid ${statusColor(m.prioridade)}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: C.text, fontSize: 14, marginBottom: 3 }}>{m.descricao}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{im?.nome}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Badge color={statusColor(m.prioridade)}>{m.prioridade}</Badge>
                    <Badge color={statusColor(m.status)}>{m.status}</Badge>
                  </div>
                </div>
                <div style={{ textAlign: "right", marginLeft: 10 }}>
                  {m.custo_estimado > 0 && <div style={{ fontSize: 14, fontWeight: 800, color: C.orange }}>{fmt(m.custo_estimado)}</div>}
                  <div style={{ fontSize: 11, color: atrasado ? C.red : C.textMuted, fontWeight: atrasado ? 700 : 400 }}>
                    {fmtDate(m.data_prevista)}{atrasado ? " ⚠️" : ""}
                  </div>
                </div>
              </div>
              {m.responsavel && <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6 }}>👷 {m.responsavel}</div>}
              {m.observacoes && <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontStyle: "italic" }}>{m.observacoes}</div>}
              <div style={{ display: "flex", gap: 6, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <Btn onClick={() => concluir(m.id)} variant="ghost" style={{ flex: 1, fontSize: 11, padding: "7px", color: C.green, borderColor: C.green + "44" }}>✓ Concluir</Btn>
                <Btn onClick={() => openEdit(m)} variant="ghost" style={{ flex: 1, fontSize: 11, padding: "7px" }}>Editar</Btn>
                <Btn onClick={() => remove(m.id)} variant="danger" style={{ fontSize: 11, padding: "7px 12px" }}>✕</Btn>
              </div>
            </Card>
          );
        })}
        {concluidas.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "8px 0" }}>Concluídas ({concluidas.length})</div>
            {concluidas.map(m => {
              const im = imoveis.find(i => i.id === m.imovel_id);
              return (
                <Card key={m.id} style={{ opacity: 0.55 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.descricao}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{im?.nome} · {fmtDate(m.data_prevista)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Badge color={C.green}>Concluído</Badge>
                      <Btn onClick={() => remove(m.id)} variant="danger" style={{ fontSize: 11, padding: "5px 8px" }}>✕</Btn>
                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>
      {modal && (
        <Modal title={editing ? "Editar Manutenção" : "Nova Manutenção"} onClose={() => setModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <ImovelSelect value={form.imovel_id} onChange={f("imovel_id")} imoveis={imoveis} />
            <Field label="Descrição" value={form.descricao} onChange={f("descricao")} required />
            <Field label="Responsável" value={form.responsavel} onChange={f("responsavel")} placeholder="Nome do prestador" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Data Prevista" value={form.data_prevista} onChange={f("data_prevista")} type="date" />
              <Field label="Custo Est. (R$)" value={form.custo_estimado} onChange={f("custo_estimado")} type="number" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Prioridade" value={form.prioridade} onChange={f("prioridade")} options={["Alta", "Média", "Baixa"]} />
              <Field label="Status" value={form.status} onChange={f("status")} options={["Agendado", "Pendente", "Em Andamento", "Concluído"]} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Observações</label>
              <textarea value={form.observacoes} onChange={e => f("observacoes")(e.target.value)} rows={3} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setModal(false)} style={{ flex: 1 }}>Cancelar</Btn>
              <Btn onClick={save} style={{ flex: 1 }}>Salvar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── DRE ─────────────────────────────────────────────────────────────────────
function DRE({ data, imoveis }) {
  const [sel, setSel] = useState("todos");

  const calcDRE = (imovel_id) => {
    const fil = arr => imovel_id === "todos" ? arr : arr.filter(i => i.imovel_id === imovel_id);
    const rec = fil(data.receitas), desp = fil(data.despesas), man = fil(data.manutencoes);
    const recConf = rec.filter(r => r.status === "Recebido").reduce((a, r) => a + r.valor, 0);
    const recPend = rec.filter(r => r.status === "Pendente").reduce((a, r) => a + r.valor, 0);
    const despPaga = desp.filter(d => d.status === "Pago").reduce((a, d) => a + d.valor, 0);
    const despPend = desp.filter(d => d.status === "Pendente").reduce((a, d) => a + d.valor, 0);
    const byTipo = {}; desp.forEach(d => { byTipo[d.tipo] = (byTipo[d.tipo] || 0) + d.valor; });
    const custMan = man.reduce((a, m) => a + (m.custo_estimado || 0), 0);
    return { recConf, recPend, recBruta: recConf + recPend, despPaga, despPend, despTotal: despPaga + despPend, byTipo, custMan, resultado: recConf - despPaga };
  };

  const dre = calcDRE(sel);
  const Row = ({ label, value, bold, color, sub }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${C.border}`, paddingLeft: sub ? 24 : 14 }}>
      <span style={{ fontSize: 13, color: bold ? C.text : C.textSub, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 13, color: color || (bold ? C.text : C.textMuted), fontWeight: bold ? 700 : 500 }}>{fmt(value)}</span>
    </div>
  );

  return (
    <div>
      <PageHeader title="DRE" sub="Demonstração de Resultado" />
      <select value={sel} onChange={e => setSel(e.target.value)} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 14, fontFamily: "inherit", marginBottom: 16 }}>
        <option value="todos">📊 Consolidado (todos)</option>
        {imoveis.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
      </select>
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "12px 14px", background: C.accentDim }}><span style={{ fontSize: 11, color: C.accent, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Receitas</span></div>
        <Row label="Receita Bruta" value={dre.recBruta} bold />
        <Row label="Receitas Pendentes" value={dre.recPend} sub color={C.orange} />
        <Row label="Receita Confirmada" value={dre.recConf} bold color={C.green} />
        <div style={{ padding: "12px 14px", background: C.redDim, borderTop: `1px solid ${C.border}` }}><span style={{ fontSize: 11, color: C.red, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Despesas</span></div>
        <Row label="Total Despesas" value={dre.despTotal} bold />
        {Object.entries(dre.byTipo).map(([tipo, val]) => <Row key={tipo} label={tipo} value={val} sub color={C.textMuted} />)}
        <Row label="Despesas Pendentes" value={dre.despPend} sub color={C.orange} />
        <Row label="Despesas Pagas" value={dre.despPaga} bold color={C.red} />
        {dre.custMan > 0 && <>
          <div style={{ padding: "12px 14px", background: C.orangeDim, borderTop: `1px solid ${C.border}` }}><span style={{ fontSize: 11, color: C.orange, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Manutenções (estimado)</span></div>
          <Row label="Custo Estimado" value={dre.custMan} bold color={C.orange} />
        </>}
        <div style={{ padding: "16px 14px", background: dre.resultado >= 0 ? C.greenDim : C.redDim, borderTop: `2px solid ${dre.resultado >= 0 ? C.green : C.red}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: C.text }}>RESULTADO LÍQUIDO</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: dre.resultado >= 0 ? C.green : C.red }}>{fmt(dre.resultado)}</span>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>Receitas confirmadas − despesas pagas</div>
        </div>
      </Card>
      {sel === "todos" && (
        <>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Por Imóvel</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {imoveis.map(im => {
              const d = calcDRE(im.id);
              return (
                <Card key={im.id}>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 13, marginBottom: 10 }}>{im.nome}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                    {[{ label: "Receitas", value: fmt(d.recConf), color: C.green }, { label: "Despesas", value: fmt(d.despPaga), color: C.red }, { label: "Resultado", value: fmt(d.resultado), color: d.resultado >= 0 ? C.green : C.red }].map(k => (
                      <div key={k.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{k.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: k.color }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
const NAV = [
  { key: "dashboard", label: "Início", icon: "⊞" },
  { key: "imoveis", label: "Imóveis", icon: "🏢" },
  { key: "contratos", label: "Contratos", icon: "📋" },
  { key: "financeiro", label: "Finanças", icon: "💰" },
  { key: "manutencoes", label: "Manutenção", icon: "🔧" },
  { key: "dre", label: "DRE", icon: "📊" },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const isMobile = useIsMobile();
  const [data, setDataRaw] = useState(() => loadData() || INITIAL_DATA);
  const [imoveis, setImoveisRaw] = useState(() => (loadData() || INITIAL_DATA).imoveis);

  const setData = fn => setDataRaw(prev => { const next = typeof fn === "function" ? fn(prev) : fn; saveData({ ...next, imoveis }); return next; });
  const setImoveis = fn => setImoveisRaw(prev => { const next = typeof fn === "function" ? fn(prev) : fn; saveData({ ...data, imoveis: next }); return next; });
  const fullData = { ...data, imoveis };

  const alertCount = useMemo(() => {
    let n = 0;
    data.contratos.filter(c => c.status === "Ativo").forEach(c => { if (daysUntil(c.vencimento) !== null && daysUntil(c.vencimento) <= 60) n++; });
    data.despesas.filter(d => d.status === "Pendente").forEach(d => { if (daysUntil(d.vencimento) !== null && daysUntil(d.vencimento) <= 10) n++; });
    return n;
  }, [data]);

  const SW = 220;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #252d3d; border-radius: 99px; }
        select option { background: #161b27; color: #e8eaf0; }
        input[type=number] { -moz-appearance: textfield; }
        input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      {/* DESKTOP SIDEBAR */}
      {!isMobile && (
        <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: SW, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", zIndex: 100 }}>
          <div style={{ padding: "24px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.accent, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>FS</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>Patrimonial</div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>Gestão Imobiliária</div>
          </div>
          <nav style={{ flex: 1, padding: "12px 10px" }}>
            {NAV.map(n => (
              <button key={n.key} onClick={() => setPage(n.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, border: "none", background: page === n.key ? C.accentDim : "transparent", color: page === n.key ? C.accent : C.textMuted, cursor: "pointer", fontSize: 13, fontWeight: page === n.key ? 700 : 500, fontFamily: "inherit", transition: "all .12s", marginBottom: 2, textAlign: "left" }}>
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                {n.label}
                {n.key === "dashboard" && alertCount > 0 && <span style={{ marginLeft: "auto", background: C.red, color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>{alertCount}</span>}
              </button>
            ))}
          </nav>
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted }}>Dados salvos localmente</div>
        </div>
      )}

      {/* MOBILE TOP BAR */}
      {isMobile && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 52, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 900, letterSpacing: "0.12em" }}>FS</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: C.text }}>Patrimonial</span>
          </div>
          {alertCount > 0 && <div style={{ background: C.red, color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 800, padding: "3px 10px" }}>{alertCount} alerta{alertCount > 1 ? "s" : ""}</div>}
        </div>
      )}

      {/* CONTEÚDO */}
      <div style={{ marginLeft: isMobile ? 0 : SW, marginTop: isMobile ? 52 : 0, marginBottom: isMobile ? 68 : 0, padding: isMobile ? "16px 14px" : 28 }}>
        {page === "dashboard"   && <Dashboard data={fullData} imoveis={imoveis} />}
        {page === "imoveis"     && <Imoveis imoveis={imoveis} setImoveis={setImoveis} />}
        {page === "contratos"   && <Contratos data={data} setData={setData} imoveis={imoveis} />}
        {page === "financeiro"  && <Financeiro data={data} setData={setData} imoveis={imoveis} />}
        {page === "manutencoes" && <Manutencoes data={data} setData={setData} imoveis={imoveis} />}
        {page === "dre"         && <DRE data={fullData} imoveis={imoveis} />}
      </div>

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 62, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100 }}>
          {NAV.map(n => {
            const active = page === n.key;
            return (
              <button key={n.key} onClick={() => setPage(n.key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, border: "none", background: "none", color: active ? C.accent : C.textMuted, cursor: "pointer", fontFamily: "inherit", position: "relative", padding: "6px 0" }}>
                {n.key === "dashboard" && alertCount > 0 && <div style={{ position: "absolute", top: 6, right: "calc(50% - 16px)", width: 7, height: 7, borderRadius: 99, background: C.red }} />}
                <span style={{ fontSize: 19, lineHeight: 1 }}>{n.icon}</span>
                <span style={{ fontSize: 9, fontWeight: active ? 800 : 500 }}>{n.label.slice(0, 8)}</span>
                {active && <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 2, background: C.accent, borderRadius: "0 0 3px 3px" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
