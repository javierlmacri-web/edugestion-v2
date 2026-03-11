import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://vqwosiwppdfsifwravsh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxd29zaXdwcGRmc2lmd3JhdnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mzg0MTEsImV4cCI6MjA4ODIxNDQxMX0.z5zeE7-mNHe7Ie6AalyYBCmnMWXqLR-wGoL5HLjMmhw"
);
const C = {
  bg: "#0b0f1a", card: "#111827", card2: "#161d2e", border: "#1e2a3d",
  accent: "#22c55e", accentL: "#4ade80", accentDim: "#22c55e10", accentGlow: "#22c55e40",
  green: "#34d399", red: "#ef4444", yellow: "#f97316", blue: "#60a5fa",
  text: "#e8edf5", muted: "#1e2d42", dim: "#4d6480",
  grad: "linear-gradient(135deg, #22c55e, #f97316)",
  gradCard: "linear-gradient(160deg, #111827 0%, #161d2e 100%)",
};
const S = {
  row:    { display:"flex", alignItems:"center" },
  rowSB:  { display:"flex", justifyContent:"space-between", alignItems:"center" },
  rowGap: { display:"flex", alignItems:"center", gap:8 },
  col:    { display:"flex", flexDirection:"column" },
  grid2:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
  upper:  { fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.1 },
  ellip:  { whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }, };
const INIT = { colegios: [], materias: [], alumnos: [], inscripciones: [], notas: [], actividades: [], asistencias: [], eventos: [], inasistencias: [], reportes: [], agenda: [] };

const uid = () => crypto.randomUUID();

const registrarHistorial = async (alumnoId, accion, detalle, eliminado = false) => {
  try {
    const entry = { id: uid(), alumno_id: alumnoId, accion, detalle, eliminado, created_at: new Date().toISOString() };
    await supabase.from("historial").insert(entry);
  } catch(e) { console.log("Error historial:", e.message); }
};
const fmt = (d) => { if (!d) return "—"; return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }); };

const fmtT = (d) => new Date(d).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
const nc = (n) => { if (n === null || n === undefined) return C.muted; const v = parseFloat(n); return v >= 7 ? C.green : v >= 5 ? C.yellow : C.red; };

const TABLE_MAP = {colegios:"colegios",materias:"materias",alumnos:"alumnos",inscripciones:"inscripciones",notas:"notas",actividades:"actividades",asistencias:"asistencias",eventos:"eventos",inasistencias:"inasistencias",documentos:"documentos",historial:"historial",agenda:"agenda"};
const fromDB = (row) => { if (!row) return row; const map = {colegio_id:"colegioId",alumno_id:"alumnoId",materia_id:"materiaId",tipo_inasist:"tipoInasist",fecha_nac:"fechaNac",created_at:"createdAt",archivo_url:"archivoUrl",archivo_nombre:"archivoNombre"}; const out={}; for (const [k,v] of Object.entries(row)){const m=map[k];if(m===undefined)out[k]=v;else if(m!==null)out[m]=v;} return out; };
const toDB = (obj) => { const map={colegioId:"colegio_id",alumnoId:"alumno_id",materiaId:"materia_id",tipoInasist:"tipo_inasist",fechaNac:"fecha_nac"}; const skip=new Set(["createdAt","_src","_fecha"]); const out={}; for(const [k,v] of Object.entries(obj)){if(skip.has(k))continue;out[map[k]||k]=v;} if(!out.id || typeof out.id !== "string" || out.id.length < 3) out.id = crypto.randomUUID(); return out; };
const loadD = async () => { try { const results = await Promise.all(Object.keys(TABLE_MAP).map(async key => { const {data,error} = await supabase.from(TABLE_MAP[key]).select("*"); if(error){console.error("loadD",key,error);return[key,[]];} return[key,(data||[]).map(r=>fromDB(r))]; })); return Object.fromEntries(results); } catch(e){console.error("loadD failed",e);return null;} };
const saveD = async () => {};
const upsertRow = async (table, obj) => { 
  try {
    const converted = toDB(obj);
    if (!converted.id || typeof converted.id !== "string" || converted.id.length < 3) {
      console.warn("upsertRow SKIP no id", table);
      return;
    }
    const {error} = await supabase.from(TABLE_MAP[table]).upsert(converted, {onConflict:"id"});
    if(error) console.error("upsert",table, JSON.stringify(error), JSON.stringify(converted).slice(0,200));
  } catch(e){console.error(e);}
};
const deleteRow = async (table, id) => { try { const {error} = await supabase.from(TABLE_MAP[table]).delete().eq("id",id); if(error)console.error("delete",table,error); } catch(e){console.error(e);} };

const Inp = ({ label, ...p }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 10, color: C.dim, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.4 }}>{label}</label>}
    <input {...p} style={{ background: "#070c18", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "11px 16px", color: C.text, fontSize: 14, outline: "none", transition: "border-color .2s, box-shadow .2s", fontFamily: "inherit", ...p.style }}
      onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accentGlow}`; }}
      onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
  </div>
);
const Sel = ({ label, children, ...p }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 10, color: C.dim, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.4 }}>{label}</label>}
    <select {...p} style={{ background: "#070c18", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "11px 16px", color: C.text, fontSize: 14, outline: "none", cursor: "pointer", fontFamily: "inherit", transition: "border-color .2s", ...p.style }}
      onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border}>{children}</select>
  </div>
);
const Btn = ({ children, v = "primary", sm, ...p }) => {
  const base = { borderRadius: 11, fontWeight: 700, cursor: "pointer", transition: "all .18s", border: "none", fontSize: sm ? 12 : 14, padding: sm ? "6px 13px" : "10px 22px", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "inherit", letterSpacing: 0.2 };
  const vs = {
    primary: { background: C.grad, color: "#fff", boxShadow: `0 4px 20px ${C.accentGlow}` },
    danger:  { background: C.red + "15", color: C.red, border: `1.5px solid ${C.red}30` },
    ghost:   { background: "transparent", color: C.dim, border: `1.5px solid ${C.border}` },
    success: { background: C.green + "15", color: C.green, border: `1.5px solid ${C.green}30` },
  };
  return <button style={{ ...base, ...vs[v] }} {...p}>{children}</button>;
};
const Box = ({ children, style, onClick, hi }) => {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => hi && setH(true)} onMouseLeave={() => hi && setH(false)}
      style={{ background: h ? C.card2 : C.card, border: `1.5px solid ${h ? C.accent + "60" : C.border}`, borderRadius: 18, padding: 20, cursor: onClick ? "pointer" : undefined, transition: "all .2s", boxShadow: h ? `0 8px 32px ${C.accentGlow}` : "none", ...style }}>
      {children}
    </div>
  );
};
const Pop = ({ title, onClose, children, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20, backdropFilter: "blur(12px)" }}>
    <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 22, padding: 30, width: "100%", maxWidth: wide ? 700 : 520, maxHeight: "92vh", overflowY: "auto", boxShadow: `0 24px 80px #00000088` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h3 style={{ color: C.text, margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: -0.3 }}>{title}</h3>
        <button onClick={onClose} style={{ background: C.card2, border: `1.5px solid ${C.border}`, borderRadius: 9, width: 32, height: 32, color: C.dim, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);
const Tag = ({ children, color = C.accent }) => (
  <span style={{ background: color + "18", color, border: `1px solid ${color}30`, borderRadius: 7, padding: "3px 10px", fontSize: 11, fontWeight: 700, display: "inline-block", letterSpacing: 0.3 }}>{children}</span>
);
const Empty = ({ icon, msg }) => (
  <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
    <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.5 }}>{icon}</div>
    <p style={{ margin: 0, fontSize: 14, color: C.dim }}>{msg}</p>
  </div>
);
const Breadcrumb = ({ items }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
    {items.map((it, i) => (
      <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {i > 0 && <span style={{ color: C.muted, fontSize: 12 }}>›</span>}
        {it.onClick
          ? <button onClick={it.onClick} style={{ background: "none", border: "none", color: C.accentL, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0, fontFamily: "inherit" }}>{it.label}</button>
          : <span style={{ color: i === items.length - 1 ? C.text : C.dim, fontSize: 13, fontWeight: i === items.length - 1 ? 700 : 400 }}>{it.label}</span>}
      </span>
    ))}
  </div>
);
const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 60); }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError("Ingresá email y contraseña."); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError("Email o contraseña incorrectos."); return; }
    onLogin(data.user);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Ambient glow blobs */}
      <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: `radial-gradient(ellipse, ${C.accent}12 0%, transparent 65%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "0%", right: "-5%", width: 400, height: 400, background: `radial-gradient(ellipse, #f9731610 0%, transparent 65%)`, pointerEvents: "none" }} />
      <div style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(20px)", transition: "all .6s cubic-bezier(.22,.68,0,1.2)", width: "100%", maxWidth: 420, zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, background: C.accentDim, border: `2px solid ${C.accent}35`, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto 20px", boxShadow: `0 0 40px ${C.accentGlow}` }}>🎓</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: C.text, margin: "0 0 8px", letterSpacing: -1.2 }}>EduGestión</h1>
          <p style={{ color: C.dim, fontSize: 14, margin: 0 }}>Ingresá con tu cuenta para continuar</p>
        </div>
        <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 22, padding: 30, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 20px 60px #00000060" }}>
          <Inp label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          <Inp label="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          {error && (
            <div style={{ background: C.red + "12", border: `1.5px solid ${C.red}30`, borderRadius: 11, padding: "10px 14px", color: C.red, fontSize: 13 }}>⚠️ {error}</div>
          )}
          <button onClick={handleLogin} disabled={loading} style={{ background: C.grad, border: "none", borderRadius: 13, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 800, cursor: loading ? "wait" : "pointer", marginTop: 6, transition: "all .2s", opacity: loading ? 0.7 : 1, boxShadow: `0 6px 24px ${C.accentGlow}`, fontFamily: "inherit", letterSpacing: 0.3 }}>
            {loading ? "Ingresando..." : "Ingresar →"}
          </button>
        </div>
      </div>
    </div>
  );
};


const Welcome = ({ onGo }) => {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 80); }, []);
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 700, height: 700, background: `radial-gradient(circle, ${C.accent}0e 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(24px)", transition: "all .7s ease", textAlign: "center", maxWidth: 560, zIndex: 1 }}>
        <div style={{ width: 96, height: 96, background: C.accentDim, border: `2px solid ${C.accent}44`, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, margin: "0 auto 28px" }}>🎓</div>
        <h1 style={{ fontSize: 46, fontWeight: 900, color: C.text, margin: "0 0 10px", letterSpacing: -2, lineHeight: 1.1 }}>
          Bienvenido/a,{" "}<span style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accentL})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Profesor/a 👋</span>
        </h1>
        <p style={{ color: C.dim, fontSize: 16, margin: "0 0 52px", lineHeight: 1.7 }}>Sistema integral de gestión escolar.<br />Administrá alumnos, notas y actividades por materia y colegio.</p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={onGo} style={{ background: C.grad, border: "none", borderRadius: 20, padding: 3, cursor: "pointer", transition: "all .25s", boxShadow: `0 10px 40px ${C.accentGlow}`, width: 270 }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 18px 50px ${C.accentGlow}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 10px 40px ${C.accentGlow}`; }}>
            <div style={{ background: "#0b0f1aee", borderRadius: 18, padding: "20px 24px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, background: C.grad, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>🏫</div>
              <div style={{ textAlign: "left" }}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>Colegios</div>
                <div style={{ color: C.accentL + "99", fontSize: 12, marginTop: 2 }}>Acceder al sistema</div>
              </div>
              <div style={{ color: C.accentL, fontSize: 20, marginLeft: "auto" }}>→</div></div>
          </button></div>
        <p style={{ color: C.muted, fontSize: 12, marginTop: 44 }}>💾 Datos guardados automáticamente en tu dispositivo</p>
      </div>
    </div> ); };
const ColegioSelector = ({ data, setData, onSelect, onBack }) => {
  const [pop, setPop] = useState(false); const [form, setForm] = useState({ nombre: "", direccion: "", telefono: "", email: "" }); const [editId, setEditId] = useState(null);
  const openAdd = () => { setForm({ nombre: "", direccion: "", telefono: "", email: "" }); setEditId(null); setPop(true); };

  const openEdit = (c) => { setForm({ nombre: c.nombre, direccion: c.direccion || "", telefono: c.telefono || "", email: c.email || "" }); setEditId(c.id); setPop(true); };

  const save = async () => {
    if (!form.nombre.trim()) return;
    if (editId) {
      const updated = { ...data.colegios.find(c => c.id === editId), ...form };
      setData(d => ({ ...d, colegios: d.colegios.map(c => c.id === editId ? updated : c) }));
      await upsertRow("colegios", updated);
    } else {
      const nuevo = { id: uid(), ciclo: new Date().getFullYear().toString(), ...form };
      setData(d => ({ ...d, colegios: [...d.colegios, nuevo] }));
      await upsertRow("colegios", nuevo);
    }
    setPop(false); setEditId(null); };
  const del = async (id) => {
    if (!confirm("¿Eliminar colegio y todos sus datos?")) return;
    setData(d => ({ ...d, colegios: d.colegios.filter(c => c.id !== id), alumnos: d.alumnos.filter(a => a.colegioId !== id), materias: d.materias.filter(m => m.colegioId !== id) }));
    await deleteRow("colegios", id); };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "16px 32px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 18, padding: "4px 8px", borderRadius: 8 }}>←</button>
        <div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 18 }}>🏫 Colegios</div>
          <div style={{ color: C.muted, fontSize: 12 }}>Elegí un colegio para ingresar</div></div>
        <div style={{ marginLeft: "auto" }}><Btn onClick={openAdd}>🏫 Agregar Colegio</Btn></div> </div> <div style={{ padding: "40px 32px", maxWidth: 960, margin: "0 auto" }}>
        {data.colegios.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <div style={{ fontSize: 60, marginBottom: 18 }}>🏫</div>
            <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 12 }}>No hay colegios registrados</h2>
            <p style={{ color: C.dim, fontSize: 15, marginBottom: 32 }}>Agregá tu primer colegio para comenzar.</p>
            <Btn onClick={openAdd}>+ Agregar primer colegio</Btn></div>
        ) : (
          <>
            <p style={{ color: C.dim, fontSize: 12, fontWeight: 700, margin: "0 0 20px", textTransform: "uppercase", letterSpacing: 1.5 }}>Elegir colegio</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 16 }}>
              {data.colegios.map(col => {
                const als = data.alumnos.filter(a => a.colegioId === col.id).length;
                const mats = data.materias.filter(m => m.colegioId === col.id).length;
                return (
                  <div key={col.id} style={{ position: "relative" }}>
                    <Box hi style={{ paddingBottom: 56, cursor: "pointer" }} onClick={() => onSelect(col.id)}> <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                        <div style={{ width: 50, height: 50, background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏫</div>
                        <div>
                          <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>{col.nombre}</div>
                          {col.ciclo && <div style={{ color: C.accentL, fontSize: 12, marginTop: 2, fontWeight: 700 }}>📅 Ciclo {col.ciclo}</div>}
                          {col.direccion && <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>📍 {col.direccion}</div>} </div> </div> <div style={{ display: "flex", gap: 20 }}>
                        <div><div style={{ fontSize: 22, fontWeight: 900, color: C.accentL }}>{als}</div><div style={{ fontSize: 11, color: C.muted }}>Alumnos</div></div>
                        <div><div style={{ fontSize: 22, fontWeight: 900, color: C.blue }}>{mats}</div><div style={{ fontSize: 11, color: C.muted }}>Materias</div></div>
                      </div>
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: C.accentL, fontSize: 13, fontWeight: 700 }}>Ingresar →</span>
                        <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                          <Btn v="ghost" sm onClick={() => openEdit(col)}>✏️ Editar</Btn>
                          <Btn v="danger" sm onClick={() => del(col.id)}>🗑️</Btn></div></div>
                    </Box>
                  </div> );
              })}
              <button onClick={openAdd} style={{ background: "none", border: `2px dashed ${C.border}`, borderRadius: 16, minHeight: 170, cursor: "pointer", transition: "all .2s", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: C.muted, fontSize: 14, fontWeight: 700 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "55"; e.currentTarget.style.color = C.accentL; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
                <span style={{ fontSize: 28 }}>+</span>Agregar Colegio </button> </div> </> )} </div> {pop && ( <Pop title={editId ? "Editar Colegio" : "Agregar Colegio"} onClose={() => { setPop(false); setEditId(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Inp label="Nombre *" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Colegio San Martín" />
            <Inp label="Ciclo Lectivo" value={form.ciclo||""} onChange={e => setForm(f => ({ ...f, ciclo: e.target.value }))} placeholder={new Date().getFullYear().toString()} />
            <Inp label="Dirección" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Av. Corrientes 1234" />
            <Inp label="Teléfono" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="011-4444-5555" />
            <Inp label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@colegio.edu.ar" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn v="ghost" onClick={() => { setPop(false); setEditId(null); }}>Cancelar</Btn>
              <Btn onClick={save}>💾 Guardar</Btn></div></div>
        </Pop> )}
    </div> ); };
const TABS = [
  { id: "dashboard", icon: "🏠", label: "Inicio" },
  { id: "materias",  icon: "📚", label: "Materias" },
  { id: "alumnos",   icon: "👤", label: "Alumnos" },
  { id: "agenda",    icon: "📅", label: "Agenda" },
  { id: "eventos",   icon: "🗓️", label: "Eventos del Colegio" },
  { id: "documentos", icon: "📁", label: "Archivos/Docs" }, ];
const Dashboard = ({ data, setData, colegioId, onChangeTab, initialVista }) => {
  const [busqueda, setBusqueda] = useState(""); const busLower = busqueda.toLowerCase().trim();
  const [vista, setVista] = useState(initialVista || null);
  const [detalleMateria, setDetalleMateria] = useState(null); const [detalleAlumno, setDetalleAlumno] = useState(null); const [matFiltro, setMatFiltro] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  // Estados de Agenda (deben estar al nivel del componente, no dentro de if)
  const [agendaPopOpen,      setAgendaPopOpen]      = useState(false);
  const [agendaEditId,       setAgendaEditId]       = useState(null);
  const [agendaAdjFile,      setAgendaAdjFile]      = useState(null);
  const [agendaUploading,    setAgendaUploading]    = useState(false);
  const [agendaFiltroMat,    setAgendaFiltroMat]    = useState("");
  const [agendaFiltroEstado, setAgendaFiltroEstado] = useState("");
  const agendaEmptyForm = { titulo:"", tipo:"examen", materiaId:"", alumnoId:"", fecha: new Date().toISOString().slice(0,10), descripcion:"", archivoUrl:"", archivoNombre:"", estado:"pendiente" };
  const [agendaForm, setAgendaForm] = useState(agendaEmptyForm);
  const goInicio = () => { setVista(null); setDetalleMateria(null); setDetalleAlumno(null); setMatFiltro(null); };

  const col  = data.colegios.find(c => c.id === colegioId);
  const als  = data.alumnos.filter(a => a.colegioId === colegioId);
  const mats = data.materias.filter(m => m.colegioId === colegioId);
  const notas = data.notas.filter(n => als.some(a => a.id === n.alumnoId));
  const acts  = data.actividades.filter(a => als.some(al => al.id === a.alumnoId));
  const eventos = (data.eventos || []).filter(e => e.colegioId === colegioId);
  const inasistencias = (data.inasistencias || []).filter(i => i.colegioId === colegioId);
  const vals  = notas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v)); const prom = avg(vals);
  const tipoActColor = { positiva: C.green, negativa: C.red, neutral: C.yellow, participacion: C.blue, observacion: C.dim };


  const [reloadTick, setReloadTick] = useState(0);

  // Efecto principal: carga datos frescos desde Supabase
  // Se ejecuta al montar Y cada vez que als.length cambia (cuando cargan los alumnos)
  useEffect(() => {
    if (!colegioId) return;

    // Materias: no depende de alumnos
    supabase.from("materias").select("*").eq("colegio_id", colegioId)
      .then(({ data: rows }) => {
        if (!rows) return;
        const frescas = rows.map(r => fromDB(r));
        setData(d => ({ ...d, materias: [...d.materias.filter(m => m.colegioId !== colegioId), ...frescas] }));
      });

    // Actividades y notas: necesitan alumnoIds
    const fetchActsNotas = (alumnoIds) => {
      if (!alumnoIds.length) return;
      supabase.from("actividades").select("*").in("alumno_id", alumnoIds)
        .then(({ data: rows, error }) => {
          if (error || !rows) { console.error("reload actividades:", error); return; }
          const deSupabase = rows.map(r => fromDB(r));
          setData(d => {
            const idsDB = new Set(deSupabase.map(a => a.id));
            const enMemoria = d.actividades.filter(a => alumnoIds.includes(a.alumnoId) && !idsDB.has(a.id));
            const otras = d.actividades.filter(a => !alumnoIds.includes(a.alumnoId));
            return { ...d, actividades: [...otras, ...deSupabase, ...enMemoria] };
          });
        });
      supabase.from("notas").select("*").in("alumno_id", alumnoIds)
        .then(({ data: rows, error }) => {
          if (error || !rows) { console.error("reload notas:", error); return; }
          const deSupabase = rows.map(r => fromDB(r));
          setData(d => {
            const idsDB = new Set(deSupabase.map(n => n.id));
            const enMemoria = d.notas.filter(n => alumnoIds.includes(n.alumnoId) && !idsDB.has(n.id));
            const otras = d.notas.filter(n => !alumnoIds.includes(n.alumnoId));
            return { ...d, notas: [...otras, ...deSupabase, ...enMemoria] };
          });
        });
      supabase.from("documentos").select("*").in("alumno_id", alumnoIds).order("created_at", { ascending: false }).limit(20)
        .then(({ data: docs }) => { if (docs) setRecentDocs(docs.map(d => fromDB(d))); });
    };

    // Si ya tenemos alumnos cargados, buscar ahora
    const alumnoIds = data.alumnos.filter(a => a.colegioId === colegioId).map(a => a.id);
    fetchActsNotas(alumnoIds);

    // Si todavía no hay alumnos, cargarlos y luego buscar
    if (alumnoIds.length === 0) {
      supabase.from("alumnos").select("*").eq("colegio_id", colegioId)
        .then(({ data: rows }) => {
          if (!rows || rows.length === 0) return;
          const frescos = rows.map(r => fromDB(r));
          setData(d => ({ ...d, alumnos: [...d.alumnos.filter(a => a.colegioId !== colegioId), ...frescos] }));
          fetchActsNotas(frescos.map(a => a.id));
        });
    }
  }, [colegioId, reloadTick]);

  const SC = ({ label, value, color, onClick, sub }) => (
    <Box hi={!!onClick} onClick={onClick} style={{ textAlign: "center", cursor: onClick ? "pointer" : "default", position: "relative" }}>
      <div style={{ fontSize: 32, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{sub}</div>}
      {onClick && <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 11, color: C.accentL, fontWeight: 700 }}>ver →</div>}
    </Box> );
  if (detalleAlumno) {
    const al = data.alumnos.find(a => a.id === detalleAlumno);
    return (
      <div>
        <Breadcrumb items={[
          { label: "Inicio", onClick: goInicio },
          { label: vista === "alumnos" ? "Alumnos" : "Actividades", onClick: () => { setDetalleAlumno(null); } },
          { label: `${al?.apellido}, ${al?.nombre}` },
        ]} />
        <AlumnoPerfilGlobal data={data} setData={setData} alumnoId={detalleAlumno} colegioId={colegioId} onBack={() => setDetalleAlumno(null)} />
      </div> ); }
  if (detalleMateria) {
    return (
      <div>
        <Breadcrumb items={[
          { label: "Inicio", onClick: goInicio },
          { label: vista === "materias" ? "Materias" : vista === "notas" ? "Notas por Materia" : "Promedio por Materia", onClick: () => setDetalleMateria(null) },
          { label: mats.find(m => m.id === detalleMateria)?.nombre },
        ]} />
        <MateriaDetalle data={data} setData={setData} materiaId={detalleMateria} colegioId={colegioId} onBack={() => setDetalleMateria(null)} />
      </div> ); }
  if (vista === "materias") {
    return (
      <div>
        <Breadcrumb items={[{ label: "Inicio", onClick: goInicio }, { label: "Materias" }]} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ color: C.text, margin: 0, fontSize: 20, fontWeight: 800 }}>📚 Materias del Colegio</h2>
          <Btn onClick={() => { onChangeTab && onChangeTab("materias"); }}>+ Nueva Materia</Btn>
        </div>
        {mats.length === 0 ? <Empty icon="📚" msg="No hay materias registradas." /> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {mats.map(m => {
              const ins = (data.inscripciones || []).filter(i => i.materiaId === m.id).length;
              const mNotas = notas.filter(n => n.materiaId === m.id);
              const mv = mNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v));
              return (
                <Box key={m.id} hi style={{ cursor: "pointer" }} onClick={() => setDetalleMateria(m.id)}> <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{m.nombre}</div>
                    <span style={{ fontSize: 24, fontWeight: 900, color: nc(avg(mv)) }}>{avg(mv) ?? "—"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.dim }}>👥 {ins} alumnos · 📝 {mNotas.length} notas</div>
                  <div style={{ color: C.accentL, fontSize: 12, fontWeight: 700, marginTop: 10 }}>Ver detalle →</div>
                </Box> );
            })}
          </div> )}
      </div> ); }
  if (vista === "alumnos") {
    return (
      <div>
        <Breadcrumb items={[{ label: "Inicio", onClick: goInicio }, { label: "Alumnos" }]} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ color: C.text, margin: 0, fontSize: 20, fontWeight: 800 }}>👤 Alumnos del Colegio</h2>
          <Btn onClick={() => { onChangeTab && onChangeTab("alumnos"); }}>+ Nuevo Alumno</Btn>
        </div>
        {als.length === 0 ? <Empty icon="👤" msg="No hay alumnos registrados." /> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {als.map(al => {
              const alNotas = notas.filter(n => n.alumnoId === al.id);
              const av = alNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v)); const alProm = avg(av);
              const matIds = [...new Set((data.inscripciones || []).filter(i => i.alumnoId === al.id).map(i => i.materiaId))];
              return (
                <Box key={al.id} hi style={{ cursor: "pointer", position: "relative", paddingBottom: 50 }} onClick={() => setDetalleAlumno(al.id)}> <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{al.apellido}, {al.nombre}</div>
                      {al.curso && <div style={{ color: C.muted, fontSize: 12 }}>Curso: {al.curso}</div>} </div> <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 26, fontWeight: 900, color: nc(alProm) }}>{alProm ?? "—"}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{alNotas.length} notas</div> </div> </div> {matIds.length > 0 && ( <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {matIds.slice(0, 3).map(mid => { const mat = mats.find(m => m.id === mid); return mat ? <Tag key={mid} color={C.accentL}>{mat.nombre}</Tag> : null; })}
                      {matIds.length > 3 && <Tag color={C.dim}>+{matIds.length - 3}</Tag>}
                    </div> )}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "9px 16px", borderTop: `1px solid ${C.border}`, color: C.accentL, fontSize: 12, fontWeight: 700 }}>Ver notas y actividades →</div>
                </Box> );
            })}
          </div> )}
      </div> ); }
  if (vista === "notas") {
    return (
      <div>
        <Breadcrumb items={[{ label: "Inicio", onClick: goInicio }, { label: "Notas por Materia" }]} />
        <h2 style={{ color: C.text, margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>📝 Notas generales por Materia</h2>
        {mats.length === 0 ? <Empty icon="📝" msg="No hay materias registradas." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mats.map(m => {
              const ins = (data.inscripciones || []).filter(i => i.materiaId === m.id).map(i => i.alumnoId);
              const alsMat = als.filter(a => ins.includes(a.id));
              const mNotas = notas.filter(n => n.materiaId === m.id);
              const mv = mNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v)); const mProm = avg(mv);
              return (
                <Box key={m.id}>
                  {/* Cabecera materia */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 38, height: 38, background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📚</div>
                      <div>
                        <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>{m.nombre}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{alsMat.length} alumnos · {mNotas.length} notas</div> </div> </div> <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: nc(mProm) }}>{mProm ?? "—"}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>promedio</div></div>
                      <Btn v="ghost" sm onClick={() => setDetalleMateria(m.id)}>Ver materia →</Btn>
                    </div></div>
                  {/* Alumnos con sus notas en esta materia */}
                  {alsMat.length === 0 ? (
                    <div style={{ color: C.muted, fontSize: 13, padding: "8px 0" }}>Sin alumnos inscriptos.</div> ) : ( <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {alsMat.map(al => {
                        const alMatNotas = mNotas.filter(n => n.alumnoId === al.id);
                        const alVals = alMatNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v));
                        const alProm = avg(alVals);
                        return (
                          <div key={al.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: C.bg, borderRadius: 10, cursor: "pointer", border: `1px solid ${C.border}`, transition: "border .15s" }}
                            onClick={() => setDetalleAlumno(al.id)}
                            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "55"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                            <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{al.apellido}, {al.nombre}</div> <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                              {/* mini chips de notas */}
                              <div style={{ display: "flex", gap: 4 }}>
                                {alMatNotas.slice(-5).map(n => (
                                  <div key={n.id} title={`${n.tipo}: ${n.nota}`} style={{ width: 30, height: 30, borderRadius: 8, background: nc(n.nota) + "18", border: `1px solid ${nc(n.nota)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: nc(n.nota) }}>{n.nota}</div>
                                ))}</div>
                              <div style={{ textAlign: "right", minWidth: 44 }}>
                                <div style={{ fontSize: 20, fontWeight: 900, color: nc(alProm) }}>{alProm ?? "—"}</div>
                                <div style={{ fontSize: 10, color: C.muted }}>prom.</div></div>
                            </div>
                          </div> );
                      })}
                    </div> )}
                </Box> );
            })}
          </div> )}
      </div> ); }
  if (vista === "promedio") {
    return (
      <div>
        <Breadcrumb items={[{ label: "Inicio", onClick: goInicio }, { label: "Promedio por Materia" }]} />
        <h2 style={{ color: C.text, margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>📊 Promedio General por Materia</h2>
        {mats.length === 0 ? <Empty icon="📊" msg="No hay materias registradas." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mats.map(m => {
              const mNotas = notas.filter(n => n.materiaId === m.id);
              const mv = mNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v)); const mProm = avg(mv);
              const pct = mv.length && mProm ? (parseFloat(mProm) / 10) * 100 : 0;
              return (
                <Box key={m.id} hi style={{ cursor: "pointer" }} onClick={() => setDetalleMateria(m.id)}> <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{m.nombre}</div> <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: nc(mProm) }}>{mProm ?? "—"}</div>
                      <Btn v="ghost" sm onClick={e => { e.stopPropagation(); setDetalleMateria(m.id); }}>Ver →</Btn>
                    </div></div>
                  {/* Barra de progreso */}
                  <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: nc(mProm), borderRadius: 4, transition: "width .5s" }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{mNotas.length} notas · {(data.inscripciones || []).filter(i => i.materiaId === m.id).length} alumnos</div>
                </Box> );
            })}
          </div> )}
      </div> ); }
  if (vista === "agenda") {
    const TIPOS = [
      { id: "examen",  label: "Examen",             icon: "📝", color: C.red    },
      { id: "tp",      label: "Trabajo Práctico",   icon: "📋", color: C.blue   },
      { id: "rendir",  label: "Examen para Rendir", icon: "🎯", color: C.yellow },
      { id: "otro",    label: "Otro",               icon: "📌", color: C.dim    },
    ];
    const ESTADOS = [
      { id: "pendiente",  label: "Pendiente",  color: C.yellow },
      { id: "entregado",  label: "Entregado",  color: C.blue   },
      { id: "calificado", label: "Calificado", color: C.green  },
    ];
    const agendaAll = (data.agenda || []).filter(e => e.colegioId === colegioId);
    const popOpen      = agendaPopOpen;
    const setPopOpen   = setAgendaPopOpen;
    const editId       = agendaEditId;
    const setEditId    = setAgendaEditId;
    const adjFile      = agendaAdjFile;
    const setAdjFile   = setAgendaAdjFile;
    const uploading    = agendaUploading;
    const setUploading = setAgendaUploading;
    const filtroMat    = agendaFiltroMat;
    const setFiltroMat = setAgendaFiltroMat;
    const filtroEstado = agendaFiltroEstado;
    const setFiltroEstado = setAgendaFiltroEstado;
    const emptyForm    = agendaEmptyForm;
    const form         = agendaForm;
    const setForm      = setAgendaForm;
    const today = new Date().toISOString().slice(0,10);
    const lista = agendaAll
      .filter(e => (!filtroMat || e.materiaId === filtroMat) && (!filtroEstado || e.estado === filtroEstado))
      .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    const proximos = lista.filter(e => e.fecha >= today);
    const pasados  = lista.filter(e => e.fecha < today).reverse();
    const abrirNuevo  = () => { setForm(emptyForm); setEditId(null); setAdjFile(null); setPopOpen(true); };
    const abrirEditar = (ev) => {
      setForm({ titulo:ev.titulo||"", tipo:ev.tipo||"examen", materiaId:ev.materiaId||"", alumnoId:ev.alumnoId||"", fecha:ev.fecha||today, descripcion:ev.descripcion||"", archivoUrl:ev.archivoUrl||"", archivoNombre:ev.archivoNombre||"", estado:ev.estado||"pendiente" });
      setEditId(ev.id); setAdjFile(null); setPopOpen(true);
    };
    const cerrar = () => { setPopOpen(false); setEditId(null); setAdjFile(null); };
    const guardar = async () => {
      if (!form.titulo.trim() || !form.fecha) { alert("Título y fecha son obligatorios."); return; }
      setUploading(true);
      let archivoUrl = form.archivoUrl, archivoNombre = form.archivoNombre;
      if (adjFile) {
        try {
          const b64 = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result.split(",")[1]); r.readAsDataURL(adjFile); });
          const up = await fetch("/api/upload", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ imageBase64: b64, mimeType: adjFile.type, fileName: adjFile.name }) }).then(r => r.json());
          if (up.url) { archivoUrl = up.url; archivoNombre = adjFile.name; }
          else console.error("upload:", up.error);
        } catch(e) { console.error("upload:", e); }
      }
      const row = { colegio_id: colegioId, titulo: form.titulo.trim(), tipo: form.tipo, materia_id: form.materiaId||null, alumno_id: form.alumnoId||null, fecha: form.fecha, descripcion: form.descripcion||"", archivo_url: archivoUrl||"", archivo_nombre: archivoNombre||"", estado: form.estado };
      if (editId) {
        const { error } = await supabase.from("agenda").update(row).eq("id", editId);
        if (error) { alert("Error: " + error.message); setUploading(false); return; }
        setData(d => ({ ...d, agenda: (d.agenda||[]).map(x => x.id === editId ? { ...x, ...form, archivoUrl, archivoNombre, colegioId } : x) }));
      } else {
        const id = uid();
        const { error } = await supabase.from("agenda").insert({ id, ...row });
        if (error) { alert("Error: " + error.message); setUploading(false); return; }
        setData(d => ({ ...d, agenda: [...(d.agenda||[]), { id, colegioId, ...form, archivoUrl, archivoNombre }] }));
      }
      setUploading(false); cerrar();
    };
    const eliminar = async (id) => {
      if (!confirm("¿Eliminar este evento?")) return;
      await supabase.from("agenda").delete().eq("id", id);
      setData(d => ({ ...d, agenda: (d.agenda||[]).filter(x => x.id !== id) }));
    };
    const cambiarEstado = async (id, estado) => {
      await supabase.from("agenda").update({ estado }).eq("id", id);
      setData(d => ({ ...d, agenda: (d.agenda||[]).map(x => x.id === id ? { ...x, estado } : x) }));
    };
    const AgendaCard = ({ ev }) => {
      const mat  = mats.find(m => m.id === ev.materiaId);
      const al   = als.find(a => a.id === ev.alumnoId);
      const tipo = TIPOS.find(t => t.id === ev.tipo) || TIPOS[3];
      const est  = ESTADOS.find(s => s.id === ev.estado) || ESTADOS[0];
      const dias = Math.ceil((new Date(ev.fecha + "T12:00:00") - new Date()) / 86400000);
      const urgente = dias >= 0 && dias <= 3;
      const vencido = dias < 0;
      return (
        <div style={{ display:"flex", alignItems:"center", gap:14, padding:"15px 18px", background:C.card, border:`1.5px solid ${urgente ? C.red+"55" : C.border}`, borderRadius:14 }}>
          <div style={{ width:46, height:46, borderRadius:13, background:tipo.color+"18", border:`1px solid ${tipo.color}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{tipo.icon}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:5 }}>
              <span style={{ color:C.text, fontWeight:700, fontSize:15 }}>{ev.titulo}</span>
              {urgente && <span style={{ background:C.red+"22", color:C.red, border:`1px solid ${C.red}44`, borderRadius:6, padding:"1px 8px", fontSize:11, fontWeight:700 }}>{dias===0?"¡Hoy!":`¡${dias}d!`}</span>}
              {vencido  && <span style={{ background:C.dim+"22", color:C.dim, borderRadius:6, padding:"1px 8px", fontSize:11 }}>Vencido</span>}
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <Tag color={tipo.color}>{tipo.label}</Tag>
              {mat && <Tag color={C.accent}>{mat.nombre}</Tag>}
              {al  && <Tag color={C.blue}>{al.apellido}, {al.nombre}</Tag>}
              <span style={{ color:C.muted, fontSize:12 }}>📅 {fmt(ev.fecha)}</span>
            </div>
            {ev.descripcion && <div style={{ color:C.dim, fontSize:12, marginTop:5 }}>{ev.descripcion}</div>}
            {ev.archivoUrl  && <a href={ev.archivoUrl} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:6, color:C.accentL, fontSize:12, fontWeight:600, textDecoration:"none" }}>📎 {ev.archivoNombre||"Ver archivo"}</a>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, flexShrink:0 }}>
            <select value={ev.estado} onChange={e => cambiarEstado(ev.id, e.target.value)}
              style={{ background:est.color+"18", border:`1px solid ${est.color}44`, borderRadius:8, padding:"5px 10px", color:est.color, fontSize:12, fontWeight:700, cursor:"pointer", outline:"none" }}>
              {ESTADOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <div style={{ display:"flex", gap:6 }}>
              <Btn v="ghost" sm onClick={() => abrirEditar(ev)}>✏️</Btn>
              <Btn v="danger" sm onClick={() => eliminar(ev.id)}>🗑️</Btn>
            </div>
          </div>
        </div>
      );
    };
    return (
      <div>
        <Breadcrumb items={[{ label:"Inicio", onClick:goInicio }, { label:"Agenda" }]} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <h2 style={{ color:C.text, margin:0, fontSize:20, fontWeight:800 }}>📅 Agenda — Exámenes y TPs</h2>
          <Btn onClick={abrirNuevo}>+ Programar</Btn>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:22 }}>
          <select value={filtroMat} onChange={e => setFiltroMat(e.target.value)}
            style={{ background:"#07101e", border:`1px solid ${C.border}`, borderRadius:9, padding:"7px 12px", color:filtroMat?C.text:C.dim, fontSize:13, outline:"none" }}>
            <option value="">📚 Todas las materias</option>
            {mats.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            style={{ background:"#07101e", border:`1px solid ${C.border}`, borderRadius:9, padding:"7px 12px", color:filtroEstado?C.text:C.dim, fontSize:13, outline:"none" }}>
            <option value="">🔘 Todos los estados</option>
            {ESTADOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        {agendaAll.length === 0
          ? <Empty icon="📅" msg="No hay exámenes ni TPs programados todavía." />
          : <>
              {proximos.length > 0 && <>
                <div style={{ fontSize:11, color:C.accentL, fontWeight:800, textTransform:"uppercase", letterSpacing:1.2, marginBottom:12 }}>Próximos ({proximos.length})</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:28 }}>
                  {proximos.map(ev => <AgendaCard key={ev.id} ev={ev} />)}
                </div>
              </>}
              {pasados.length > 0 && <>
                <div style={{ fontSize:11, color:C.dim, fontWeight:800, textTransform:"uppercase", letterSpacing:1.2, marginBottom:12 }}>Pasados ({pasados.length})</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10, opacity:0.6 }}>
                  {pasados.map(ev => <AgendaCard key={ev.id} ev={ev} />)}
                </div>
              </>}
            </>
        }
        {popOpen && (
          <Pop title={editId ? "✏️ Editar evento" : "📅 Programar examen / TP"} onClose={cerrar}>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Inp label="Título *" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo:e.target.value }))} placeholder="Ej: Parcial Unidades 1-3" />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Sel label="Tipo *" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo:e.target.value }))}>
                  {TIPOS.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </Sel>
                <Inp label="Fecha *" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha:e.target.value }))} />
              </div>
              <Sel label="Materia (opcional)" value={form.materiaId} onChange={e => setForm(f => ({ ...f, materiaId:e.target.value }))}>
                <option value="">— Sin materia específica —</option>
                {mats.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </Sel>
              <Sel label="Alumno específico (opcional)" value={form.alumnoId} onChange={e => setForm(f => ({ ...f, alumnoId:e.target.value }))}>
                <option value="">— Para todo el curso —</option>
                {[...als].sort((a,b) => a.apellido.localeCompare(b.apellido)).map(a => <option key={a.id} value={a.id}>{a.apellido}, {a.nombre}</option>)}
              </Sel>
              <Inp label="Descripción / Temas" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion:e.target.value }))} placeholder="Ej: Unidades 1, 2 y 3 — págs. 40-80" />
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <label style={{ fontSize:10, color:C.dim, fontWeight:800, textTransform:"uppercase", letterSpacing:1.4 }}>📎 Archivo adjunto (opcional)</label>
                <div style={{ background:"#070c18", border:`1.5px dashed ${adjFile?C.accent:C.border}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
                  onClick={() => document.getElementById("adj-inp").click()}>
                  <input id="adj-inp" type="file" accept="image/*,.pdf,.doc,.docx,.xlsx,.pptx" style={{ display:"none" }} onChange={e => setAdjFile(e.target.files[0]||null)} />
                  {adjFile
                    ? <><span style={{ fontSize:18 }}>📄</span><span style={{ color:C.accentL, fontSize:13, fontWeight:600, flex:1 }}>{adjFile.name}</span><button onClick={e => { e.stopPropagation(); setAdjFile(null); }} style={{ background:"none", border:"none", color:C.dim, cursor:"pointer", fontSize:16 }}>✕</button></>
                    : <><span style={{ fontSize:18 }}>☁️</span><span style={{ color:C.dim, fontSize:13 }}>Subir enunciado, PDF, imagen...</span></>
                  }
                </div>
                {form.archivoUrl && !adjFile && <a href={form.archivoUrl} target="_blank" rel="noreferrer" style={{ color:C.accentL, fontSize:12, fontWeight:600, textDecoration:"none" }}>📎 Archivo actual: {form.archivoNombre||"ver"}</a>}
              </div>
              <Sel label="Estado" value={form.estado} onChange={e => setForm(f => ({ ...f, estado:e.target.value }))}>
                {ESTADOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Sel>
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:4 }}>
                <Btn v="ghost" onClick={cerrar}>Cancelar</Btn>
                <Btn onClick={guardar} disabled={uploading}>{uploading ? "⏳ Subiendo..." : editId ? "💾 Guardar cambios" : "📅 Programar"}</Btn>
              </div>
            </div>
          </Pop>
        )}
      </div>
    );
  }
  const resAlumnos = busLower
    ? als.filter(a => `${a.nombre} ${a.apellido} ${a.dni || ""} ${a.curso || ""}`.toLowerCase().includes(busLower))
    : [];
  const resMaterias = busLower
    ? mats.filter(m => m.nombre.toLowerCase().includes(busLower))
    : [];
  const resNotas = busLower
    ? data.notas.filter(n => {
        const al = als.find(a => a.id === n.alumnoId); const mat = mats.find(m => m.id === n.materiaId);
        return al && (`${al.nombre} ${al.apellido}`.toLowerCase().includes(busLower) || (mat && mat.nombre.toLowerCase().includes(busLower)) || (n.descripcion && n.descripcion.toLowerCase().includes(busLower)));
      })
    : [];
  const resActs = busLower
    ? acts.filter(act => {
        const al = als.find(a => a.id === act.alumnoId); const mat = mats.find(m => m.id === act.materiaId);
        return al && (`${al.nombre} ${al.apellido}`.toLowerCase().includes(busLower) || (mat && mat.nombre.toLowerCase().includes(busLower)) || (act.descripcion && act.descripcion.toLowerCase().includes(busLower)) || act.tipo.includes(busLower));
      })
    : [];
  const hayResultados = resAlumnos.length + resMaterias.length + resNotas.length + resActs.length > 0;
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ color: C.text, margin: "0 0 4px", fontSize: 22, fontWeight: 900 }}>{col?.nombre}</h2>
        {col?.direccion && <p style={{ color: C.muted, margin: 0, fontSize: 13 }}>📍 {col.direccion}</p>} </div>  {/* ── Barra de búsqueda ── */} <div style={{ position: "relative", marginBottom: 28 }}>
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</div>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar alumnos, materias, notas, actividades..."
          style={{ width: "100%", background: C.card2, border: `1px solid ${busLower ? C.accent : C.border}`, borderRadius: 12, padding: "12px 40px 12px 42px", color: C.text, fontSize: 14, outline: "none", transition: "border .2s" }}
          onFocus={e => e.target.style.borderColor = C.accent}
          onBlur={e => e.target.style.borderColor = busLower ? C.accent : C.border} />
        {busqueda && (
          <button onClick={() => setBusqueda("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
        )}</div>
      {/* ── Resultados de búsqueda ── */}
      {busLower && (
        <div style={{ marginBottom: 28 }}> {!hayResultados ? ( <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "32px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
              <div style={{ color: C.text, fontWeight: 700, marginBottom: 6 }}>Sin resultados para "{busqueda}"</div>
              <div style={{ color: C.muted, fontSize: 13 }}>Probá buscar por nombre de alumno, materia, tipo de actividad o descripción.</div> </div> ) : ( <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Alumnos */}
              {resAlumnos.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 10 }}>👤 Alumnos ({resAlumnos.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {resAlumnos.map(al => {
                      const alNotas = data.notas.filter(n => n.alumnoId === al.id);
                      const av = alNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v));
                      const alProm = avg(av);
                      const matIds = [...new Set((data.inscripciones || []).filter(i => i.alumnoId === al.id).map(i => i.materiaId))];
                      return (
                        <div key={al.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: "11px 16px", cursor: "pointer", transition: "border .15s" }}
                          onClick={() => setDetalleAlumno(al.id)}
                          onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "55"}
                          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                          <div>
                            <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{al.apellido}, {al.nombre}</div> <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                              {al.curso && <span>Curso: {al.curso}</span>}
                              {al.dni && <span style={{ marginLeft: al.curso ? 8 : 0 }}>DNI: {al.dni}</span>}
                              {matIds.length > 0 && <span style={{ marginLeft: 8 }}>· {matIds.length} materia{matIds.length !== 1 ? "s" : ""}</span>}
                            </div></div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}> <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 22, fontWeight: 900, color: nc(alProm) }}>{alProm ?? "—"}</div>
                              <div style={{ fontSize: 10, color: C.muted }}>promedio</div></div>
                            <span style={{ color: C.accentL, fontSize: 12, fontWeight: 700 }}>ver →</span>
                          </div>
                        </div> );
                    })}</div>
                </div> )}
              {/* Materias */}
              {resMaterias.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 10 }}>📚 Materias ({resMaterias.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {resMaterias.map(m => {
                      const mNotas = data.notas.filter(n => n.materiaId === m.id);
                      const mv = mNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v));
                      const ins = (data.inscripciones || []).filter(i => i.materiaId === m.id).length;
                      return (
                        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: "11px 16px", cursor: "pointer", transition: "border .15s" }}
                          onClick={() => { setDetalleMateria(m.id); setVista("materias"); setBusqueda(""); }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "55"}
                          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                          <div>
                            <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>📚 {m.nombre}</div>
                            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>👥 {ins} alumnos · 📝 {mNotas.length} notas</div> </div> <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: nc(avg(mv)) }}>{avg(mv) ?? "—"}</div>
                            <span style={{ color: C.accentL, fontSize: 12, fontWeight: 700 }}>ver →</span>
                          </div>
                        </div> );
                    })}</div>
                </div> )}
              {/* Notas */}
              {resNotas.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 10 }}>📝 Notas ({resNotas.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {resNotas.slice(0, 8).map(n => {
                      const al = als.find(a => a.id === n.alumnoId);
                      const mat = mats.find(m => m.id === n.materiaId);
                      return (
                        <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: "11px 16px", cursor: "pointer", transition: "border .15s" }}
                          onClick={() => { if (al) { setDetalleAlumno(al.id); setBusqueda(""); } }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "55"}
                          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: nc(n.nota) + "18", border: `2px solid ${nc(n.nota)}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: nc(n.nota) }}>{n.nota}</div>
                            <div>
                              <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{al ? `${al.apellido}, ${al.nombre}` : "—"}</div>
                              <div style={{ color: C.muted, fontSize: 12 }}>{mat?.nombre} · {n.tipo}{n.descripcion ? ` · ${n.descripcion}` : ""} · {fmt(n.fecha)}</div>
                            </div></div>
                          <span style={{ color: C.accentL, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>ver alumno →</span>
                        </div> );
                    })}
                    {resNotas.length > 8 && <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: "6px 0" }}>+{resNotas.length - 8} notas más. Refiná la búsqueda para ver más.</div>}
                  </div>
                </div> )}
              {/* Actividades */}
              {resActs.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 10 }}>⚡ Actividades ({resActs.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {resActs.slice(0, 8).map(act => {
                      const al = als.find(a => a.id === act.alumnoId);
                      const mat = mats.find(m => m.id === act.materiaId);
                      const tc = tipoActColor[act.tipo] || C.dim;
                      return (
                        <div key={act.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: "11px 16px", cursor: "pointer", transition: "border .15s" }}
                          onClick={() => { if (al) { setDetalleAlumno(al.id); setBusqueda(""); } }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "55"}
                          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 5, height: 40, background: tc, borderRadius: 3, flexShrink: 0 }} />
                            <div>
                              <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{al ? `${al.apellido}, ${al.nombre}` : "—"}</div>
                              <div style={{ color: C.muted, fontSize: 12 }}>{mat?.nombre && `${mat.nombre} · `}{act.descripcion} · {fmt(act.fecha)}</div>
                            </div></div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <Tag color={tc}>{act.tipo}</Tag>
                            <span style={{ color: C.accentL, fontSize: 12, fontWeight: 700 }}>ver →</span>
                          </div>
                        </div> );
                    })}
                    {resActs.length > 8 && <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: "6px 0" }}>+{resActs.length - 8} actividades más. Refiná la búsqueda para ver más.</div>}
                  </div>
                </div> )}
            </div> )}
        </div> )}
      {/* Stats cards — solo si no hay búsqueda activa */}
      {!busLower && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
        <SC label="Materias"        value={mats.length}   color={C.blue}   onClick={() => setVista("materias")}    sub="click para ver" />
        <SC label="Alumnos"         value={als.length}    color={C.accentL} onClick={() => setVista("alumnos")}    sub="click para ver" />
        <SC label="Notas por curso" value={notas.length}  color={C.yellow} onClick={() => setVista("notas")}       sub="click para ver" />
        <SC label="Promedio por mat." value={prom ?? "—"} color={nc(prom)} onClick={() => setVista("promedio")}    sub="click para ver" />
        <SC label="Agenda" value={(data.agenda||[]).filter(e=>e.colegioId===colegioId).length} color={C.yellow} onClick={() => setVista("agenda")} sub="click para ver" />
      </div>}
      {/* Resumen rápido por materia */}
      {!busLower && mats.length > 0 && (
        <>
          <h3 style={{ color: C.dim, fontSize: 12, fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1.2 }}>Resumen por materia</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 28 }}>
            {mats.map(m => {
              const mNotas = notas.filter(n => n.materiaId === m.id);
              const mv = mNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v)); const mProm = avg(mv);
              const ins = (data.inscripciones || []).filter(i => i.materiaId === m.id).length;
              return (
                <Box key={m.id} hi style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px" }} onClick={() => { setDetalleMateria(m.id); setVista("materias"); }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{m.nombre}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>👥 {ins} · 📝 {mNotas.length}</div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: nc(mProm) }}>{mProm ?? "—"}</div>
                </Box> );
            })}</div>
        </> )}
      {/* Feed unificado: actividades + notas + eventos + inasistencias + documentos */}
      {!busLower && (() => {
        const feed = [
          ...acts.map(a => ({ ...a, _src: "actividad", _fecha: a.fecha || "" })),
          ...notas.map(n => ({ ...n, _src: "nota", _fecha: n.fecha || "" })),
          ...eventos.map(e => ({ ...e, _src: "evento", _fecha: e.fecha || "" })),
          ...inasistencias.map(i => ({ ...i, _src: "inasistencia", _fecha: i.fecha || "" })),
          ...recentDocs.map(d => ({ ...d, _src: "documento", _fecha: d.createdAt || d.fecha || "" })),
          ...mats.map(m => ({ ...m, _src: "materia", _fecha: m.createdAt || "" })),
          ...als.map(a => ({ ...a, _src: "alumno", _fecha: a.createdAt || "" })),
        ].filter(x => x._fecha).sort((a, b) => new Date(b._fecha || 0) - new Date(a._fecha || 0)).slice(0, 10);

        if (feed.length === 0) return null;
        return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ color: C.dim, fontSize: 12, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: 1.2 }}>Actividad reciente</h3>
              <button onClick={() => setVista("agenda")} style={{ background: "none", border: "none", color: C.accentL, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>ver agenda →</button>
            </div>
            <Box>
              {feed.map((item, idx) => {
                const al  = als.find(a => a.id === item.alumnoId);
                const mat = mats.find(m => m.id === item.materiaId);
                const isLast = idx === feed.length - 1;
                const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: isLast ? "none" : `1px solid ${C.border}`, gap: 10 };

                if (item._src === "actividad") {
                  const tc = tipoActColor[item.tipo] || C.dim;
                  return (
                    <div key={item.id} style={{ ...rowStyle, cursor: "pointer" }} onClick={() => { setDetalleAlumno(item.alumnoId); }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: tc + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>⚡</div>
                        <div>
                          <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{al?.nombre} {al?.apellido}</span>
                          {mat && <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>{mat.nombre}</span>}
                          <div style={{ fontSize: 12, color: C.dim, marginTop: 1 }}>{item.descripcion}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <Tag color={tc}>{item.tipo}</Tag>
                        <span style={{ color: C.muted, fontSize: 11 }}>{fmt(item._fecha)}</span>
                      </div>
                    </div>
                  );
                }

                if (item._src === "nota") {
                  const nc2 = nc(item.nota);
                  return (
                    <div key={item.id} style={{ ...rowStyle, cursor: "pointer" }} onClick={() => setDetalleAlumno(item.alumnoId)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: nc2 + "18", border: `1.5px solid ${nc2}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: nc2, flexShrink: 0 }}>{item.nota}</div>
                        <div>
                          <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{al?.nombre} {al?.apellido}</span>
                          {mat && <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>{mat.nombre}</span>}
                          <div style={{ fontSize: 12, color: C.dim, marginTop: 1 }}>{item.descripcion || item.tipo}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <Tag color={C.blue}>📝 {item.tipo}</Tag>
                        <span style={{ color: C.muted, fontSize: 11 }}>{fmt(item._fecha)}</span>
                      </div>
                    </div>
                  );
                }

                if (item._src === "evento") {
                  const tipoEv = item.tipo === "plenaria" ? C.accent : C.yellow;
                  return (
                    <div key={item.id} style={{ ...rowStyle, cursor: "pointer" }} onClick={() => onChangeTab && onChangeTab("eventos")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: tipoEv + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>📅</div>
                        <div>
                          <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{item.titulo}</span>
                          {item.hora && <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>{item.hora}hs</span>}
                          {item.descripcion && <div style={{ fontSize: 12, color: C.dim, marginTop: 1 }}>{item.descripcion}</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <Tag color={tipoEv}>{item.tipo}</Tag>
                        <span style={{ color: C.muted, fontSize: 11 }}>{fmt(item._fecha)}</span>
                      </div>
                    </div>
                  );
                }

                if (item._src === "inasistencia") {
                  return (
                    <div key={item.id} style={{ ...rowStyle, cursor: "pointer" }} onClick={() => onChangeTab && onChangeTab("eventos")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: C.red + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🗓️</div>
                        <div>
                          <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{item.docente || item.nombre || "Docente"}</span>
                          <div style={{ fontSize: 12, color: C.dim, marginTop: 1 }}>Inasistencia · {item.tipoInasist || item.tipo || "—"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <Tag color={C.red}>inasistencia</Tag>
                        <span style={{ color: C.muted, fontSize: 11 }}>{fmt(item._fecha)}</span>
                      </div>
                    </div>
                  );
                }

                if (item._src === "documento") {
                  const alDoc = als.find(a => a.id === item.alumnoId);
                  const matDoc = mats.find(m => m.id === item.materiaId);
                  return (
                    <div key={item.id} style={{ ...rowStyle, cursor: "pointer" }} onClick={() => onChangeTab && onChangeTab("documentos")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: C.yellow + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>📁</div>
                        <div>
                          {alDoc && <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{alDoc.nombre} {alDoc.apellido}</span>}
                          {matDoc && <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>{matDoc.nombre}</span>}
                          <div style={{ fontSize: 12, color: C.dim, marginTop: 1, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nombre || item.url || "Archivo subido"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <Tag color={C.yellow}>📁 doc</Tag>
                        <span style={{ color: C.muted, fontSize: 11 }}>{fmt(item._fecha)}</span>
                      </div>
                    </div>
                  );
                }

                if (item._src === "materia") {
                  return (
                    <div key={item.id} style={{ ...rowStyle, cursor: "pointer" }} onClick={() => onChangeTab && onChangeTab("materias")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: C.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>📚</div>
                        <div>
                          <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{item.nombre}</span>
                          {item.descripcion && <div style={{ fontSize: 12, color: C.dim, marginTop: 1 }}>{item.descripcion}</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <Tag color={C.accent}>nueva materia</Tag>
                        <span style={{ color: C.muted, fontSize: 11 }}>{fmt(item._fecha)}</span>
                      </div>
                    </div>
                  );
                }

                if (item._src === "alumno") {
                  return (
                    <div key={item.id} style={{ ...rowStyle, cursor: "pointer" }} onClick={() => onChangeTab && onChangeTab("alumnos")}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: C.blue + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>👤</div>
                        <div>
                          <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{item.nombre} {item.apellido}</span>
                          {item.curso && <div style={{ fontSize: 12, color: C.dim, marginTop: 1 }}>{item.curso}</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <Tag color={C.blue}>nuevo alumno</Tag>
                        <span style={{ color: C.muted, fontSize: 11 }}>{fmt(item._fecha)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </Box>
          </>
        );
      })()}
    </div> ); };
const AlumnoDetalle = ({ data, setData, alumnoId, materiaId }) => {
  const alumno = data.alumnos.find(a => a.id === alumnoId);
  const materia = data.materias.find(m => m.id === materiaId);
  const [subTab, setSubTab] = useState("notas"); const [popNota, setPopNota] = useState(false); const [popAct, setPopAct] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const migrarHistorialExistente = async () => {
    setLoadingHistorial(true);
    console.log("Migrando - notas:", notas.length, "acts:", acts.length, "alumnoId:", alumnoId);
    const entries = [];
    // Migrate existing notas
    for (const n of notas) {
      entries.push({ id: crypto.randomUUID(), alumno_id: alumnoId, accion: "Nota agregada (migrado)", detalle: `${n.tipo || "nota"} — ${n.descripcion || ""} — Nota: ${n.nota}`, created_at: n.fecha ? new Date(n.fecha).toISOString() : new Date().toISOString() });
    }
    // Migrate existing actividades
    for (const a of acts) {
      entries.push({ id: crypto.randomUUID(), alumno_id: alumnoId, accion: "Actividad agregada (migrado)", detalle: `${a.tipo} — ${a.descripcion} — ${a.fecha}`, created_at: a.fecha ? new Date(a.fecha).toISOString() : new Date().toISOString() });
    }
    if (entries.length > 0) {
      const { error: insErr } = await supabase.from("historial").insert(entries);
      console.log("Insert error:", JSON.stringify(insErr));
      console.log("Sample entry:", JSON.stringify(entries[0]));
    }
    const { data: rows } = await supabase.from("historial").select("*").eq("alumno_id", alumnoId).order("created_at", { ascending: false });
    setHistorial(rows || []);
    setLoadingHistorial(false);
  };

  const verHistorial = async () => {
    setShowHistorial(true);
    setLoadingHistorial(true);
    const { data: rows } = await supabase.from("historial").select("*").eq("alumno_id", alumnoId).order("created_at", { ascending: false });
    setHistorial(rows || []);
    setLoadingHistorial(false);
  };
  const [popAsist, setPopAsist] = useState(false); const [editNotaId, setEditNotaId] = useState(null);
  const emptyNota = { nota: "", tipo: "parcial", descripcion: "", fecha: new Date().toISOString().slice(0, 10) };

  const emptyAct  = { tipo: "positiva", descripcion: "", fecha: new Date().toISOString().slice(0, 10), hora: fmtT(new Date()) };

  const emptyAsist = { estado: "presente", fecha: new Date().toISOString().slice(0, 10), observacion: "" };

  const [formNota, setFormNota] = useState(emptyNota); const [formAct,  setFormAct]  = useState(emptyAct);
  const [formAsist, setFormAsist] = useState(emptyAsist);
  const notas      = data.notas.filter(n => n.alumnoId === alumnoId && n.materiaId === materiaId);
  const [docsAlumno, setDocsAlumno] = useState([]);
  useEffect(() => {
    supabase.from("documentos").select("*").eq("alumno_id", alumnoId).order("created_at", { ascending: false })
      .then(({ data: docs }) => setDocsAlumno(docs || []));
  }, [alumnoId]);
  const acts       = data.actividades.filter(a => a.alumnoId === alumnoId && a.materiaId === materiaId);
  const asistencias = (data.asistencias || []).filter(a => a.alumnoId === alumnoId && a.materiaId === materiaId);
  const vals = notas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v)); const prom = avg(vals);
  const totalClases   = asistencias.length;
  const presentes     = asistencias.filter(a => a.estado === "presente").length;
  const ausentes      = asistencias.filter(a => a.estado === "ausente").length;
  const tardanzas     = asistencias.filter(a => a.estado === "tardanza").length;
  const justificados  = asistencias.filter(a => a.estado === "justificado").length;
  const pctAsist      = totalClases > 0 ? Math.round((presentes / totalClases) * 100) : null;
  const asistColor    = pctAsist === null ? C.muted : pctAsist >= 75 ? C.green : pctAsist >= 50 ? C.yellow : C.red;
  const saveNota = async () => {
    const v = parseFloat(formNota.nota);
    if (isNaN(v) || v < 0 || v > 10) { alert("Nota debe ser entre 0 y 10"); return; }
    if (editNotaId) {
      const updated = { ...data.notas.find(n => n.id === editNotaId), ...formNota };
      setData(d => ({ ...d, notas: d.notas.map(n => n.id === editNotaId ? updated : n) }));
      await upsertRow("notas", updated);
      await registrarHistorial(alumnoId, "Nota editada", `${formNota.tipo} — ${formNota.descripcion || ""} — Nota: ${formNota.nota}`);
    } else {
      const nueva = { id: uid(), alumnoId, materiaId, ...formNota };
      setData(d => ({ ...d, notas: [...d.notas, nueva] }));
      await upsertRow("notas", nueva);
      await registrarHistorial(alumnoId, "Nota agregada", `${formNota.tipo} — ${formNota.descripcion || ""} — Nota: ${formNota.nota}`);
    }
    setPopNota(false); setEditNotaId(null); setFormNota(emptyNota); };
  const delNota = async (id) => {
    if (!confirm("¿Eliminar nota?")) return;
    const nota = data.notas.find(n => n.id === id);
    // Buscar documento asociado en Supabase por nombre de archivo y alumno
    if (nota?.descripcion && nota?.alumnoId) {
      try {
        const { data: docs } = await supabase.from("documentos")
          .select("*")
          .eq("alumno_id", nota.alumnoId)
          .eq("nombre", nota.descripcion);
        console.log("Docs asociados:", docs);
        if (docs && docs.length > 0) {
          const doc = docs[0];
          if (doc.storage_path) {
            const delRes = await fetch("/api/delete-file", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicId: doc.storage_path })
            });
            const delData = await delRes.json();
            console.log("Cloudinary delete result:", delData);
          }
          await supabase.from("documentos").delete().eq("id", doc.id);
        }
      } catch(e) { console.log("Error eliminando imagen:", e.message); }
    }
    await registrarHistorial(nota.alumnoId, "Nota eliminada", `${nota.tipo || "nota"} — ${nota.descripcion || ""} — Nota: ${nota.nota}`, true);
    await supabase.from("notas").delete().eq("id", id);
    setData(d => ({ ...d, notas: d.notas.filter(n => n.id !== id) }));
  };

  const editNota = (n) => { setFormNota({ nota: n.nota, tipo: n.tipo, descripcion: n.descripcion || "", fecha: n.fecha }); setEditNotaId(n.id); setPopNota(true); };

  const saveAct = async () => {
    if (!formAct.descripcion.trim()) return;
    const nueva = { id: uid(), alumnoId, materiaId, ...formAct };
    setData(d => ({ ...d, actividades: [...d.actividades, nueva] }));
    // Guardar en Supabase con solo las columnas seguras (hora puede no existir en la tabla)
    const { error } = await supabase.from("actividades").upsert({
      id: nueva.id,
      alumno_id: alumnoId,
      materia_id: materiaId,
      tipo: nueva.tipo,
      descripcion: nueva.descripcion,
      fecha: nueva.fecha,
    }, { onConflict: "id" });
    if (error) {
      console.error("Error guardando actividad:", error);
      // Intentar con hora también por si la columna existe
      const { error: error2 } = await supabase.from("actividades").upsert({
        id: nueva.id, alumno_id: alumnoId, materia_id: materiaId,
        tipo: nueva.tipo, descripcion: nueva.descripcion, fecha: nueva.fecha, hora: nueva.hora,
      }, { onConflict: "id" });
      if (error2) {
        console.error("Error guardando actividad (con hora):", error2);
        alert("Error al guardar la actividad: " + error2.message);
        setData(d => ({ ...d, actividades: d.actividades.filter(a => a.id !== nueva.id) }));
        return;
      }
    }
    await registrarHistorial(alumnoId, "Actividad agregada", `${formAct.tipo} — ${formAct.descripcion} — ${formAct.fecha}`);
    setPopAct(false); setFormAct(emptyAct); };
  const delAct = async (id) => {
    if (!confirm("¿Eliminar actividad?")) return;
    const act = data.actividades.find(a => a.id === id);
    if (act) await registrarHistorial(act.alumnoId, "Actividad eliminada", `${act.tipo} — ${act.descripcion} — ${act.fecha}`, true);
    await supabase.from("actividades").delete().eq("id", id);
    setData(d => ({ ...d, actividades: d.actividades.filter(a => a.id !== id) }));
  };

  const saveAsist = async () => {
    const nueva = { id: uid(), alumnoId, materiaId, ...formAsist };
    setData(d => ({ ...d, asistencias: [...(d.asistencias || []), nueva] }));
    await upsertRow("asistencias", nueva);
    setPopAsist(false); setFormAsist(emptyAsist); };
  const delAsist = async (id) => {
    if (!confirm("¿Eliminar registro?")) return;
    setData(d => ({ ...d, asistencias: (d.asistencias || []).filter(a => a.id !== id) }));
    await deleteRow("asistencias", id); };

  const tipoActColor  = { positiva: C.green, negativa: C.red, neutral: C.yellow, participacion: C.blue, observacion: C.dim };

  const estadoColor   = { presente: C.green, ausente: C.red, tardanza: C.yellow, justificado: C.blue };

  const estadoIcon    = { presente: "✅", ausente: "❌", tardanza: "🕐", justificado: "📋" };

  const SUBTABS = [
    { id: "notas",       icon: "📝", label: `Notas (${notas.length})` },
    { id: "actividades", icon: "⚡", label: `Actividades (${acts.length})` },
    { id: "asistencia",  icon: "📅", label: `Asistencia (${totalClases})` },
    { id: "archivos",    icon: "📁", label: `Archivos` }, ];
  return (
    <div>
      {/* Header alumno */}
      <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 22px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 52, height: 52, background: C.accentDim, border: `2px solid ${C.accent}44`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👤</div>
          <div>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 18 }}>{alumno?.apellido}, {alumno?.nombre}</div> <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
              {alumno?.curso && <span>Curso: {alumno.curso} · </span>}
              {alumno?.dni && <span>DNI: {alumno.dni}</span>}</div></div></div>
        <div style={{ display: "flex", gap: 20 }}> <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: nc(prom) }}>{prom ?? "—"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{notas.length} evaluaciones</div> </div> <div style={{ width: 1, background: C.border }} /> <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: asistColor }}>{pctAsist !== null ? `${pctAsist}%` : "—"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{totalClases} clases reg.</div></div>
        </div></div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 3, marginBottom: 22, background: C.card2, borderRadius: 12, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
        {SUBTABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all .15s", background: subTab === t.id ? C.accent : "transparent", color: subTab === t.id ? "#fff" : C.dim, whiteSpace: "nowrap" }}>
            {t.icon} {t.label}
          </button>
        ))}</div>
      {/* Boton historial */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={verHistorial}
          style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 16px", color: C.muted, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s" }}
          onMouseEnter={e => { e.currentTarget.style.color = C.accentL; e.currentTarget.style.borderColor = C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border; }}>
          🕓 Ver historial
        </button>
      </div>

      {/* Modal historial */}
      {showHistorial && (
        <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowHistorial(false)}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, maxWidth: 520, width: "100%", maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.accentL }}>🕓 Historial — {alumno?.apellido}, {alumno?.nombre}</div>
              <button onClick={() => setShowHistorial(false)} style={{ background: "transparent", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            {loadingHistorial ? (
              <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>Cargando...</div>
            ) : (
            <>
            {historial.filter(h => h.accion?.includes("migrado")).length === 0 && (notas.length > 0 || acts.length > 0) && (
              <div style={{ marginBottom: 16, padding: "10px 14px", background: C.accentDim, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: C.dim }}>Hay notas/actividades anteriores sin registrar</span>
                <button onClick={migrarHistorialExistente} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Importar historial</button>
              </div>
            )}
            {historial.length === 0 ? (
              <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>Sin actividad registrada</div>
            ) : historial.map((h, i) => {
              const fecha = new Date(h.created_at);
              const dia = fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
              const hora = fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={i} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 12, marginBottom: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 90, fontSize: 11, color: C.muted, paddingTop: 2, lineHeight: 1.6 }}>
                    <div>{dia}</div>
                    <div>{hora}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: h.eliminado ? "#ef4444" : C.text }}>
                      {h.eliminado ? "🗑️" : "✅"} {h.accion}
                    </div>
                    <div style={{ fontSize: 12, color: h.eliminado ? "#ef444499" : C.dim, marginTop: 3 }}>{h.detalle}</div>
                  </div>
                </div>
              );
            })}
            </>
            )}
          </div>
        </div>
      )}

      {/* ── NOTAS ── */}
      {subTab === "notas" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Btn onClick={() => { setFormNota(emptyNota); setEditNotaId(null); setPopNota(true); }}>+ Agregar Nota</Btn>
          </div>
          {notas.length === 0 ? <Empty icon="📝" msg="No hay notas registradas para este alumno en esta materia." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {notas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(n => (
                <Box key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px" }}> <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 52, height: 52, background: nc(n.nota) + "15", border: `2px solid ${nc(n.nota)}44`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: nc(n.nota) }}>{n.nota}</div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Tag color={C.blue}>{n.tipo}</Tag>
                        {n.descripcion && <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{n.descripcion}</span>}
                      </div>
                      <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>📅 {fmt(n.fecha)}</div> </div> </div> <div style={{ display: "flex", gap: 6 }}>
                    <Btn v="ghost" sm onClick={() => editNota(n)}>✏️</Btn>
                    <Btn v="danger" sm onClick={() => delNota(n.id)}>🗑️</Btn></div>
                </Box>
              ))}
            </div> )}
          {notas.length > 0 && (
            <>
            <Box style={{ marginTop: 20, display: "flex", gap: 28, padding: "16px 22px", flexWrap: "wrap" }}>
              <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 700 }}>PROMEDIO</div><div style={{ fontSize: 28, fontWeight: 900, color: nc(prom) }}>{prom}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 700 }}>NOTA MÁX.</div><div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{vals.length ? Math.max(...vals) : "—"}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 700 }}>NOTA MÍN.</div><div style={{ fontSize: 28, fontWeight: 900, color: C.red }}>{vals.length ? Math.min(...vals) : "—"}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 700 }}>EVALUACIONES</div><div style={{ fontSize: 28, fontWeight: 900, color: C.dim }}>{notas.length}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 700 }}>ASISTENCIA</div><div style={{ fontSize: 28, fontWeight: 900, color: asistColor }}>{pctAsist !== null ? `${pctAsist}%` : "—"}</div></div>
            </Box>
            {notas.length >= 1 && (() => {
              const tipoColors = { parcial: "#22c55e", final: "#f97316", trabajo: "#34d399", oral: "#fbbf24", recuperatorio: "#fb923c", otro: "#60a5fa" };
              const cuatri1 = notas.filter(n => { const m = new Date(n.fecha+"T12:00:00").getMonth()+1; return m>=3&&m<=6; });
              const cuatri2 = notas.filter(n => { const m = new Date(n.fecha+"T12:00:00").getMonth()+1; return m>=8&&m<=11; });
              const tiposPresentes = [...new Set(notas.map(n=>n.tipo).filter(Boolean))];
              const HBarGroup = ({ notasGrupo, label }) => (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: C.accentL, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>{label}</div>
                  {notasGrupo.length === 0 ? (
                    <div style={{ color: C.muted, fontSize: 12, padding: "10px 0 16px" }}>Sin notas registradas</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[...notasGrupo].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(n => {
                        const v = parseFloat(n.nota);
                        const pct = isNaN(v) ? 0 : (v/10)*100;
                        const color = tipoColors[n.tipo] || C.dim;
                        return (
                          <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 100, fontSize: 11, color: C.dim, textAlign: "right", flexShrink: 0, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.descripcion || n.tipo}</div>
                            <div style={{ flex: 1, background: C.bg, borderRadius: 6, height: 24, overflow: "hidden", position: "relative" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 6, transition: "width .5s ease", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>{n.nota}</span>
                              </div>
                              <div style={{ position: "absolute", top: 0, left: "60%", width: 2, height: "100%", background: "#ffffff22" }} title="Nota 6" />
                            </div>
                            <div style={{ width: 14, height: 14, borderRadius: 3, background: color, flexShrink: 0 }} title={n.tipo} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
              return (
                <Box style={{ marginTop: 12, padding: "20px 24px" }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 18, textTransform: "uppercase", letterSpacing: 1.1 }}>📊 Evolución por cuatrimestre</div>
                  <HBarGroup notasGrupo={cuatri1} label="1° Cuatrimestre — Marzo a Junio" />
                  <div style={{ borderTop: `1px solid ${C.border}`, margin: "16px 0" }} />
                  <HBarGroup notasGrupo={cuatri2} label="2° Cuatrimestre — Agosto a Noviembre" />
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                    {tiposPresentes.map(tipo => (
                      <div key={tipo} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, background: tipoColors[tipo]||C.dim }} />
                        <span style={{ fontSize: 12, color: C.dim, textTransform: "capitalize" }}>{tipo}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                      <div style={{ width: 2, height: 14, background: "#ffffff22" }} />
                      <span style={{ fontSize: 11, color: C.muted }}>línea blanca = nota 6</span>
                    </div>
                  </div>
                </Box>
              );
            })()}
            </>
          )}
        </div> )}
      {/* ── ACTIVIDADES ── */}
      {subTab === "actividades" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Btn onClick={() => { setFormAct(emptyAct); setPopAct(true); }}>+ Registrar Actividad</Btn>
          </div>
          {acts.length === 0 ? <Empty icon="⚡" msg="No hay actividades registradas para este alumno en esta materia." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {acts.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(act => {
                const tc = tipoActColor[act.tipo] || C.dim;
                return (
                  <Box key={act.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px" }}> <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 5, height: 48, background: tc, borderRadius: 4, flexShrink: 0 }} />
                      <div>
                        <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{act.descripcion}</div>
                        <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>📅 {fmt(act.fecha)}{act.hora ? ` · 🕐 ${act.hora}` : ""}</div> </div> </div> <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Tag color={tc}>{act.tipo}</Tag>
                      <Btn v="danger" sm onClick={() => delAct(act.id)}>🗑️</Btn></div>
                  </Box> );
              })}
            </div> )}
        </div> )}
      {/* ── ASISTENCIA ── */}
      {subTab === "asistencia" && (
        <div>
          {/* Resumen asistencia */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "PRESENTES",    value: presentes,   color: C.green  },
              { label: "AUSENTES",     value: ausentes,    color: C.red    },
              { label: "TARDANZAS",    value: tardanzas,   color: C.yellow },
              { label: "JUSTIFICADOS", value: justificados,color: C.blue   },
              { label: "% ASISTENCIA", value: pctAsist !== null ? `${pctAsist}%` : "—", color: asistColor },
            ].map(s => (
              <Box key={s.label} style={{ textAlign: "center", padding: "14px 10px" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4, fontWeight: 700, letterSpacing: 0.8 }}>{s.label}</div>
              </Box>
            ))}</div>
          {/* Barra visual de asistencia */}
          {totalClases > 0 && (
            <Box style={{ marginBottom: 20, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, marginBottom: 8 }}>REGISTRO DE CLASES</div> <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {asistencias.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map(a => (
                  <div key={a.id} title={`${fmt(a.fecha)} — ${a.estado}${a.observacion ? ": " + a.observacion : ""}`}
                    style={{ width: 28, height: 28, borderRadius: 7, background: estadoColor[a.estado] + "22", border: `2px solid ${estadoColor[a.estado]}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: "default" }}>
                    {estadoIcon[a.estado]}</div>
                ))}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}> {Object.entries(estadoIcon).map(([k, icon]) => ( <span key={k} style={{ fontSize: 11, color: C.dim }}>
                    {icon} <span style={{ color: estadoColor[k] }}>{k}</span> </span> ))} </div> </Box> )}  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Btn onClick={() => { setFormAsist(emptyAsist); setPopAsist(true); }}>+ Registrar Asistencia</Btn>
          </div>
          {asistencias.length === 0 ? <Empty icon="📅" msg="No hay registros de asistencia para este alumno en esta materia." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {asistencias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(a => (
                <Box key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px" }}> <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: estadoColor[a.estado] + "18", border: `2px solid ${estadoColor[a.estado]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      {estadoIcon[a.estado]}</div>
                    <div>
                      <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>📅 {fmt(a.fecha)}</div>
                      {a.observacion && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{a.observacion}</div>} </div> </div> <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Tag color={estadoColor[a.estado]}>{a.estado}</Tag>
                    <Btn v="danger" sm onClick={() => delAsist(a.id)}>🗑️</Btn></div>
                </Box>
              ))}
            </div> )}
        </div> )}
          {subTab === "archivos" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Documentos del alumno</div>
              </div>
              {docsAlumno.length === 0 ? (
                <Empty icon="📁" msg="No hay archivos para este alumno." />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {docsAlumno.map(doc => {
                    const isImg = doc.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                    const tipoLabel = { examen: "📝 Examen", trabajo: "📋 Trabajo", documento: "📄 Documento", dni: "🪪 DNI" };
                    return (
                      <Box key={doc.id} style={{ padding: 0, overflow: "hidden" }}>
                        {isImg ? (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <img src={doc.url} alt={doc.nombre} style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                          </a>
                        ) : (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, background: C.bg, textDecoration: "none" }}>
                            <span style={{ fontSize: 32 }}>📄</span>
                          </a>
                        )}
                        <div style={{ padding: "10px 12px" }}>
                          <div style={{ color: C.text, fontSize: 12, fontWeight: 700, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.nombre}</div>
                          <span style={{ background: C.accentDim, color: C.accentL, borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>{tipoLabel[doc.tipo] || doc.tipo}</span>
                          <div style={{ color: C.dim, fontSize: 11, marginTop: 4 }}>{doc.fecha}</div>
                        </div>
                      </Box>
                    );
                  })}
                </div>
              )}
            </div>
          )}
      {/* Pop Nota */}
      {popNota && (
        <Pop title={editNotaId ? "Editar Nota" : "Agregar Nota"} onClose={() => { setPopNota(false); setEditNotaId(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.accentL }}>
              📚 {materia?.nombre} · 👤 {alumno?.nombre} {alumno?.apellido}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Inp label="Nota * (0-10)" type="number" min="0" max="10" step="0.1" value={formNota.nota} onChange={e => setFormNota(f => ({ ...f, nota: e.target.value }))} placeholder="Ej: 8.5" />
              <Sel label="Tipo de evaluación" value={formNota.tipo} onChange={e => setFormNota(f => ({ ...f, tipo: e.target.value }))}>
                <option value="parcial">Parcial</option>
                <option value="final">Final</option>
                <option value="trabajo">Trabajo práctico</option>
                <option value="oral">Oral</option>
                <option value="recuperatorio">Recuperatorio</option>
                <option value="otro">Otro</option>
              </Sel></div>
            <Inp label="Descripción" value={formNota.descripcion} onChange={e => setFormNota(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Primer parcial, unidades 1-3" />
            <Inp label="Fecha" type="date" value={formNota.fecha} onChange={e => setFormNota(f => ({ ...f, fecha: e.target.value }))} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn v="ghost" onClick={() => { setPopNota(false); setEditNotaId(null); }}>Cancelar</Btn>
              <Btn onClick={saveNota}>💾 Guardar nota</Btn></div></div>
        </Pop> )}
      {/* Pop Actividad */}
      {popAct && (
        <Pop title="Registrar Actividad en Clase" onClose={() => setPopAct(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.accentL }}>
              📚 {materia?.nombre} · 👤 {alumno?.nombre} {alumno?.apellido}</div>
            <Sel label="Tipo de actividad *" value={formAct.tipo} onChange={e => setFormAct(f => ({ ...f, tipo: e.target.value }))}>
              <option value="positiva">✅ Positiva</option>
              <option value="negativa">❌ Negativa</option>
              <option value="neutral">⚪ Neutral</option>
              <option value="participacion">🙋 Participación activa</option>
              <option value="observacion">📌 Observación docente</option>
            </Sel>
            <Inp label="Descripción *" value={formAct.descripcion} onChange={e => setFormAct(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Participó activamente en la resolución..." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Inp label="Fecha" type="date" value={formAct.fecha} onChange={e => setFormAct(f => ({ ...f, fecha: e.target.value }))} />
              <Inp label="Hora" type="time" value={formAct.hora} onChange={e => setFormAct(f => ({ ...f, hora: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn v="ghost" onClick={() => setPopAct(false)}>Cancelar</Btn>
              <Btn onClick={saveAct}>💾 Registrar</Btn></div></div>
        </Pop> )}
      {/* Pop Asistencia */}
      {popAsist && (
        <Pop title="Registrar Asistencia" onClose={() => setPopAsist(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.accentL }}>
              📚 {materia?.nombre} · 👤 {alumno?.nombre} {alumno?.apellido}</div>
            <Inp label="Fecha *" type="date" value={formAsist.fecha} onChange={e => setFormAsist(f => ({ ...f, fecha: e.target.value }))} />
            <Sel label="Estado *" value={formAsist.estado} onChange={e => setFormAsist(f => ({ ...f, estado: e.target.value }))}>
              <option value="presente">✅ Presente</option>
              <option value="ausente">❌ Ausente</option>
              <option value="tardanza">🕐 Tardanza</option>
              <option value="justificado">📋 Ausente justificado</option>
            </Sel>
            <Inp label="Observación (opcional)" value={formAsist.observacion} onChange={e => setFormAsist(f => ({ ...f, observacion: e.target.value }))} placeholder="Ej: Llegó 15 min tarde, con justificativo médico..." />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn v="ghost" onClick={() => setPopAsist(false)}>Cancelar</Btn>
              <Btn onClick={saveAsist}>💾 Registrar</Btn></div></div>
        </Pop> )}
    </div> ); };
const MateriaDetalle = ({ data, setData, materiaId, colegioId, onBack }) => {
  const materia = data.materias.find(m => m.id === materiaId);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null); const [popAgregarAlumno, setPopAgregarAlumno] = useState(false); const [busqueda, setBusqueda] = useState("");
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const emptyForm = { nombre: "", apellido: "", dni: "", curso: "", email: "", telefono: "" };

  const [formNuevo, setFormNuevo] = useState(emptyForm);
  const [popMasiva, setPopMasiva] = useState(false);
  const [notasMasivas, setNotasMasivas] = useState({});
  const [tipoMasivo, setTipoMasivo] = useState("parcial");
  const [fechaMasiva, setFechaMasiva] = useState(new Date().toISOString().slice(0,10));
  const [descMasiva, setDescMasiva] = useState("");
  const alumnosColegio = data.alumnos.filter(a => a.colegioId === colegioId);
  const inscriptos = data.inscripciones
    ? data.inscripciones.filter(i => i.materiaId === materiaId).map(i => i.alumnoId)
    : [];
  const alumnosMateria = alumnosColegio.filter(a => inscriptos.includes(a.id));
  const disponibles = alumnosColegio.filter(a => !inscriptos.includes(a.id) && `${a.nombre} ${a.apellido} ${a.dni || ""}`.toLowerCase().includes(busqueda.toLowerCase()));
  const agregarAlumno = async (alumnoId) => {
    const insc = { id: uid(), materiaId, alumnoId };
    setData(d => ({ ...d, inscripciones: [...(d.inscripciones || []), insc] }));
    await upsertRow("inscripciones", insc); };
  const crearYAgregarAlumno = async () => {
    if (!formNuevo.nombre.trim() || !formNuevo.apellido.trim()) return;
    const nuevoId = uid();
    const nuevoAlumno = { id: nuevoId, colegioId, ...formNuevo };
    const insc = { id: uid(), materiaId, alumnoId: nuevoId };
    setData(d => ({
      ...d,
      alumnos: [...d.alumnos, nuevoAlumno],
      inscripciones: [...(d.inscripciones || []), insc],
    }));
    await upsertRow("alumnos", nuevoAlumno);
    await upsertRow("inscripciones", insc);
    setFormNuevo(emptyForm);
    setCreandoNuevo(false);
    setBusqueda(""); };
  const quitarAlumno = async (alumnoId) => {
    if (!confirm("¿Quitar este alumno de la materia?")) return;
    const insc = (data.inscripciones || []).find(i => i.materiaId === materiaId && i.alumnoId === alumnoId);
    setData(d => ({ ...d, inscripciones: (d.inscripciones || []).filter(i => !(i.materiaId === materiaId && i.alumnoId === alumnoId)) }));
    if (insc?.id) await deleteRow("inscripciones", insc.id);
  };
  const saveMasiva = async () => {
    const nuevasNotas = [];
    for (const [alumnoId, nota] of Object.entries(notasMasivas)) {
      const v = parseFloat(nota);
      if (!isNaN(v) && v >= 0 && v <= 10) {
        nuevasNotas.push({ id: uid(), alumnoId, materiaId, nota: String(v), tipo: tipoMasivo, descripcion: descMasiva, fecha: fechaMasiva });
      }
    }
    if (nuevasNotas.length === 0) { alert("No ingresaste ninguna nota válida."); return; }
    setData(d => ({ ...d, notas: [...d.notas, ...nuevasNotas] }));
    for (const nota of nuevasNotas) { await upsertRow("notas", nota); }
    setPopMasiva(false); setNotasMasivas({}); setDescMasiva("");
    alert(`✅ Se guardaron ${nuevasNotas.length} notas.`);
  };

  if (alumnoSeleccionado) {
    const al = data.alumnos.find(a => a.id === alumnoSeleccionado);
    return (
      <div>
        <Breadcrumb items={[
          { label: "Materias", onClick: onBack },
          { label: materia?.nombre, onClick: () => setAlumnoSeleccionado(null) },
          { label: `${al?.nombre} ${al?.apellido}` },
        ]} />
        <AlumnoDetalle data={data} setData={setData} alumnoId={alumnoSeleccionado} materiaId={materiaId} onBack={() => setAlumnoSeleccionado(null)} />
      </div> ); }
  return (
    <div>
      <Breadcrumb items={[{ label: "Materias", onClick: onBack }, { label: materia?.nombre }]} />
      {/* Cabecera materia */}
      <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, background: C.accentDim, border: `2px solid ${C.accent}44`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>📚</div>
          <div>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 20 }}>{materia?.nombre}</div>
            {materia?.descripcion && <div style={{ color: C.muted, fontSize: 13 }}>{materia.descripcion}</div>}
            <div style={{ color: C.dim, fontSize: 13, marginTop: 4 }}>{alumnosMateria.length} alumnos inscriptos</div>
          </div></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Btn v="ghost" onClick={() => setPopMasiva(true)}>📋 Carga masiva</Btn>
          <Btn onClick={() => { setBusqueda(""); setPopAgregarAlumno(true); }}>+ Agregar Alumno</Btn>
        </div>
      </div>
      {alumnosMateria.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 50 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>👤</div>
          <h3 style={{ color: C.text, fontWeight: 700, margin: "0 0 10px" }}>No hay alumnos en esta materia</h3>
          <p style={{ color: C.dim, fontSize: 14, marginBottom: 24 }}>Agregá alumnos del colegio para empezar a registrar notas y actividades.</p>
          <Btn onClick={() => { setBusqueda(""); setPopAgregarAlumno(true); }}>+ Agregar Alumno</Btn>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {alumnosMateria.map(al => {
            const notas = data.notas.filter(n => n.alumnoId === al.id && n.materiaId === materiaId);
            const acts = data.actividades.filter(a => a.alumnoId === al.id && a.materiaId === materiaId);
            const vals = notas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v)); const prom = avg(vals);
            return (
              <Box key={al.id} hi style={{ cursor: "pointer", position: "relative", paddingBottom: 56 }} onClick={() => setAlumnoSeleccionado(al.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>{al.apellido}, {al.nombre}</div>
                    {al.curso && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Curso: {al.curso}</div>} {al.dni && <div style={{ color: C.muted, fontSize: 12 }}>DNI: {al.dni}</div>} </div> <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 30, fontWeight: 900, color: nc(prom) }}>{prom ?? "—"}</div> <div style={{ fontSize: 11, color: C.muted }}>promedio</div> </div> </div> <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: C.dim }}>📝 {notas.length} notas</span>
                  <span style={{ fontSize: 12, color: C.dim }}>⚡ {acts.length} actividades</span> </div> {/* mini barra de notas */} {notas.length > 0 && ( <div style={{ display: "flex", gap: 3 }}>
                    {notas.slice(-6).map(n => (
                      <div key={n.id} title={`${n.tipo}: ${n.nota}`} style={{ flex: 1, height: 6, borderRadius: 3, background: nc(n.nota), opacity: 0.7 }} />
                    ))}
                  </div> )}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: C.accentL, fontSize: 12, fontWeight: 700 }}>Ver detalle →</span>
                  <button onClick={e => { e.stopPropagation(); quitarAlumno(al.id); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, padding: "2px 6px", borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.color = C.red} onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                    Quitar
                  </button></div>
              </Box> );
          })}
        </div> )}
      {/* Pop carga masiva */}
      {popMasiva && (() => {
        const MasivaModal = () => {
        const [tabMasiva, setTabMasiva] = useState("notas");
        const [tipoAct, setTipoAct] = useState({});
        const [descAct, setDescAct] = useState("");
        const [fechaAct, setFechaAct] = useState(new Date().toISOString().slice(0,10));
        const [horaAct, setHoraAct] = useState("");
        const saveActividades = async () => {
          if (!descAct.trim()) { alert("Ingresá una descripción."); return; }
          const nuevas = alumnosMateria.map(al => ({ id: uid(), alumnoId: al.id, materiaId, tipo: tipoAct[al.id]||"positiva", descripcion: descAct, fecha: fechaAct, hora: horaAct }));
          setData(d => ({ ...d, actividades: [...d.actividades, ...nuevas] }));
          let errCount = 0;
          for (const act of nuevas) {
            const { error } = await supabase.from("actividades").upsert({
              id: act.id, alumno_id: act.alumnoId, materia_id: act.materiaId,
              tipo: act.tipo, descripcion: act.descripcion, fecha: act.fecha,
            }, { onConflict: "id" });
            if (error) {
              // retry con hora
              const { error: e2 } = await supabase.from("actividades").upsert({
                id: act.id, alumno_id: act.alumnoId, materia_id: act.materiaId,
                tipo: act.tipo, descripcion: act.descripcion, fecha: act.fecha, hora: act.hora,
              }, { onConflict: "id" });
              if (e2) { console.error("saveActividades error:", e2); errCount++; }
            }
          }
          setPopMasiva(false); setDescAct(""); setHoraAct("");
          if (errCount > 0) alert(`⚠️ Se guardaron ${nuevas.length - errCount}/${nuevas.length} actividades. ${errCount} fallaron.`);
          else alert(`✅ Se registraron ${nuevas.length} actividades.`);
        };
        return (
        <Pop title={`📋 Carga masiva — ${materia?.nombre}`} onClose={() => { setPopMasiva(false); setNotasMasivas({}); }} wide>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {[{id:"notas",label:"📝 Notas"},{id:"actividades",label:"⚡ Actividades"}].map(t => (
              <button key={t.id} onClick={() => setTabMasiva(t.id)} style={{ padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: tabMasiva===t.id ? C.accent : C.bg, color: tabMasiva===t.id ? "#fff" : C.dim, transition: "all .15s" }}>{t.label}</button>
            ))}
          </div>
          {tabMasiva === "notas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Sel label="Tipo de evaluación" value={tipoMasivo} onChange={e => setTipoMasivo(e.target.value)}>
                <option value="parcial">Parcial</option>
                <option value="final">Final</option>
                <option value="trabajo">Trabajo práctico</option>
                <option value="oral">Oral</option>
                <option value="recuperatorio">Recuperatorio</option>
                <option value="otro">Otro</option>
              </Sel>
              <Inp label="Fecha" type="date" value={fechaMasiva} onChange={e => setFechaMasiva(e.target.value)} />
            </div>
            <Inp label="Descripción (opcional)" value={descMasiva} onChange={e => setDescMasiva(e.target.value)} placeholder="Ej: Primer parcial unidades 1-3" />
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 12 }}>Notas por alumno (0-10)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                {alumnosMateria.map(al => (
                  <div key={al.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                    <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{al.apellido}, {al.nombre}
                      {al.curso && <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>{al.curso}</span>}
                    </div>
                    <input type="number" min="0" max="10" step="0.1" placeholder="—"
                      value={notasMasivas[al.id] || ""}
                      onChange={e => setNotasMasivas(n => ({ ...n, [al.id]: e.target.value }))}
                      style={{ width: 70, background: "#07101e", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 15, fontWeight: 700, textAlign: "center", outline: "none" }}
                      onFocus={e => e.target.style.borderColor = C.accent}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn v="ghost" onClick={() => { setPopMasiva(false); setNotasMasivas({}); }}>Cancelar</Btn>
              <Btn onClick={saveMasiva}>💾 Guardar todas las notas</Btn>
            </div>
          </div>
          )}
          {tabMasiva === "actividades" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Inp label="Fecha" type="date" value={fechaAct} onChange={e => setFechaAct(e.target.value)} />
              <Inp label="Hora (opcional)" type="time" value={horaAct} onChange={e => setHoraAct(e.target.value)} />
            </div>
            <Inp label="Descripción *" value={descAct} onChange={e => setDescAct(e.target.value)} placeholder="Ej: Participó activamente en clase" />
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 12 }}>Tipo por alumno</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                {alumnosMateria.map(al => (
                  <div key={al.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1, color: C.text, fontWeight: 600, fontSize: 14 }}>{al.apellido}, {al.nombre}
                      {al.curso && <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>{al.curso}</span>}
                    </div>
                    <select value={tipoAct[al.id]||"positiva"} onChange={e => setTipoAct(t => ({...t, [al.id]: e.target.value}))}
                      style={{ background: "#07101e", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none", cursor: "pointer" }}>
                      <option value="positiva">✅ Positiva</option>
                      <option value="negativa">❌ Negativa</option>
                      <option value="participacion">🙋 Participación</option>
                      <option value="tarea">📚 Tarea</option>
                      <option value="comportamiento">⚠️ Comportamiento</option>
                      <option value="otro">📌 Otro</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn v="ghost" onClick={() => { setPopMasiva(false); }}>Cancelar</Btn>
              <Btn onClick={saveActividades}>⚡ Registrar para todos</Btn>
            </div>
          </div>
          )}
        </Pop>
        );
        }; return <MasivaModal />;
      })()}
      {/* Pop agregar alumno */}
      {popAgregarAlumno && (
        <Pop title={creandoNuevo ? `➕ Nuevo alumno en ${materia?.nombre}` : `Agregar alumno a ${materia?.nombre}`} onClose={() => { setPopAgregarAlumno(false); setCreandoNuevo(false); setBusqueda(""); setFormNuevo(emptyForm); }} wide>
          {!creandoNuevo ? (
            <>
              {/* Buscador */}
              <Inp
                placeholder="🔍 Buscar alumno por nombre, apellido o DNI..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ marginBottom: 14 }} />  {/* Lista de disponibles */} {disponibles.length > 0 ? ( <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto", marginBottom: 14 }}>
                  {disponibles.map(al => (
                    <div key={al.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
                      <div>
                        <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>{al.apellido}, {al.nombre}</div> <div style={{ color: C.muted, fontSize: 12 }}>
                          {al.curso ? `Curso: ${al.curso}` : ""}
                          {al.curso && al.dni ? " · " : ""}
                          {al.dni ? `DNI: ${al.dni}` : ""}</div></div>
                      <Btn v="success" sm onClick={() => agregarAlumno(al.id)}>+ Agregar</Btn>
                    </div>
                  ))}</div>
              ) : (
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px 18px", marginBottom: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div> <div style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                    {busqueda
                      ? `No se encontró "${busqueda}" en el colegio`
                      : "Todos los alumnos del colegio ya están en esta materia"}</div>
                  <div style={{ color: C.muted, fontSize: 13 }}>
                    {busqueda ? "¿Querés crear este alumno nuevo?" : "Podés crear un alumno nuevo si lo necesitás."}
                  </div>
                </div> )}
              {/* Separador + botón crear nuevo */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.muted, fontSize: 13 }}>¿No está en la lista?</span>
                <Btn onClick={() => {
                  setFormNuevo({ ...emptyForm, nombre: busqueda.split(" ")[0] || "", apellido: busqueda.split(" ").slice(1).join(" ") || "" });
                  setCreandoNuevo(true);
                }}>
                  👤 Crear alumno nuevo
                </Btn></div>
            </>
          ) : (
            /* Formulario crear alumno nuevo */
            <>
              <div style={{ background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: C.accentL }}>
                El alumno será creado y agregado automáticamente a <strong>{materia?.nombre}</strong>.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}> <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
                  <Inp label="Nombre *" value={formNuevo.nombre} onChange={e => setFormNuevo(f => ({ ...f, nombre: e.target.value }))} placeholder="Juan" />
                  <Inp label="Apellido *" value={formNuevo.apellido} onChange={e => setFormNuevo(f => ({ ...f, apellido: e.target.value }))} placeholder="García" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
                  <Inp label="DNI" value={formNuevo.dni} onChange={e => setFormNuevo(f => ({ ...f, dni: e.target.value }))} placeholder="40123456" />
                  <Sel label="Curso / Grado" value={formNuevo.curso} onChange={e => setFormNuevo(f => ({ ...f, curso: e.target.value }))}>
                    <option value="">-- Seleccionar --</option>
                    <optgroup label="1° Año">
                      <option value="1° Año - División 1">1° Año - División 1</option>
                      <option value="1° Año - División 2">1° Año - División 2</option>
                      <option value="1° Año - División 3">1° Año - División 3</option>
                    </optgroup>
                    <optgroup label="2° y 3° Año">
                      <option value="2° y 3° Año - División 1">2° y 3° Año - División 1</option>
                      <option value="2° y 3° Año - División 2">2° y 3° Año - División 2</option>
                      <option value="2° y 3° Año - División 3">2° y 3° Año - División 3</option>
                    </optgroup>
                    <optgroup label="4° y 5° Año">
                      <option value="4° y 5° Año - División 1">4° y 5° Año - División 1</option>
                      <option value="4° y 5° Año - División 2">4° y 5° Año - División 2</option>
                      <option value="4° y 5° Año - División 3">4° y 5° Año - División 3</option>
                    </optgroup>
                  </Sel>
                </div>
                <Inp label="Email" value={formNuevo.email} onChange={e => setFormNuevo(f => ({ ...f, email: e.target.value }))} placeholder="juan@email.com" />
                <Inp label="Teléfono" value={formNuevo.telefono} onChange={e => setFormNuevo(f => ({ ...f, telefono: e.target.value }))} placeholder="011-1234-5678" />
                <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 4 }}>
                  <Btn v="ghost" onClick={() => { setCreandoNuevo(false); setFormNuevo(emptyForm); }}>← Volver a la búsqueda</Btn>
                  <Btn onClick={crearYAgregarAlumno}>✅ Crear y agregar a la materia</Btn></div>
              </div>
            </> )}
        </Pop> )}
    </div> ); };
const Materias = ({ data, setData, colegioId }) => {
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null); const [pop, setPop] = useState(false); const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [editId, setEditId] = useState(null);
  const materias = data.materias.filter(m => m.colegioId === colegioId)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  if (materiaSeleccionada) {
    return <MateriaDetalle data={data} setData={setData} materiaId={materiaSeleccionada} colegioId={colegioId} onBack={() => setMateriaSeleccionada(null)} />;
  }
  const save = async () => {
    if (!form.nombre.trim()) return;
    if (editId) {
      const updated = { ...data.materias.find(m => m.id === editId), ...form };
      setData(d => ({ ...d, materias: d.materias.map(m => m.id === editId ? updated : m) }));
      await upsertRow("materias", updated);
    } else {
      const nueva = { id: uid(), colegioId, createdAt: new Date().toISOString(), ...form };
      setData(d => ({ ...d, materias: [...d.materias, nueva] }));
      const { error } = await supabase.from("materias").upsert({ id: nueva.id, colegio_id: colegioId, nombre: nueva.nombre, descripcion: nueva.descripcion || "" }, { onConflict: "id" });
      if (error) {
        console.error("Error guardando materia:", error);
        alert("Error al guardar la materia: " + error.message);
        setData(d => ({ ...d, materias: d.materias.filter(m => m.id !== nueva.id) }));
        return;
      }
    }
    setPop(false); setEditId(null); setForm({ nombre: "", descripcion: "" }); };
  const del = async (id) => {
    if (!confirm("¿Eliminar materia?")) return;
    setData(d => ({ ...d, materias: d.materias.filter(m => m.id !== id) }));
    await deleteRow("materias", id); };

  const edit = (m) => { setForm({ nombre: m.nombre, descripcion: m.descripcion || "" }); setEditId(m.id); setPop(true); };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ color: C.text, margin: 0, fontSize: 22, fontWeight: 800 }}>📚 Materias</h2>
        <Btn onClick={() => { setForm({ nombre: "", descripcion: "" }); setEditId(null); setPop(true); }}>+ Nueva Materia</Btn>
      </div>
      {materias.length === 0 ? (
        <Empty icon="📚" msg="No hay materias en este colegio. Creá la primera para empezar." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 14 }}>
          {materias.map(m => {
            const inscriptos = (data.inscripciones || []).filter(i => i.materiaId === m.id).length;
            const notas = data.notas.filter(n => n.materiaId === m.id);
            const vals = notas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v)); const prom = avg(vals);
            return (
              <Box key={m.id} hi style={{ cursor: "pointer", position: "relative", paddingBottom: 54 }} onClick={() => setMateriaSeleccionada(m.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}> <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 42, height: 42, background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📚</div>
                    <div>
                      <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>{m.nombre}</div>
                      {m.descripcion && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{m.descripcion}</div>} </div> </div> <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: nc(prom) }}>{prom ?? "—"}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>promedio</div> </div> </div> <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.dim }}>
                  <span>👥 {inscriptos} alumnos</span>
                  <span>📝 {notas.length} notas</span></div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 14px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: C.accentL, fontSize: 12, fontWeight: 700 }}>Abrir materia →</span>
                  <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                    <Btn v="ghost" sm onClick={() => edit(m)}>✏️</Btn>
                    <Btn v="danger" sm onClick={() => del(m.id)}>🗑️</Btn></div></div>
              </Box> );
          })}
        </div> )}
      {pop && (
        <Pop title={editId ? "Editar Materia" : "Nueva Materia"} onClose={() => { setPop(false); setEditId(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Inp label="Nombre *" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Economía y Administración" />
            <Inp label="Descripción (opcional)" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción breve..." />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn v="ghost" onClick={() => { setPop(false); setEditId(null); }}>Cancelar</Btn>
              <Btn onClick={save}>💾 Guardar</Btn></div></div>
        </Pop> )}
    </div> ); };
const imprimirBoletin = (data, alumnoId, colegioId) => {
  const alumno = data.alumnos.find(a => a.id === alumnoId);
  const colegio = data.colegios.find(c => c.id === colegioId);
  const materiaIds = [...new Set((data.inscripciones||[]).filter(i => i.alumnoId === alumnoId).map(i => i.materiaId))];
  const todasNotas = data.notas.filter(n => n.alumnoId === alumnoId);
  const vals = todasNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v));
  const promGeneral = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : "—";
  const nc2 = (n) => { if (!n || n==="—") return "#666"; const v=parseFloat(n); return v>=7?"#16a34a":v>=5?"#d97706":"#dc2626"; };
  
  const materiasHTML = materiaIds.map(mid => {
    const mat = data.materias.find(m => m.id === mid);
    const mNotas = todasNotas.filter(n => n.materiaId === mid);
    const mVals = mNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v));
    const mProm = mVals.length ? (mVals.reduce((a,b)=>a+b,0)/mVals.length).toFixed(1) : "—";
    const asistencias = (data.asistencias||[]).filter(a => a.alumnoId===alumnoId && a.materiaId===mid);
    const presentes = asistencias.filter(a=>a.estado==="presente").length;
    const pctAsist = asistencias.length ? Math.round((presentes/asistencias.length)*100) : null;
    return `
      <div style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="background:#f3f4f6;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:15px;">${mat?.nombre||"—"}</strong>
          <span style="font-size:20px;font-weight:900;color:${nc2(mProm)}">${mProm}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;">Tipo</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;">Descripción</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;">Fecha</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb;">Nota</th>
          </tr></thead>
          <tbody>${mNotas.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(n=>`
            <tr><td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;">${n.tipo}</td>
            <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;">${n.descripcion||"—"}</td>
            <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;">${n.fecha||"—"}</td>
            <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;text-align:center;font-weight:700;color:${nc2(n.nota)}">${n.nota}</td></tr>
          `).join("")}</tbody>
        </table>
        ${pctAsist!==null?`<div style="padding:8px 16px;font-size:12px;color:#6b7280;">Asistencia: <strong>${pctAsist}%</strong> (${presentes}/${asistencias.length} clases)</div>`:""}
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Boletín — ${alumno?.apellido}, ${alumno?.nombre}</title>
  <style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#111;}@media print{body{padding:0;}}</style>
  </head><body>
  <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #111;">
    <h2 style="margin:0 0 4px;font-size:20px;">${colegio?.nombre||""}</h2>
    ${colegio?.direccion?`<div style="font-size:13px;color:#666;">${colegio.direccion}</div>`:""}
    <h1 style="margin:16px 0 4px;font-size:24px;">BOLETÍN DE CALIFICACIONES</h1>
    <div style="font-size:14px;color:#666;">Emitido el ${new Date().toLocaleDateString("es-AR")}</div>
  </div>
  <div style="display:flex;justify-content:space-between;margin-bottom:20px;padding:12px 16px;background:#f9fafb;border-radius:8px;">
    <div><strong>Alumno:</strong> ${alumno?.apellido}, ${alumno?.nombre}</div>
    ${alumno?.curso?`<div><strong>Curso:</strong> ${alumno.curso}</div>`:""}
    ${alumno?.dni?`<div><strong>DNI:</strong> ${alumno.dni}</div>`:""}
    <div><strong>Promedio general:</strong> <span style="color:${nc2(promGeneral)};font-weight:700;">${promGeneral}</span></div>
  </div>
  ${materiasHTML}
  <div style="margin-top:40px;display:flex;justify-content:space-around;">
    <div style="text-align:center;"><div style="border-top:1px solid #111;width:180px;padding-top:6px;font-size:12px;">Firma del docente</div></div>
    <div style="text-align:center;"><div style="border-top:1px solid #111;width:180px;padding-top:6px;font-size:12px;">Firma del directivo</div></div>
  </div>
  </body></html>`;

  const w = window.open("","_blank"); w.document.write(html); w.document.close(); w.print();
};


const AlumnoPerfilGlobal = ({ data, setData, alumnoId, colegioId, onBack }) => {
  const alumno = data.alumnos.find(a => a.id === alumnoId);
  const materiaIds = [...new Set((data.inscripciones || []).filter(i => i.alumnoId === alumnoId).map(i => i.materiaId))];
  const [materiaActiva, setMateriaActiva] = useState(materiaIds[0] || null);
  const todasNotas = data.notas.filter(n => n.alumnoId === alumnoId);
  const todasActs = data.actividades.filter(a => a.alumnoId === alumnoId);
  const vals = todasNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v)); const promGeneral = avg(vals);
  return (
    <div>
      <Breadcrumb items={[{ label: "Alumnos", onClick: onBack }, { label: `${alumno?.apellido}, ${alumno?.nombre}` }]} />
      {/* Header alumno */}
      <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}> <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, background: C.accentDim, border: `2px solid ${C.accent}44`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>👤</div>
            <div>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 20 }}>{alumno?.apellido}, {alumno?.nombre}</div> <div style={{ color: C.muted, fontSize: 13, marginTop: 3, display: "flex", gap: 14, flexWrap: "wrap" }}>
                {alumno?.curso && <span>📋 Curso: {alumno.curso}</span>}
                {alumno?.dni && <span>🪪 DNI: {alumno.dni}</span>}
                {alumno?.email && <span>✉️ {alumno.email}</span>}
                {alumno?.telefono && <span>📞 {alumno.telefono}</span>}</div></div></div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
          <div style={{ display: "flex", gap: 20, textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 900, color: nc(promGeneral) }}>{promGeneral ?? "—"}</div>
              <div style={{ fontSize: 11, color: C.muted }}>Prom. general</div></div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.dim }}>{todasNotas.length}</div>
              <div style={{ fontSize: 11, color: C.muted }}>Notas</div></div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.dim }}>{todasActs.length}</div>
              <div style={{ fontSize: 11, color: C.muted }}>Actividades</div></div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.blue }}>{materiaIds.length}</div>
              <div style={{ fontSize: 11, color: C.muted }}>Materias</div> </div> </div>
          <Btn v="ghost" sm onClick={() => imprimirBoletin(data, alumnoId, colegioId)}>🖨️ Imprimir Boletín</Btn>
        </div> </div> </div>  {materiaIds.length === 0 ? ( <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📚</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Este alumno no está inscripto en ninguna materia</div>
          <div style={{ color: C.dim, fontSize: 14 }}>Inscribilo desde la sección <strong style={{ color: C.accentL }}>Materias</strong> para empezar a registrar notas y actividades.</div>
        </div>
      ) : (
        <>
          {/* Selector de materia */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 10 }}>Seleccioná una materia</div> <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {materiaIds.map(mid => {
                const mat = data.materias.find(m => m.id === mid);
                const mNotas = data.notas.filter(n => n.alumnoId === alumnoId && n.materiaId === mid);
                const mVals = mNotas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v));
                const mProm = avg(mVals); const isActive = materiaActiva === mid;
                return (
                  <button key={mid} onClick={() => setMateriaActiva(mid)} style={{
                    background: isActive ? C.accent : C.card2,
                    border: `1px solid ${isActive ? C.accent : C.border}`,
                    borderRadius: 12, padding: "10px 16px", cursor: "pointer",
                    transition: "all .15s", display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? "#fff" : C.text }}>{mat?.nombre || "—"}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: isActive ? "#fff" : nc(mProm) }}>{mProm ?? "—"}</span>
                    {mNotas.length > 0 && (
                      <span style={{ fontSize: 11, color: isActive ? "#ffffff99" : C.muted }}>{mNotas.length} notas</span>
                    )}
                  </button> );
              })}</div></div>
          {/* Detalle de la materia seleccionada */}
          {materiaActiva && (
            <AlumnoDetalle
              data={data}
              setData={setData}
              alumnoId={alumnoId}
              materiaId={materiaActiva}
              onBack={onBack} /> )}
        </> )}
    </div> ); };
const Alumnos = ({ data, setData, colegioId }) => {
  const [pop, setPop] = useState(false); const [form, setForm] = useState({ nombre: "", apellido: "", dni: "", fechaNac: "", curso: "", email: "", telefono: "" }); const [editId, setEditId] = useState(null);
  const [filtro, setFiltro] = useState(""); const [alumnoViendo, setAlumnoViendo] = useState(null);
  const alumnos = data.alumnos.filter(a => a.colegioId === colegioId);
  const cursos = [...new Set(alumnos.map(a => a.curso).filter(Boolean))].sort();
  const [filtroCurso, setFiltroCurso] = useState("");
  const save = async () => {
    if (!form.nombre.trim() || !form.apellido.trim()) return;
    if (editId) {
      const updated = { ...data.alumnos.find(a => a.id === editId), ...form };
      setData(d => ({ ...d, alumnos: d.alumnos.map(a => a.id === editId ? updated : a) }));
      await upsertRow("alumnos", updated);
    } else {
      const nuevo = { id: uid(), colegioId, createdAt: new Date().toISOString(), ...form };
      setData(d => ({ ...d, alumnos: [...d.alumnos, nuevo] }));
      const { error } = await supabase.from("alumnos").upsert({
        id: nuevo.id, colegio_id: colegioId,
        nombre: nuevo.nombre, apellido: nuevo.apellido,
        dni: nuevo.dni || null, fecha_nac: nuevo.fechaNac || null,
        curso: nuevo.curso || null, email: nuevo.email || null, telefono: nuevo.telefono || null
      }, { onConflict: "id" });
      if (error) {
        console.error("Error guardando alumno:", error);
        alert("Error al guardar el alumno: " + error.message);
        setData(d => ({ ...d, alumnos: d.alumnos.filter(a => a.id !== nuevo.id) }));
        return;
      }
    }
    setPop(false); setEditId(null);
    setForm({ nombre: "", apellido: "", dni: "", fechaNac: "", curso: "", email: "", telefono: "" }); };
  const del = async (id) => {
    if (!confirm("¿Eliminar alumno?")) return;
    setData(d => ({ ...d, alumnos: d.alumnos.filter(a => a.id !== id) }));
    await deleteRow("alumnos", id); };

  const edit = (a) => {
    setForm({ nombre: a.nombre, apellido: a.apellido, dni: a.dni || "", fechaNac: a.fechaNac || "", curso: a.curso || "", email: a.email || "", telefono: a.telefono || "" });
    setEditId(a.id); setPop(true); };
  const filtered = alumnos.filter(a => `${a.nombre} ${a.apellido} ${a.dni || ""}`.toLowerCase().includes(filtro.toLowerCase()) && (!filtroCurso || a.curso === filtroCurso));
  if (alumnoViendo) {
    return <AlumnoPerfilGlobal data={data} setData={setData} alumnoId={alumnoViendo} colegioId={colegioId} onBack={() => setAlumnoViendo(null)} />;
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: C.text, margin: 0, fontSize: 22, fontWeight: 800 }}>👤 Alumnos del Colegio</h2>
        <Btn onClick={() => { setEditId(null); setForm({ nombre: "", apellido: "", dni: "", fechaNac: "", curso: "", email: "", telefono: "" }); setPop(true); }}>+ Nuevo Alumno</Btn>
      </div>
      <Inp placeholder="🔍 Buscar por nombre, apellido o DNI..." value={filtro} onChange={e => setFiltro(e.target.value)} style={{ marginBottom: 12 }} />
      {cursos.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <button onClick={() => setFiltroCurso("")} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${!filtroCurso ? C.accent : C.border}`, background: !filtroCurso ? C.accentDim : "transparent", color: !filtroCurso ? C.accentL : C.dim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Todos</button>
          {cursos.map(c => (
            <button key={c} onClick={() => setFiltroCurso(c)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filtroCurso === c ? C.accent : C.border}`, background: filtroCurso === c ? C.accentDim : "transparent", color: filtroCurso === c ? C.accentL : C.dim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c}</button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? <Empty icon="👤" msg="No hay alumnos en este colegio." /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map(al => {
            const materiaIds = [...new Set((data.inscripciones || []).filter(i => i.alumnoId === al.id).map(i => i.materiaId))];
            const notas = data.notas.filter(n => n.alumnoId === al.id);
            const vals = notas.map(n => parseFloat(n.nota)).filter(v => !isNaN(v)); const prom = avg(vals);
            return (
              <Box key={al.id} hi style={{ cursor: "pointer", position: "relative", paddingBottom: 54, borderColor: prom !== null && parseFloat(prom) < 6 ? C.red + "66" : undefined }}
                onClick={() => setAlumnoViendo(al.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{al.apellido}, {al.nombre}</div>
                      {prom !== null && parseFloat(prom) < 6 && <span style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>⚠️ Bajo</span>}
                    </div>
                    {al.dni && <div style={{ color: C.muted, fontSize: 12 }}>DNI: {al.dni}</div>} {al.curso && <div style={{ color: C.dim, fontSize: 12 }}>Curso: {al.curso}</div>} </div> <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: nc(prom) }}>{prom ?? "—"}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{notas.length} notas</div> </div> </div> {materiaIds.length > 0 && ( <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {materiaIds.slice(0, 3).map(mid => {
                      const mat = data.materias.find(m => m.id === mid);
                      return mat ? <Tag key={mid} color={C.accentL}>{mat.nombre}</Tag> : null;
                    })}
                    {materiaIds.length > 3 && <Tag color={C.dim}>+{materiaIds.length - 3} más</Tag>}
                  </div> )}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 14px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: C.accentL, fontSize: 12, fontWeight: 700 }}>Ver notas y actividades →</span>
                  <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                    <Btn v="ghost" sm onClick={() => edit(al)}>✏️</Btn>
                    <Btn v="danger" sm onClick={() => del(al.id)}>🗑️</Btn></div></div>
              </Box> );
          })}
        </div> )}
      {pop && (
        <Pop title={editId ? "Editar Alumno" : "Nuevo Alumno"} onClose={() => { setPop(false); setEditId(null); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}> <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
              <Inp label="Nombre *" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Juan" />
              <Inp label="Apellido *" value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} placeholder="García" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
              <Inp label="DNI" value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} placeholder="40123456" />
              <Inp label="Fecha de nacimiento" type="date" value={form.fechaNac} onChange={e => setForm(f => ({ ...f, fechaNac: e.target.value }))} />
            </div>
            <Sel label="Curso / Grado" value={form.curso} onChange={e => setForm(f => ({ ...f, curso: e.target.value }))}>
              <option value="">-- Seleccionar --</option>
              <optgroup label="1° Año">
                <option value="1° Año - División 1">1° Año - División 1</option>
                <option value="1° Año - División 2">1° Año - División 2</option>
                <option value="1° Año - División 3">1° Año - División 3</option>
              </optgroup>
              <optgroup label="2° y 3° Año">
                <option value="2° y 3° Año - División 1">2° y 3° Año - División 1</option>
                <option value="2° y 3° Año - División 2">2° y 3° Año - División 2</option>
                <option value="2° y 3° Año - División 3">2° y 3° Año - División 3</option>
              </optgroup>
              <optgroup label="4° y 5° Año">
                <option value="4° y 5° Año - División 1">4° y 5° Año - División 1</option>
                <option value="4° y 5° Año - División 2">4° y 5° Año - División 2</option>
                <option value="4° y 5° Año - División 3">4° y 5° Año - División 3</option>
              </optgroup>
            </Sel>
            <Inp label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@email.com" />
            <Inp label="Teléfono" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="011-1234-5678" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn v="ghost" onClick={() => { setPop(false); setEditId(null); }}>Cancelar</Btn>
              <Btn onClick={save}>💾 Guardar</Btn></div></div>
        </Pop> )}
    </div> ); };
const TIPOS_INASIST = [
  { id: "enfermedad",    label: "Enfermedad",           icon: "🤒", color: "#f87171" },
  { id: "particular",   label: "Razones particulares",  icon: "👤", color: "#60a5fa" },
  { id: "duelo",        label: "Duelo",                 icon: "🖤", color: "#8892a4" },
  { id: "maternidad",   label: "Maternidad/Paternidad", icon: "👶", color: "#2dd4bf" },
  { id: "capacitacion", label: "Capacitacion",          icon: "📖", color: "#9b95ff" },
  { id: "otro",         label: "Otro",                  icon: "📋", color: "#fbbf24" }, ];
const ESTADOS_INASIST = [
  { id: "pendiente", label: "Pendiente", color: "#fbbf24" },
  { id: "aprobado",  label: "Aprobado",  color: "#2dd4bf" },
  { id: "rechazado", label: "Rechazado", color: "#f87171" }, ];
const fmtMes = (ym) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return meses[parseInt(m)-1] + " " + y; };
const Eventos = ({ data, setData, colegioId }) => {
  const [seccion, setSeccion] = useState("plenaria"); const [pop, setPop] = useState(false); const [popInasist, setPopInasist] = useState(false);
  const [editId, setEditId] = useState(null); const [editInasistId, setEditInasistId] = useState(null); const [verId, setVerId] = useState(null);
  const [mesFiltro, setMesFiltro] = useState(null);
  const emptyForm = { titulo: "", fecha: new Date().toISOString().slice(0,10), hora: "", participantes: "", descripcion: "", tipo: "plenaria" };

  const [form, setForm] = useState(emptyForm);
  const emptyInasist = { persona: "", fecha: new Date().toISOString().slice(0,10), tipoInasist: "enfermedad", descripcion: "", estado: "pendiente" };

  const [formInasist, setFormInasist] = useState(emptyInasist);
  const eventos       = (data.eventos      || []).filter(e => e.colegioId === colegioId);
  const inasistencias = (data.inasistencias || []).filter(i => i.colegioId === colegioId);
  const filtrados     = eventos.filter(e => e.tipo === seccion).sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
  const mesesDisp  = [...new Set(inasistencias.map(i => i.fecha && i.fecha.slice(0,7)).filter(Boolean))].sort().reverse();
  const mesActivo  = mesFiltro || mesesDisp[0] || null;
  const inasistMes = mesActivo ? inasistencias.filter(i => i.fecha && i.fecha.startsWith(mesActivo)) : inasistencias;
  const tColor = { plenaria: C.blue, varia: C.yellow }; const tIcon  = { plenaria: "🏛️", varia: "🗣️" };

  const tLabel = { plenaria: "Reunion Plenaria", varia: "Reunion Varia" };

  const openAdd  = () => { setForm({...emptyForm, tipo: seccion}); setEditId(null); setPop(true); };

  const openEdit = ev => { setForm({titulo:ev.titulo,fecha:ev.fecha,hora:ev.hora||"",participantes:ev.participantes||"",descripcion:ev.descripcion||"",tipo:ev.tipo}); setEditId(ev.id); setPop(true); };

  const save = async () => {
    if (!form.titulo.trim()) return;
    if (editId) {
      const updated = { ...(data.eventos||[]).find(e => e.id===editId), ...form };
      setData(d => ({...d, eventos: (d.eventos||[]).map(e => e.id===editId ? updated : e)}));
      await upsertRow("eventos", updated);
    } else {
      const nuevo = { id: uid(), colegioId, ...form };
      setData(d => ({...d, eventos: [...(d.eventos||[]), nuevo]}));
      await upsertRow("eventos", nuevo);
    }
    setPop(false); setEditId(null); setForm(emptyForm); };
  const del = async id => {
    if (!confirm("Eliminar evento?")) return;
    setData(d => ({...d, eventos: (d.eventos||[]).filter(e => e.id!==id)}));
    await deleteRow("eventos", id);
    if (verId===id) setVerId(null); };
  const saveInasist = async () => {
    if (!formInasist.persona.trim()) return;
    if (editInasistId) {
      const updated = { ...(data.inasistencias||[]).find(i => i.id===editInasistId), ...formInasist };
      setData(d => ({...d, inasistencias: (d.inasistencias||[]).map(i => i.id===editInasistId ? updated : i)}));
      await upsertRow("inasistencias", updated);
    } else {
      const nuevo = { id: uid(), colegioId, ...formInasist };
      setData(d => ({...d, inasistencias: [...(d.inasistencias||[]), nuevo]}));
      await upsertRow("inasistencias", nuevo);
    }
    setPopInasist(false); setEditInasistId(null); setFormInasist(emptyInasist); };
  const delInasist = async id => {
    if (!confirm("Eliminar pedido?")) return;
    setData(d => ({...d, inasistencias: (d.inasistencias||[]).filter(i => i.id!==id)}));
    await deleteRow("inasistencias", id); };

  const editInasistFn = i  => { setFormInasist({persona:i.persona,fecha:i.fecha,tipoInasist:i.tipoInasist,descripcion:i.descripcion||"",estado:i.estado||"pendiente"}); setEditInasistId(i.id); setPopInasist(true); };

  const ev = verId ? eventos.find(e => e.id===verId) : null;
  if (ev) return (
    <div>
      <Breadcrumb items={[{label:"Eventos del Colegio",onClick:()=>setVerId(null)},{label:tLabel[ev.tipo]},{label:ev.titulo}]} />
      <Box style={{maxWidth:760}}> <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,paddingBottom:18,borderBottom:"1px solid "+C.border}}>
          <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
            <div style={{width:52,height:52,borderRadius:14,background:tColor[ev.tipo]+"18",border:"2px solid "+tColor[ev.tipo]+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{tIcon[ev.tipo]}</div>
            <div>
              <Tag color={tColor[ev.tipo]}>{tLabel[ev.tipo]}</Tag>
              <div style={{color:C.text,fontWeight:900,fontSize:20,marginTop:6}}>{ev.titulo}</div>
              <div style={{color:C.muted,fontSize:13,marginTop:4}}>📅 {fmt(ev.fecha)}{ev.hora?" · 🕐 "+ev.hora:""}</div> </div> </div> <div style={{display:"flex",gap:6}}>
            <Btn v="ghost" sm onClick={()=>{openEdit(ev);setVerId(null);}}>✏️ Editar</Btn>
            <Btn v="danger" sm onClick={()=>del(ev.id)}>🗑️</Btn></div></div>
        {ev.participantes && <div style={{marginBottom:20}}><div style={{fontSize:11,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:1.1,marginBottom:8}}>👥 Participantes</div><div style={{color:C.text,fontSize:14,lineHeight:1.7,background:C.card2,borderRadius:10,padding:"12px 16px"}}>{ev.participantes}</div></div>}
        <div>
          <div style={{fontSize:11,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:1.1,marginBottom:8}}>📝 Descripcion / Lo sucedido</div>
          {ev.descripcion ? <div style={{color:C.text,fontSize:14,lineHeight:1.8,background:C.card2,borderRadius:10,padding:"16px 18px",whiteSpace:"pre-wrap"}}>{ev.descripcion}</div> : <div style={{color:C.muted,fontSize:13,fontStyle:"italic"}}>Sin descripcion registrada.</div>}
        </div>
      </Box>
    </div> );
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <h2 style={{color:C.text,margin:0,fontSize:22,fontWeight:800}}>📅 Eventos del Colegio</h2>
        {seccion!=="inasistencias" ? <Btn onClick={openAdd}>+ Nuevo Evento</Btn> : <Btn onClick={()=>{setFormInasist(emptyInasist);setEditInasistId(null);setPopInasist(true);}}>+ Registrar Pedido</Btn>}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:26,flexWrap:"wrap"}}>
        {[
          {id:"plenaria",      label:"🏛️ Plenarias",           color:C.blue,    count:eventos.filter(e=>e.tipo==="plenaria").length},
          {id:"varia",         label:"🗣️ Varias",              color:C.yellow,  count:eventos.filter(e=>e.tipo==="varia").length},
          {id:"inasistencias", label:"📋 Pedidos Inasistencia",color:C.accentL, count:inasistencias.length},
        ].map(t => {
          const activo = seccion===t.id;
          return (
            <button key={t.id} onClick={()=>setSeccion(t.id)} style={{padding:"11px 20px",borderRadius:12,border:"2px solid "+(activo?t.color:C.border),background:activo?t.color+"18":"transparent",color:activo?t.color:C.dim,fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .18s",display:"flex",alignItems:"center",gap:8}}>
              {t.label}
              <span style={{background:activo?t.color+"30":C.border,color:activo?t.color:C.muted,borderRadius:20,padding:"1px 8px",fontSize:12,fontWeight:800}}>{t.count}</span>
            </button> );
        })}</div>
      {seccion==="inasistencias" && (
        <div>
          {inasistencias.length===0 ? (
            <div style={{textAlign:"center",paddingTop:60}}>
              <div style={{fontSize:52,marginBottom:14}}>📋</div>
              <h3 style={{color:C.text,fontWeight:700,margin:"0 0 10px"}}>No hay pedidos registrados</h3>
              <p style={{color:C.dim,fontSize:14,marginBottom:24}}>Registra los pedidos de inasistencia del personal.</p>
              <Btn onClick={()=>{setFormInasist(emptyInasist);setEditInasistId(null);setPopInasist(true);}}>+ Registrar Pedido</Btn>
            </div>
          ) : (
            <div>
              <div style={{marginBottom:26}}>
                <div style={{fontSize:11,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:1.1,marginBottom:12}}>Resumen por tipo de inasistencia — todos los meses</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(155px, 1fr))",gap:10}}>
                  {TIPOS_INASIST.map(t => {
                    const total=inasistencias.filter(i=>i.tipoInasist===t.id).length;
                    const aprobados=inasistencias.filter(i=>i.tipoInasist===t.id&&i.estado==="aprobado").length;
                    const pendientes=inasistencias.filter(i=>i.tipoInasist===t.id&&i.estado==="pendiente").length;
                    const rechazados=inasistencias.filter(i=>i.tipoInasist===t.id&&i.estado==="rechazado").length;
                    if (total===0) return null;
                    return (
                      <div key={t.id} style={{background:C.card,border:"1px solid "+t.color+"44",borderRadius:14,padding:"14px 16px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:22}}>{t.icon}</span><span style={{color:t.color,fontWeight:700,fontSize:12,lineHeight:1.3}}>{t.label}</span></div>
                        <div style={{fontSize:32,fontWeight:900,color:t.color,marginBottom:6}}>{total}</div> <div style={{display:"flex",flexDirection:"column",gap:2}}>
                          {aprobados>0  && <span style={{fontSize:11,color:"#2dd4bf"}}>✅ {aprobados} aprobado{aprobados!==1?"s":""}</span>}
                          {pendientes>0 && <span style={{fontSize:11,color:"#fbbf24"}}>⏳ {pendientes} pendiente{pendientes!==1?"s":""}</span>}
                          {rechazados>0 && <span style={{fontSize:11,color:"#f87171"}}>❌ {rechazados} rechazado{rechazados!==1?"s":""}</span>}
                        </div>
                      </div> );
                  })}</div></div>
              {mesesDisp.length>0 && (
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
                  <button onClick={()=>setMesFiltro(null)} style={{padding:"7px 14px",borderRadius:20,border:"1px solid "+(mesFiltro?C.border:C.accentL),background:mesFiltro?"transparent":C.accentDim,color:mesFiltro?C.dim:C.accentL,fontSize:12,fontWeight:700,cursor:"pointer"}}>Todos ({inasistencias.length})</button>
                  {mesesDisp.map(m => (
                    <button key={m} onClick={()=>setMesFiltro(m)} style={{padding:"7px 14px",borderRadius:20,border:"1px solid "+(mesFiltro===m?C.accentL:C.border),background:mesFiltro===m?C.accentDim:"transparent",color:mesFiltro===m?C.accentL:C.dim,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      {fmtMes(m)} ({inasistencias.filter(i=>i.fecha&&i.fecha.startsWith(m)).length})
                    </button>
                  ))}
                </div> )}
              <div style={{fontSize:11,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:1.1,marginBottom:12}}>{mesActivo?fmtMes(mesActivo):"Todos los meses"} — {inasistMes.length} pedido{inasistMes.length!==1?"s":""}</div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {[...inasistMes].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(i => {
                  const ti=TIPOS_INASIST.find(t=>t.id===i.tipoInasist)||TIPOS_INASIST[5];
                  const est=ESTADOS_INASIST.find(e=>e.id===i.estado)||ESTADOS_INASIST[0];
                  return (
                    <Box key={i.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 18px"}}> <div style={{display:"flex",alignItems:"center",gap:14,flex:1,minWidth:0}}>
                        <div style={{width:44,height:44,borderRadius:12,background:ti.color+"18",border:"1px solid "+ti.color+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{ti.icon}</div>
                        <div style={{minWidth:0}}> <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:3}}>
                            <span style={{color:C.text,fontWeight:700,fontSize:14}}>{i.persona}</span>
                            <Tag color={ti.color}>{ti.label}</Tag>
                            <Tag color={est.color}>{est.label}</Tag></div>
                          <div style={{color:C.muted,fontSize:12}}>📅 {fmt(i.fecha)}</div>
                          {i.descripcion && <div style={{color:C.dim,fontSize:12,marginTop:2}}>{i.descripcion}</div>} </div> </div> <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:10}}>
                        <Btn v="ghost" sm onClick={()=>editInasistFn(i)}>✏️</Btn>
                        <Btn v="danger" sm onClick={()=>delInasist(i.id)}>🗑️</Btn></div>
                    </Box> );
                })}</div>
            </div> )}
        </div> )}
      {seccion!=="inasistencias" && (
        <div>
          {filtrados.length===0 ? (
            <div style={{textAlign:"center",paddingTop:60}}>
              <div style={{fontSize:52,marginBottom:14}}>{tIcon[seccion]}</div>
              <h3 style={{color:C.text,fontWeight:700,margin:"0 0 10px"}}>No hay reuniones registradas</h3>
              <p style={{color:C.dim,fontSize:14,marginBottom:24}}>Registra la primera.</p>
              <Btn onClick={openAdd}>+ Agregar</Btn></div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filtrados.map(ev => (
                <Box key={ev.id} hi style={{cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px"}} onClick={()=>setVerId(ev.id)}>
                  <div style={{display:"flex",alignItems:"center",gap:14,flex:1,minWidth:0}}>
                    <div style={{width:44,height:44,borderRadius:12,background:tColor[seccion]+"18",border:"1px solid "+tColor[seccion]+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{tIcon[seccion]}</div>
                    <div style={{minWidth:0}}>
                      <div style={{color:C.text,fontWeight:700,fontSize:15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ev.titulo}</div>
                      <div style={{color:C.muted,fontSize:12,marginTop:3}}>📅 {fmt(ev.fecha)}{ev.hora?" · 🕐 "+ev.hora:""}{ev.participantes?" · 👥 "+ev.participantes.slice(0,40)+(ev.participantes.length>40?"…":""):""}</div>
                      {ev.descripcion && <div style={{color:C.dim,fontSize:12,marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:500}}>{ev.descripcion.slice(0,100)}{ev.descripcion.length>100?"…":""}</div>}
                    </div></div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:14}}>
                    <span style={{color:C.accentL,fontSize:12,fontWeight:700}}>ver →</span> <div onClick={e=>e.stopPropagation()} style={{display:"flex",gap:5}}>
                      <Btn v="ghost" sm onClick={()=>openEdit(ev)}>✏️</Btn>
                      <Btn v="danger" sm onClick={()=>del(ev.id)}>🗑️</Btn></div></div>
                </Box>
              ))}
            </div> )}
        </div> )}
      {pop && (
        <Pop title={editId?"Editar Evento":"Nuevo Evento"} onClose={()=>{setPop(false);setEditId(null);}} wide>
          <div style={{display:"flex",flexDirection:"column",gap:15}}> <div style={{display:"flex",gap:8}}>
              {[{id:"plenaria",label:"🏛️ Plenaria"},{id:"varia",label:"🗣️ Varia"}].map(t => (
                <button key={t.id} onClick={()=>setForm(f=>({...f,tipo:t.id}))} style={{flex:1,padding:"9px",borderRadius:10,border:"2px solid "+(form.tipo===t.id?tColor[t.id]:C.border),background:form.tipo===t.id?tColor[t.id]+"18":"transparent",color:form.tipo===t.id?tColor[t.id]:C.dim,fontWeight:700,fontSize:13,cursor:"pointer"}}>{t.label}</button>
              ))}</div>
            <Inp label="Titulo *" value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Ej: Reunion de inicio de ciclo lectivo" />
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Inp label="Fecha *" type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} />
              <Inp label="Hora" type="time" value={form.hora} onChange={e=>setForm(f=>({...f,hora:e.target.value}))} />
            </div>
            <Inp label="Participantes" value={form.participantes} onChange={e=>setForm(f=>({...f,participantes:e.target.value}))} placeholder="Ej: Directivos, docentes, padres..." />
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:11,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:1.1}}>Descripcion / Lo sucedido</label>
              <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Describí lo que ocurrio, acuerdos, temas..." rows={6} style={{background:"#07101e",border:"1px solid "+C.border,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14,outline:"none",resize:"vertical",fontFamily:"inherit",lineHeight:1.7}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border} />
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn v="ghost" onClick={()=>{setPop(false);setEditId(null);}}>Cancelar</Btn>
              <Btn onClick={save}>💾 Guardar evento</Btn></div></div>
        </Pop> )}
      {popInasist && (
        <Pop title={editInasistId?"Editar Pedido":"Registrar Pedido de Inasistencia"} onClose={()=>{setPopInasist(false);setEditInasistId(null);}} wide>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Inp label="Docente / Personal *" value={formInasist.persona} onChange={e=>setFormInasist(f=>({...f,persona:e.target.value}))} placeholder="Nombre y apellido de quien solicita" />
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Inp label="Fecha *" type="date" value={formInasist.fecha} onChange={e=>setFormInasist(f=>({...f,fecha:e.target.value}))} />
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:11,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:1.1}}>Estado</label> <div style={{display:"flex",gap:5}}>
                  {ESTADOS_INASIST.map(est => (
                    <button key={est.id} onClick={()=>setFormInasist(f=>({...f,estado:est.id}))} style={{flex:1,padding:"9px 4px",borderRadius:9,border:"2px solid "+(formInasist.estado===est.id?est.color:C.border),background:formInasist.estado===est.id?est.color+"18":"transparent",color:formInasist.estado===est.id?est.color:C.dim,fontWeight:700,fontSize:12,cursor:"pointer"}}>{est.label}</button>
                  ))}</div></div></div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:11,color:C.dim,fontWeight:700,textTransform:"uppercase",letterSpacing:1.1}}>Tipo de inasistencia *</label> <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:8}}>
                {TIPOS_INASIST.map(t => (
                  <button key={t.id} onClick={()=>setFormInasist(f=>({...f,tipoInasist:t.id}))} style={{padding:"10px 6px",borderRadius:10,border:"2px solid "+(formInasist.tipoInasist===t.id?t.color:C.border),background:formInasist.tipoInasist===t.id?t.color+"18":"transparent",color:formInasist.tipoInasist===t.id?t.color:C.dim,fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                    <span style={{fontSize:20}}>{t.icon}</span><span style={{textAlign:"center",lineHeight:1.2}}>{t.label}</span>
                  </button>
                ))}</div></div>
            <Inp label="Descripcion / Detalle" value={formInasist.descripcion} onChange={e=>setFormInasist(f=>({...f,descripcion:e.target.value}))} placeholder="Ej: Presenta certificado medico, dias del 5 al 7..." />
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn v="ghost" onClick={()=>{setPopInasist(false);setEditInasistId(null);}}>Cancelar</Btn>
              <Btn onClick={saveInasist}>💾 Guardar pedido</Btn></div></div>
        </Pop> )}
    </div> ); };
const exportarExcel = (data, colegioId) => {
  const col    = data.colegios.find(c => c.id === colegioId);
  const als    = data.alumnos.filter(a => a.colegioId === colegioId);
  const mats   = data.materias.filter(m => m.colegioId === colegioId); const ins    = data.inscripciones || [];
  const nombre = (col?.nombre || "EduGestion").replace(/[^a-zA-Z0-9_\-]/g, "_"); const ahora = new Date();
  const fechaExport = ahora.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  const horaExport  = ahora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const header = (hoja) => [
    [`Colegio: ${col?.nombre || "—"}`],
    [`Exportado el: ${fechaExport} a las ${horaExport}`],
    [`Hoja: ${hoja}`],
    [],
  ];
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s; };
  const csv = (rows) => rows.map(r => r.map(esc).join(",")).join("\n");
  const alsRows = [
    ...header("Alumnos"),
    ["Apellido","Nombre","DNI","Fecha Nac.","Curso","Email","Teléfono","Materias inscriptas","Promedio general"],
    ...als.map(al => {
      const matIds = ins.filter(i => i.alumnoId === al.id).map(i => i.materiaId);
      const matNombres = matIds.map(mid => mats.find(m => m.id === mid)?.nombre).filter(Boolean).join("; ");
      const vals = data.notas.filter(n => n.alumnoId === al.id).map(n => parseFloat(n.nota)).filter(v => !isNaN(v));
      const prom = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : "";
      return [al.apellido,al.nombre,al.dni||"",al.fechaNac||"",al.curso||"",al.email||"",al.telefono||"",matNombres,prom];
    }) ];
  const notasRows = [
    ...header("Notas"),
    ["Alumno (Apellido)","Alumno (Nombre)","DNI","Curso","Materia","Nota","Tipo","Descripción","Fecha"],
    ...data.notas.filter(n => als.some(a => a.id === n.alumnoId)).map(n => {
      const al  = als.find(a => a.id === n.alumnoId); const mat = mats.find(m => m.id === n.materiaId);
      return [al?.apellido||"",al?.nombre||"",al?.dni||"",al?.curso||"",mat?.nombre||"",n.nota,n.tipo,n.descripcion||"",n.fecha||""];
    }) ];
  const actsRows = [
    ...header("Actividades"),
    ["Alumno (Apellido)","Alumno (Nombre)","DNI","Curso","Materia","Tipo","Descripción","Fecha","Hora"],
    ...data.actividades.filter(a => als.some(al => al.id === a.alumnoId)).map(a => {
      const al  = als.find(al => al.id === a.alumnoId); const mat = mats.find(m => m.id === a.materiaId);
      return [al?.apellido||"",al?.nombre||"",al?.dni||"",al?.curso||"",mat?.nombre||"",a.tipo,a.descripcion||"",a.fecha||"",a.hora||""];
    }) ];
  const asistRows = [
    ...header("Asistencia"),
    ["Alumno (Apellido)","Alumno (Nombre)","DNI","Curso","Materia","Estado","Fecha","Observación"],
    ...(data.asistencias||[]).filter(a => als.some(al => al.id === a.alumnoId)).map(a => {
      const al  = als.find(al => al.id === a.alumnoId); const mat = mats.find(m => m.id === a.materiaId);
      return [al?.apellido||"",al?.nombre||"",al?.dni||"",al?.curso||"",mat?.nombre||"",a.estado,a.fecha||"",a.observacion||""];
    }) ];
  const matsRows = [
    ...header("Materias"),
    ["Materia","Descripción","Alumnos inscriptos","Total notas","Promedio general"],
    ...mats.map(m => {
      const alsMat = ins.filter(i => i.materiaId === m.id).length;
      const notasMat = data.notas.filter(n => n.materiaId === m.id);
      const vals = notasMat.map(n => parseFloat(n.nota)).filter(v => !isNaN(v));
      const prom = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : "";
      return [m.nombre, m.descripcion||"", alsMat, notasMat.length, prom]; })
  ];
  const eventosRows = [
    ...header("Eventos del Colegio"),
    ["Tipo","Título","Fecha","Hora","Participantes","Descripción"],
    ...(data.eventos||[]).filter(e => e.colegioId === colegioId).sort((a,b) => new Date(b.fecha)-new Date(a.fecha)).map(e => [
      e.tipo === "plenaria" ? "Reunión Plenaria" : "Reunión Varia",
      e.titulo, e.fecha||"", e.hora||"", e.participantes||"", e.descripcion||""
    ]) ];
  const tiposMap = {enfermedad:"Enfermedad",particular:"Razones particulares",duelo:"Duelo",maternidad:"Maternidad/Paternidad",capacitacion:"Capacitacion",otro:"Otro"};

  const inasistRows = [
    ...header("Pedidos de Inasistencia"),
    ["Docente/Personal","Fecha","Tipo","Estado","Descripcion"],
    ...(data.inasistencias||[]).filter(i => i.colegioId === colegioId).sort((a,b) => new Date(b.fecha)-new Date(a.fecha)).map(i => [
      i.persona||"", i.fecha||"", tiposMap[i.tipoInasist]||i.tipoInasist||"", i.estado||"", i.descripcion||""
    ]) ];
    const xmlSheet = (rows) => {
    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>`;
    rows.forEach((row, ri) => {
      xml += `<row r="${ri+1}">`;
      row.forEach((cell, ci) => {
        const col2 = String.fromCharCode(65 + ci); const addr = `${col2}${ri+1}`;
        const val = cell === null || cell === undefined ? "" : String(cell);
        const isNum = ri > 0 && val !== "" && !isNaN(parseFloat(val)) && isFinite(val);
        if (isNum) {
          xml += `<c r="${addr}"><v>${val}</v></c>`;
        } else {
          xml += `<c r="${addr}" t="inlineStr"><is><t>${val.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</t></is></c>`;
        } });
      xml += `</row>`; });
    xml += `</sheetData></worksheet>`;
    return xml; };
  const sheets = [
    { name: "Alumnos",     rows: alsRows   },
    { name: "Notas",       rows: notasRows },
    { name: "Actividades", rows: actsRows  },
    { name: "Asistencia",  rows: asistRows },
    { name: "Materias",    rows: matsRows  },
    { name: "Eventos",     rows: eventosRows },
    { name: "Inasistencias", rows: inasistRows }, ];
  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${s.name}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}</Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const enc = new TextEncoder(); const toBytes = (s) => enc.encode(s);
  const crc32 = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c; }
    return (buf) => { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  })();
  const u32le = (n) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; };

  const u16le = (n) => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n, true); return b; };

  const files = [
    { name: "[Content_Types].xml",   data: toBytes(contentTypes) },
    { name: "_rels/.rels",           data: toBytes(rootRels)     },
    { name: "xl/workbook.xml",       data: toBytes(wbXml)        },
    { name: "xl/_rels/workbook.xml.rels", data: toBytes(wbRels)  },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i+1}.xml`, data: toBytes(xmlSheet(s.rows)) })), ];
  const parts = []; const centralDir = [];
  let offset = 0;
  files.forEach(f => {
    const nameBytes = toBytes(f.name); const crc = crc32(f.data);
    const local = new Uint8Array([
      0x50,0x4B,0x03,0x04, 0x14,0x00, 0x00,0x00, 0x00,0x00,
      0x00,0x00, 0x00,0x00,
      ...u32le(crc),
      ...u32le(f.data.length),
      ...u32le(f.data.length),
      ...u16le(nameBytes.length), 0x00,0x00,
      ...nameBytes, ]);
    const entry = new Uint8Array(local.length + f.data.length);
    entry.set(local); entry.set(f.data, local.length);
    parts.push(entry);
    const cd = new Uint8Array([
      0x50,0x4B,0x01,0x02, 0x14,0x00, 0x14,0x00, 0x00,0x00, 0x00,0x00,
      0x00,0x00, 0x00,0x00,
      ...u32le(crc),
      ...u32le(f.data.length),
      ...u32le(f.data.length),
      ...u16le(nameBytes.length), 0x00,0x00, 0x00,0x00, 0x00,0x00, 0x00,0x00,
      0x00,0x00,0x00,0x00,
      ...u32le(offset),
      ...nameBytes, ]);
    centralDir.push(cd);
    offset += entry.length; });
  const cdSize   = centralDir.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array([
    0x50,0x4B,0x05,0x06, 0x00,0x00, 0x00,0x00,
    ...u16le(files.length), ...u16le(files.length),
    ...u32le(cdSize), ...u32le(offset),
    0x00,0x00, ]);
  const total = parts.reduce((s,p) => s + p.length, 0) + cdSize + eocd.length; const zip = new Uint8Array(total);
  let pos = 0;
  parts.forEach(p => { zip.set(p, pos); pos += p.length; });
  centralDir.forEach(c => { zip.set(c, pos); pos += c.length; });
  zip.set(eocd, pos);
  const blob = new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url;
  a.download = `EduGestion_${nombre}.xlsx`;
  a.click();
  URL.revokeObjectURL(url); };
const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
};

const Reportes = ({ data, setData, onClose }) => {
  const [form, setForm] = useState({ titulo: "", descripcion: "", prioridad: "media" });
  const reportes = [...(data.reportes||[])].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  const prioColor = { alta: "#f87171", media: "#fbbf24", baja: "#2dd4bf" };
  const estadoColor = { pendiente: "#f97316", "en revision": "#22c55e", resuelto: "#34d399" };

  const save = () => {
    if (!form.titulo.trim() || !form.descripcion.trim()) { alert("Completá título y descripción."); return; }
    const nuevo = { id: uid(), titulo: form.titulo, descripcion: form.descripcion, prioridad: form.prioridad, estado: "pendiente", fecha: new Date().toISOString().slice(0,10) };
    setData(d => ({ ...d, reportes: [...(d.reportes||[]), nuevo] }));
    setForm({ titulo: "", descripcion: "", prioridad: "media" });
  };

  const cambiarEstado = (id, estado) => {
    setData(d => ({ ...d, reportes: d.reportes.map(r => r.id === id ? { ...r, estado } : r) }));
  };

  const eliminar = (id) => {
    setData(d => ({ ...d, reportes: d.reportes.filter(r => r.id !== id) }));
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: C.bg, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ color: C.text, margin: 0, fontSize: 22, fontWeight: 900 }}>🐛 Panel de Reportes</h2>
        <Btn v="ghost" onClick={onClose}>← Volver</Btn>
      </div>

      {/* Formulario nuevo reporte */}
      <Box style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 16 }}>Nuevo reporte</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Inp label="Título *" value={form.titulo} onChange={e => setForm(f => ({...f, titulo: e.target.value}))} placeholder="Ej: El botón guardar no responde" />
          <Inp label="Descripción *" value={form.descripcion} onChange={e => setForm(f => ({...f, descripcion: e.target.value}))} placeholder="Describí el problema con detalle..." />
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <Sel label="Prioridad" value={form.prioridad} onChange={e => setForm(f => ({...f, prioridad: e.target.value}))}>
              <option value="alta">🔴 Alta</option>
              <option value="media">🟡 Media</option>
              <option value="baja">🟢 Baja</option>
            </Sel>
            <Btn onClick={save}>+ Agregar reporte</Btn>
          </div>
        </div>
      </Box>

      {/* Lista de reportes */}
      {reportes.length === 0 ? <Empty icon="🐛" msg="No hay reportes registrados." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reportes.map(r => (
            <Box key={r.id} style={{ borderLeft: `3px solid ${prioColor[r.prioridad]||C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{r.titulo}</span>
                    <span style={{ background: prioColor[r.prioridad]+"22", color: prioColor[r.prioridad], border: `1px solid ${prioColor[r.prioridad]}44`, borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{r.prioridad}</span>
                    <span style={{ background: estadoColor[r.estado]+"22", color: estadoColor[r.estado], border: `1px solid ${estadoColor[r.estado]}44`, borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{r.estado}</span>
                  </div>
                  <div style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>{r.descripcion}</div>
                  <div style={{ fontSize: 11, color: C.dim }}>📅 {fmt(r.fecha)}</div>
                </div>
                <button onClick={() => eliminar(r.id)} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, flexShrink: 0 }} title="Eliminar">🗑</button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {["pendiente","en revision","resuelto"].map(e => (
                  <button key={e} onClick={() => cambiarEstado(r.id, e)}
                    style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${r.estado===e ? estadoColor[e] : C.border}`, background: r.estado===e ? estadoColor[e]+"22" : "transparent", color: r.estado===e ? estadoColor[e] : C.dim, fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
                    {e}
                  </button>
                ))}
              </div>
            </Box>
          ))}
        </div>
      )}
    </div>
  );
};


const ADMIN_EMAIL = "javier.l.macri@gmail.com"; // Cambiar por tu email

const PanelFallas = ({ user, onClose }) => {
  const [fallas, setFallas] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    supabase.from("fallas").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setFallas(data || []);
      setLoading(false);
    });
  }, []);

  const marcarResuelto = async (id) => {
    await supabase.from("fallas").update({ estado: "resuelto" }).eq("id", id);
    setFallas(f => f.map(x => x.id === id ? { ...x, estado: "resuelto" } : x));
  };

  const eliminar = async (id) => {
    await supabase.from("fallas").delete().eq("id", id);
    setFallas(f => f.filter(x => x.id !== id));
  };

  return (
    <Pop title="🐛 Panel de fallas reportadas" onClose={onClose} wide>
      {loading ? <div style={{ color: C.muted, textAlign: "center", padding: 20 }}>Cargando...</div> :
      fallas.length === 0 ? <Empty icon="✅" msg="No hay fallas reportadas." /> :
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 500, overflowY: "auto" }}>
        {fallas.map(f => (
          <div key={f.id} style={{ background: C.bg, border: `1px solid ${f.estado==="resuelto" ? C.green+"44" : C.red+"44"}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ background: f.estado==="resuelto" ? C.green+"22" : C.red+"22", color: f.estado==="resuelto" ? C.green : C.red, border: `1px solid ${f.estado==="resuelto" ? C.green+"44" : C.red+"44"}`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{f.estado==="resuelto" ? "✅ Resuelto" : "🔴 Pendiente"}</span>
                  <span style={{ color: C.muted, fontSize: 11 }}>{f.email}</span>
                  <span style={{ color: C.dim, fontSize: 11 }}>{new Date(f.created_at).toLocaleDateString("es-AR")}</span>
                </div>
                <div style={{ color: C.text, fontSize: 14 }}>{f.descripcion}</div>
                {f.seccion && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Sección: {f.seccion}</div>}
              </div>
              {isAdmin && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {f.estado !== "resuelto" && <button onClick={() => marcarResuelto(f.id)} style={{ background: C.green+"22", border: `1px solid ${C.green}44`, color: C.green, borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✓</button>}
                  <button onClick={() => eliminar(f.id)} style={{ background: C.red+"22", border: `1px solid ${C.red}44`, color: C.red, borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>🗑</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>}
    </Pop>
  );
};

const FormReporte = ({ user, tab, onClose }) => {
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const enviar = async () => {
    if (!desc.trim()) { alert("Describí la falla."); return; }
    setLoading(true);
    await supabase.from("fallas").insert({ id: uid(), email: user?.email || "anon", descripcion: desc, seccion: tab, estado: "pendiente" });
    setLoading(false);
    alert("✅ Falla reportada. Gracias!");
    onClose();
  };

  return (
    <Pop title="🐛 Reportar una falla" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.accentL }}>
          Sección actual: <strong>{tab}</strong>
        </div>
        <Inp label="Describí la falla *" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Al guardar una nota me aparece error..." />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn v="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={enviar} disabled={loading}>{loading ? "Enviando..." : "📤 Enviar reporte"}</Btn>
        </div>
      </div>
    </Pop>
  );
};


const Documentos = ({ data, setData, colegioId }) => {
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [confirmQueue, setConfirmQueue] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [filtroAlumno, setFiltroAlumno] = useState("");
  const [filtroMateria, setFiltroMateria] = useState("");
  const [showResumen, setShowResumen] = useState(false);
  const alumnos = data.alumnos.filter(a => a.colegioId === colegioId);
  const materias = data.materias.filter(m => m.colegioId === colegioId);

  useEffect(() => {
    supabase.from("documentos").select("*").eq("colegio_id", colegioId).order("created_at", { ascending: false })
      .then(({ data: docs }) => { setArchivos(docs || []); setLoading(false); });
  }, [colegioId]);

  const tipoLabel = { examen: "📝 Examen", trabajo: "📋 Trabajo práctico", documento: "📄 Documento", dni: "🪪 DNI/Documentación" };

  const analizarArchivo = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(",")[1];
        try {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64, mimeType: file.type })
          });
          const d = await res.json();
          const rawText = d.text || "";
          const cleanText = rawText.split("").filter(c => c.charCodeAt(0) < 1000).join("").replace(/ +/g, " ").trim();
          console.log("Vision texto:", cleanText.slice(0, 100));
          console.log("Claude detectó → nota:", d.nota, "| tipo:", d.tipo);
          const notaDetectada = d.nota || "";
          const tipo = d.tipo || "documento";
          resolve({ nombre: cleanText, tipo, descripcion: tipo, nota: notaDetectada });
        } catch(err) { console.log("Error:", err.message); resolve({ nombre: "", tipo: "documento", descripcion: "" }); }
      };
      reader.readAsDataURL(file);
    });
  };
  const subirArchivos = async (files) => {
    if (!files.length) return;
    setProcesando(true);
    const queue = [];
    for (const file of Array.from(files)) {
      const analisis = await analizarArchivo(file);
      const alumnoEncontrado = alumnos.find(a => {
        const textoCompleto = (analisis.nombre || "").toLowerCase();
        if (!textoCompleto) return false;
        const apellido = (a.apellido || "").toLowerCase();
        const nombre = (a.nombre || "").toLowerCase();
        const palabras = textoCompleto.split(/[\s\n\r,]+/).filter(p => p.length > 2);
        const sim = (a, b) => {
          if (!a || !b) return 0;
          const longer = a.length > b.length ? a : b;
          const shorter = a.length > b.length ? b : a;
          let matches = 0;
          for (let i = 0; i < shorter.length; i++) if (longer.includes(shorter[i])) matches++;
          return matches / longer.length;
        };
        const tieneApellido = palabras.some(p => apellido.includes(p) || p.includes(apellido) || sim(p, apellido) > 0.6);
        const tieneNombre = palabras.some(p => nombre.includes(p) || p.includes(nombre) || sim(p, nombre) > 0.6);
        return tieneApellido && tieneNombre;
      });
      console.log("Alumno encontrado:", alumnoEncontrado?.apellido, alumnoEncontrado?.nombre, "| texto:", analisis.nombre?.slice(0,30));
      queue.push({ file, analisis, alumnoSugerido: alumnoEncontrado || null, alumnoId: alumnoEncontrado?.id || "", notaDetectada: analisis.nota || "" });
    }
    setConfirmQueue(queue);
    setProcesando(false);
  };

  const confirmarYSubir = async (item, alumnoId, tipo, notaOverride, materiaIdParam) => {
    setSubiendo(true);
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result.split(",")[1]);
        reader.readAsDataURL(item.file);
      });

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: item.file.type, fileName: item.file.name })
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.url) { alert("Error al subir: " + (uploadData.error || "desconocido")); setSubiendo(false); return; }

      const doc = { id: crypto.randomUUID(), alumno_id: alumnoId || null, colegio_id: colegioId, nombre: item.file.name, tipo, url: uploadData.url, storage_path: uploadData.publicId || "", fecha: new Date().toISOString().slice(0,10) };
      const { error: docErr } = await supabase.from("documentos").insert(doc);
      console.log("doc insert result:", docErr ? JSON.stringify(docErr) : "OK", "doc.id:", doc.id);
      // Save nota — usar materia seleccionada por usuario, o fallback a primera inscripción
      const notaFinal = notaOverride !== undefined ? notaOverride : item.notaDetectada;
      if (notaFinal && alumnoId) {
        let materiaId = materiaIdParam || item.materiaId || "";
        if (!materiaId) {
          const inscripciones = data.inscripciones.filter(i => i.alumnoId === alumnoId);
          materiaId = inscripciones.length > 0 ? inscripciones[0].materiaId : "";
        }
        const nota = { id: crypto.randomUUID(), alumnoId, materiaId, nota: notaFinal, tipo, descripcion: item.file.name, fecha: new Date().toISOString().slice(0,10) };
        console.log("Saving nota:", JSON.stringify(nota));
        setData(d => ({ ...d, notas: [...d.notas, nota] }));
        await upsertRow("notas", nota);
        await registrarHistorial(alumnoId, "Nota agregada", `${tipo} — ${item.file.name} — Nota: ${notaFinal}`);
      }
      setArchivos(a => [doc, ...a]);
      setConfirmQueue(q => q.filter(x => x !== item));
    } catch(e) { alert("Error: " + e.message); }
    setSubiendo(false);
  };

  const confirmarTodo = async () => setShowResumen(true);

  const ejecutarConfirmarTodo = async () => {
    setShowResumen(false);
    setSubiendo(true);
    for (const item of [...confirmQueue]) {
      await confirmarYSubir(item, item.alumnoId, item.tipoSeleccionado || item.analisis.tipo || item.analisis.descripcion || "documento", item.notaDetectada, item.materiaId);
    }
    setSubiendo(false);
  };

  const eliminarDoc = async (doc) => {
    if (!confirm("¿Eliminar este archivo?")) return;
    // Eliminar de Cloudinary
    if (doc.storage_path) {
      try {
        const delRes = await fetch("/api/delete-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: doc.storage_path })
        });
        const delData = await delRes.json();
        console.log("Cloudinary delete result:", delData);
      } catch(e) { console.log("Error eliminando de Cloudinary:", e.message); }
    }
    // Eliminar nota asociada si existe
    if (doc.alumno_id && doc.nombre) {
      const notaAsociada = data.notas.find(n => n.alumnoId === doc.alumno_id && n.descripcion === doc.nombre);
      if (notaAsociada) {
        await supabase.from("notas").delete().eq("id", notaAsociada.id);
        setData(d => ({ ...d, notas: d.notas.filter(n => n.id !== notaAsociada.id) }));
      }
    }
    if (doc.alumno_id) await registrarHistorial(doc.alumno_id, "Archivo eliminado", `${doc.nombre} — ${doc.tipo || "documento"}`, true);
    await supabase.from("documentos").delete().eq("id", doc.id);
    setArchivos(a => a.filter(x => x.id !== doc.id));
  };

  const getAlumnoMaterias = (alumnoId) => {
    return data.inscripciones.filter(i => i.alumnoId === alumnoId).map(i => i.materiaId);
  };
  const docsFiltrados = archivos.filter(d => {
    if (filtroAlumno && d.alumno_id !== filtroAlumno) return false;
    if (filtroMateria) {
      const alumnoMaterias = getAlumnoMaterias(d.alumno_id);
      if (!alumnoMaterias.includes(filtroMateria)) return false;
    }
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: C.text, margin: 0, fontSize: 20, fontWeight: 800 }}>📁 Archivos y Documentos</h2>
        <label style={{ background: C.grad, color: "#fff", padding: "10px 18px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          {procesando ? "🔍 Analizando..." : "⬆️ Subir archivos"}
          <input type="file" multiple accept="image/*,.pdf" style={{ display: "none" }} onChange={e => subirArchivos(e.target.files)} disabled={procesando} />
        </label>
      </div>

      {/* Cola de confirmación */}
      {confirmQueue.length > 0 && (
        <Box style={{ marginBottom: 20, border: `1px solid ${C.accent}44`, background: C.accentDim }}>
          <div style={{ fontSize: 13, color: C.accentL, fontWeight: 800, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>🔍 Confirmar archivos detectados ({confirmQueue.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {confirmQueue.map((item, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>📄 {item.file.name}</div>
                    {item.analisis.descripcion && <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>IA detectó: {item.analisis.descripcion}</div>}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      {/* Fila 1: Alumno + Tipo */}
                      <select value={item.alumnoId} onChange={e => setConfirmQueue(q => q.map((x,j) => j===i ? {...x, alumnoId: e.target.value} : x))}
                        style={{ background: "#07101e", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none" }}>
                        <option value="">— Sin alumno asignado —</option>
                        {alumnos.map(a => <option key={a.id} value={a.id}>{a.apellido}, {a.nombre}</option>)}
                      </select>
                      <select value={item.analisis.tipo||"documento"} onChange={e => setConfirmQueue(q => q.map((x,j) => j===i ? {...x, tipoSeleccionado: e.target.value, analisis:{...x.analisis, tipo: e.target.value, descripcion: e.target.value}} : x))}
                        style={{ background: "#07101e", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", color: C.text, fontSize: 13, outline: "none" }}>
                        <option value="examen">📝 Examen</option>
                        <option value="trabajo">📋 Trabajo práctico</option>
                        <option value="documento">📄 Documento</option>
                        <option value="dni">🪪 DNI/Documentación</option>
                      </select>
                    </div>
                    {/* Fila 2: Materia - destacada */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: C.dim, fontWeight: 700, whiteSpace: "nowrap" }}>📚 Materia:</span>
                      <select value={item.materiaId || ""}
                        onChange={e => setConfirmQueue(q => q.map((x,j) => j===i ? {...x, materiaId: e.target.value} : x))}
                        style={{ background: "#07101e", border: `1.5px solid ${item.materiaId ? C.accent+"88" : C.yellow+"66"}`, borderRadius: 8, padding: "7px 12px", color: item.materiaId ? C.text : C.yellow, fontSize: 13, outline: "none", minWidth: 180, fontWeight: item.materiaId ? 400 : 700 }}>
                        <option value="">⚠️ Seleccionar materia...</option>
                        {data.materias.filter(m => m.colegioId === colegioId).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                      {!item.materiaId && <span style={{ fontSize: 11, color: C.yellow, fontWeight: 700 }}>Recomendado</span>}
                    </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: item.notaDetectada ? C.green+"22" : C.accentDim, border: `1px solid ${item.notaDetectada ? C.green+"44" : C.accent+"44"}`, borderRadius: 10, padding: "6px 12px" }}>
                        <span style={{ fontSize: 12, color: C.dim, fontWeight: 700 }}>📊 Nota:</span>
                        <input type="number" min="0" max="10" step="0.1" placeholder="0-10"
                          value={item.notaDetectada || ""}
                          onChange={e => setConfirmQueue(q => q.map((x,j) => j===i ? {...x, notaDetectada: e.target.value} : x))}
                          style={{ width: 70, background: "transparent", border: "none", color: item.notaDetectada ? C.green : C.accentL, fontSize: 18, fontWeight: 900, textAlign: "center", outline: "none" }} />
                        {item.notaDetectada ? <span style={{ fontSize: 11, color: C.green }}>✓ detectada</span> : <span style={{ fontSize: 11, color: C.muted }}>ingresá</span>}
                      </div>
                    {item.alumnoSugerido && <div style={{ color: C.accentL, fontSize: 12, marginTop: 6 }}>✨ IA sugirió: {item.alumnoSugerido.apellido}, {item.alumnoSugerido.nombre}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn onClick={() => confirmarYSubir(item, item.alumnoId, item.analisis.tipo||"documento", undefined, item.materiaId)} disabled={subiendo}>✓ Confirmar</Btn>
                    <Btn v="ghost" onClick={() => setConfirmQueue(q => q.filter((_,j) => j!==i))}>✕</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Box>
      )}
      {/* Boton confirmar todo */}
      {confirmQueue.length > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <button onClick={confirmarTodo}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 900, fontSize: 15, cursor: "pointer", boxShadow: `0 0 20px ${C.accent}66` }}>
            ✅ Confirmar todo ({confirmQueue.length})
          </button>
        </div>
      )}

      {/* Modal resumen confirmar todo */}
      {showResumen && (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.card, border: `1px solid ${C.accent}44`, borderRadius: 16, padding: 28, maxWidth: 500, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.accentL, marginBottom: 16 }}>📋 Resumen — {confirmQueue.length} archivos</div>
            {confirmQueue.map((item, i) => {
              const alumno = alumnos.find(a => a.id === item.alumnoId);
              return (
                <div key={i} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 10, marginBottom: 10 }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>📄 {item.file.name}</div>
                  <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>
                    👤 {alumno ? `${alumno.apellido}, ${alumno.nombre}` : "Sin alumno"}
                    &nbsp;·&nbsp; 📁 {item.tipo || item.analisis.descripcion || "documento"}
                    {item.notaDetectada && <span>&nbsp;·&nbsp; 📊 Nota: <b style={{ color: C.accentL }}>{item.notaDetectada}</b></span>}
                  </div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowResumen(false)} style={{ padding: "10px 22px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
              <button onClick={ejecutarConfirmarTodo} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 900, cursor: "pointer" }}>✅ Confirmar todo</button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros - solo si hay archivos */}
      {/* Filtro Materia - siempre visible */}
      {materias.length > 0 && (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Materia:</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {materias.map(m => (
            <button key={m.id} onClick={() => { setFiltroMateria(filtroMateria===m.id ? "" : m.id); setFiltroAlumno(""); }}
              style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filtroMateria===m.id ? C.accent : C.border}`, background: filtroMateria===m.id ? C.accentDim : "transparent", color: filtroMateria===m.id ? C.accentL : C.dim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {m.nombre}
            </button>
          ))}
        </div>
      </div>
      )}
      {/* Filtro Alumno - solo si hay materia seleccionada */}
      {filtroMateria && (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Alumno:</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setFiltroAlumno("")}
            style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${!filtroAlumno ? C.accent : C.border}`, background: !filtroAlumno ? C.accentDim : "transparent", color: !filtroAlumno ? C.accentL : C.dim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Todos
          </button>
          {alumnos.filter(a => data.inscripciones.some(i => i.alumnoId === a.id && i.materiaId === filtroMateria)).map(a => (
            <button key={a.id} onClick={() => setFiltroAlumno(a.id)}
              style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filtroAlumno===a.id ? C.accent : C.border}`, background: filtroAlumno===a.id ? C.accentDim : "transparent", color: filtroAlumno===a.id ? C.accentL : C.dim, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {a.apellido}, {a.nombre}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Lista de archivos */}
      {loading ? <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>Cargando...</div> :
      docsFiltrados.length === 0 ? <Empty icon="📁" msg="No hay archivos subidos todavía." /> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {docsFiltrados.map(doc => {
          const al = alumnos.find(a => a.id === doc.alumno_id);
          const isImg = doc.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i);
          return (
            <Box key={doc.id} style={{ padding: 0, overflow: "hidden" }}>
              {isImg ? (
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <img src={doc.url} alt={doc.nombre} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                </a>
              ) : (
                <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 100, background: C.bg, textDecoration: "none" }}>
                  <span style={{ fontSize: 40 }}>📄</span>
                </a>
              )}
              <div style={{ padding: "12px 14px" }}>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 13, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.nombre}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ background: C.accentDim, color: C.accentL, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{tipoLabel[doc.tipo] || doc.tipo}</span>
                    {al && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>👤 {al.apellido}, {al.nombre}</div>}
                    <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>{doc.fecha}</div>
                  </div>
                  <button onClick={() => eliminarDoc(doc)} style={{ background: C.red+"22", border: `1px solid ${C.red}44`, color: C.red, borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 13 }}>🗑</button>
                </div>
              </div>
            </Box>
          );
        })}
      </div>}
    </div>
  );
};


const AppInterna = ({ data, setData, colegioId, onSalir, onLogout, user }) => {
  const [tab, setTab] = useState(() => localStorage.getItem("lastTab") || "dashboard");
  const [showReporte, setShowReporte] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [dashKey, setDashKey] = useState(0);
  const [exportando, setExportando] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const col = data.colegios.find(c => c.id === colegioId);
  const views = { dashboard: Dashboard, materias: Materias, alumnos: Alumnos, eventos: Eventos, documentos: Documentos };
  const View = views[tab] || Dashboard;
  const [tabKey, setTabKey] = useState(0);
  const [dashVista, setDashVista] = useState(null);
  const goInicio = () => {
    setTab("dashboard"); setDashKey(k => k + 1); setMenuOpen(false); setDashVista(null);
    window.history.pushState({ tab: "dashboard" }, "", "#");
    localStorage.setItem("lastTab", "dashboard");
  };
  const handleTab = (id) => {
    if (id === "dashboard") { goInicio(); }
    else if (id === "agenda") {
      setTab("dashboard"); setDashKey(k => k + 1); setDashVista("agenda"); setMenuOpen(false);
      localStorage.setItem("lastTab", "dashboard");
    }
    else if (id === tab) { setTabKey(k => k + 1); setMenuOpen(false); }
    else {
      setTab(id); setTabKey(k => k + 1); setMenuOpen(false); setDashVista(null);
      window.history.pushState({ tab: id }, "", "#" + id);
      localStorage.setItem("lastTab", id);
    }
  };
  const goBack = () => { goInicio(); };
  useEffect(() => {
    const onPop = (e) => {
      const t = e.state?.tab || "dashboard";
      if (t === "dashboard") { setTab("dashboard"); setDashKey(k => k + 1); }
      else { setTab(t); setTabKey(k => k + 1); }
      setMenuOpen(false);
    };
    window.history.replaceState({ tab: "dashboard" }, "", "#");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const handleExport = () => {
    setExportando(true);
    setTimeout(() => { exportarExcel(data, colegioId); setExportando(false); }, 100);
  };

  // Tab activo para el sidebar/nav — agenda se muestra activo cuando el dashboard está en vista agenda
  const activeTab = (tab === "dashboard" && dashVista === "agenda") ? "agenda" : tab;

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: C.bg }}>
      {/* Header móvil */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {tab !== "dashboard" && (
            <button onClick={goBack} style={{ background: "transparent", border: "none", color: C.accent, fontSize: 24, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>‹</button>
          )}
          <div onClick={goInicio} style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1 }}>Colegio activo</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{col?.nombre}</div>
          </div>
        </div>
        <button onClick={() => setMenuOpen(o => !o)} style={{ background: menuOpen ? C.accentDim : "transparent", border: `1px solid ${menuOpen ? C.accent : C.border}`, borderRadius: 10, padding: "8px 12px", color: menuOpen ? C.accentL : C.dim, fontSize: 18, cursor: "pointer" }}>
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Menú desplegable móvil */}
      {menuOpen && (
        <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4, zIndex: 99 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => handleTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 15, fontWeight: activeTab === t.id ? 700 : 500, background: activeTab === t.id ? C.accentDim : "transparent", color: activeTab === t.id ? C.accentL : C.dim, textAlign: "left" }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>{t.label}
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={() => { handleExport(); setMenuOpen(false); }} disabled={exportando}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, border: `1px solid #22c55e33`, cursor: "pointer", fontSize: 14, fontWeight: 700, background: "#22c55e12", color: "#22c55e" }}>
              <span>{exportando ? "⏳" : "📊"}</span>{exportando ? "Generando..." : "Exportar Excel"}
            </button>
            <button onClick={() => { onSalir(); setMenuOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: "transparent", color: C.muted }}>
              ← Cambiar colegio
            </button>
            <button onClick={() => { setShowReporte(true); setMenuOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: "transparent", color: C.muted }}>
              🐛 Reportar falla
            </button>
            {isAdmin && (
            <button onClick={() => { setShowPanel(true); setMenuOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: "transparent", color: C.muted }}>
              📋 Ver fallas
            </button>
            )}
          </div>
        </div>
      )}

      {/* Contenido principal móvil */}
      <main style={{ flex: 1, padding: "16px 14px", overflowY: "auto" }}>
        <View data={data} setData={setData} colegioId={colegioId} onChangeTab={handleTab} initialVista={dashVista} key={tab === "dashboard" ? `dash-${dashKey}` : `${tab}-${tabKey}`} />
      </main>

      {/* Tab bar inferior móvil */}
      <nav style={{ background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", position: "sticky", bottom: 0, zIndex: 100 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTab(t.id)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "10px 4px", border: "none", cursor: "pointer", background: "transparent", color: activeTab === t.id ? C.accentL : C.dim, borderTop: `2px solid ${activeTab === t.id ? C.accent : "transparent"}` }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: activeTab === t.id ? 700 : 500 }}>{t.label}</span>
          </button>
        ))}
      </nav>
      {/* Modals FUERA del nav sticky para evitar z-index bloqueado */}
      {showReporte && <FormReporte user={user} tab={tab} onClose={() => setShowReporte(false)} />}
      {showPanel && <PanelFallas user={user} onClose={() => setShowPanel(false)} />}
    </div>
  );

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────────
  const SideBtn = ({ icon, label, active, onClick, color, danger }) => {
    const [h, setH] = useState(false);
    const activeColor = color || C.accentL;
    return (
      <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderRadius: 11, border: active ? `1.5px solid ${C.accent}40` : "none", cursor: "pointer", fontSize: 13.5, fontWeight: active ? 700 : 500, transition: "all .15s", background: active ? C.accentDim : h ? C.card2 : "transparent", color: active ? activeColor : h ? (danger ? C.red : C.text) : C.dim, width: "100%", textAlign: "left", fontFamily: "inherit" }}>
        <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>{label}
      </button>
    );
  };
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <aside style={{ width: 228, background: C.card, borderRight: `1.5px solid ${C.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        {/* Logo/School header */}
        <div style={{ padding: "20px 16px 16px", borderBottom: `1.5px solid ${C.border}`, cursor: "pointer" }} onClick={goInicio}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: C.accentDim, border: `1.5px solid ${C.accent}35`, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎓</div>
            <div>
              <div style={{ fontSize: 9, color: C.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 3 }}>Colegio activo</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text, lineHeight: 1.3, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col?.nombre}</div>
            </div>
          </div>
        </div>
        {/* Main nav */}
        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {TABS.map(t => (
            <SideBtn key={t.id} icon={t.icon} label={t.label} active={activeTab === t.id} onClick={() => handleTab(t.id)} />
          ))}
        </nav>
        {/* Bottom actions */}
        <div style={{ padding: "8px 8px 12px", borderTop: `1.5px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 2 }}>
          <SideBtn icon={exportando ? "⏳" : "📊"} label={exportando ? "Generando..." : "Exportar Excel"} onClick={handleExport} color="#4ade80" />
          <SideBtn icon="←" label="Cambiar colegio" onClick={onSalir} danger />
          <SideBtn icon="🐛" label="Reportar falla" onClick={() => setShowReporte(true)} />
          {isAdmin && <SideBtn icon="📋" label="Ver fallas" onClick={() => setShowPanel(true)} />}
          <SideBtn icon="🚪" label="Cerrar sesión" onClick={onLogout} danger />
        </div>
      </aside>
      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto", background: C.bg }}>
        <View data={data} setData={setData} colegioId={colegioId} onChangeTab={handleTab} initialVista={dashVista} key={tab === "dashboard" ? `dash-${dashKey}` : `${tab}-${tabKey}`} />
      </main>
      {/* Modals renderizados FUERA del aside para evitar z-index bloqueado por position:sticky */}
      {showReporte && <FormReporte user={user} tab={tab} onClose={() => setShowReporte(false)} />}
      {showPanel && <PanelFallas user={user} onClose={() => setShowPanel(false)} />}
    </div>
  );
};
export default function App() {
  const [screen, setScreen] = useState("login"); 
  const [colegioId, setColegioId] = useState(() => localStorage.getItem("lastColegioId") || null);
  const [data, setDataRaw] = useState(INIT);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { 
        setUser(session.user); 
        const savedColegio = localStorage.getItem("lastColegioId");
        setScreen(savedColegio ? "app" : "welcome");
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setUser(session.user); } else { setUser(null); setScreen("login"); }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => { if (user) { loadD().then(d => { if (d) setDataRaw({ ...INIT, ...d }); }); } }, [user]);
  const setData = useCallback((fn) => {
    setDataRaw(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      // Sync to Supabase asynchronously AFTER render
      setTimeout(() => {
        const tables = Object.keys(TABLE_MAP);
        for (const table of tables) {
          const prevArr = prev[table]||[], nextArr = next[table]||[];
          for (const item of nextArr) {
            const p = prevArr.find(x => x.id === item.id);
            if (!p || JSON.stringify(p) !== JSON.stringify(item)) upsertRow(table, item);
          }
          for (const item of prevArr) {
            if (!nextArr.find(x => x.id === item.id)) deleteRow(table, item.id);
          }
        }
      }, 0);
      return next;
    });
  }, []);
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setScreen("login"); setColegioId(null); setDataRaw(INIT); localStorage.removeItem("lastColegioId"); localStorage.removeItem("lastTab"); };

  useEffect(() => {
    const onPop = (e) => {
      const s = e.state?.screen;
      if (s === "welcome" || s === "colegios") { setScreen(s); setColegioId(null); }
      else if (s === "login") { handleLogout(); }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif", color: C.muted, fontSize: 16 }}>Cargando...</div>
  );
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {screen === "login" && <Login onLogin={u => { setUser(u); setScreen("welcome"); }} />}
      {screen === "welcome" && <Welcome onGo={() => { setScreen("colegios"); window.history.pushState({ screen: "colegios" }, "", "#colegios"); }} />}
      {screen === "colegios" && <ColegioSelector data={data} setData={setData} onSelect={id => { setColegioId(id); setScreen("app"); localStorage.setItem("lastColegioId", id); window.history.pushState({ screen: "app" }, "", "#app"); }} onBack={() => setScreen("welcome")} />}
      {screen === "app" && colegioId && <AppInterna data={data} setData={setData} colegioId={colegioId} user={user} onSalir={() => { setColegioId(null); setScreen("colegios"); localStorage.removeItem("lastColegioId"); localStorage.removeItem("lastTab"); }} onLogout={handleLogout} />}
    </div> ); }
