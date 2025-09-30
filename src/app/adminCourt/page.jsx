"use client";
import React, { useEffect, useMemo, useState } from "react";

/* ============== CONFIG ============== */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21; // ช่องสุดท้าย 20:00–21:00
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];

/* ============== HELPERS ============== */
// items -> { [court]: { [hour]: { user, status, bookingId } } }
function toBookedDetailMap(items = []) {
  const map = {};
  for (const it of items) {
    const { court, hour, user, status, bookingId } = it;
    (map[court] ??= {});
    map[court][hour] = { user, status, bookingId };
  }
  return map;
}
function takenToDetailMap(taken = []) {
  const map = {};
  for (const key of taken) {
    const [c, h] = String(key).split(":").map(Number);
    (map[c] ??= {})[h] = { user: null, status: "booked", bookingId: null };
  }
  return map;
}
function shortName(user = {}) {
  if (user?.username) return user.username;
  if (user?.email) return String(user.email).split("@")[0];
  return "unknown";
}
function statusText(status) {
  switch (status) {
    case "booked": return "จองแล้ว";
    case "checked_in": return "มาแล้ว";
    case "cancelled": return "ยกเลิก";
    default: return status || "-";
  }
}

/* ============== PAGE ============== */
export default function AdminCourtPage() {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [dateKey, setDateKey] = useState(todayKey);

  // { [court]: { [hour]: { user, status, bookingId } } }
  const [bookedDetailMap, setBookedDetailMap] = useState({});
  const [selected, setSelected] = useState([]); // [{ court, hour }]

  const resetSelection = () => setSelected([]);

  // อัปเดตเป็น "วันนี้" อัตโนมัติ
  useEffect(() => {
    const updateToToday = () => {
      const nowKey = toDateKey(new Date());
      setDateKey(prev => (prev !== nowKey ? nowKey : prev));
      setSelected([]);
    };
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const t1 = setTimeout(() => {
      updateToToday();
      const t2 = setInterval(updateToToday, 24 * 60 * 60 * 1000);
      (window).__midnightInterval = t2;
    }, nextMidnight.getTime() - now.getTime());
    return () => {
      clearTimeout(t1);
      if ((window).__midnightInterval) clearInterval((window).__midnightInterval);
    };
  }, []);

  // โหลดสถานะ
  async function loadAvailability(forDate) {
    const res = await fetch(`/api/availability?date=${encodeURIComponent(forDate)}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "load failed");
    if (Array.isArray(data?.items)) {
      setBookedDetailMap(toBookedDetailMap(data.items));
    } else {
      setBookedDetailMap(takenToDetailMap(data?.taken ?? []));
    }
  }
  useEffect(() => {
    (async () => {
      try { await loadAvailability(dateKey); } catch { setBookedDetailMap({}); }
    })();
  }, [dateKey]);

  const isBooked = (court, hour) => Boolean(bookedDetailMap?.[court]?.[hour]);
  const getBookedDetail = (court, hour) => bookedDetailMap?.[court]?.[hour] || null;

  const isPicked = (court, hour) => selected.some(s => s.court === court && s.hour === hour);
  const togglePick = (court, hour) => {
    setSelected(prev => {
      const exists = prev.some(s => s.court === court && s.hour === hour);
      return exists ? prev.filter(s => !(s.court === court && s.hour === hour)) : [...prev, { court, hour }];
    });
  };

  const nowIndicator = useNowIndicator();
  const hasSelection = selected.length > 0;

  // อัปเดตสถานะ
  const applyStatus = async (status) => {
    if (!selected.length) {
      alert("กรุณาเลือกช่วงเวลาก่อน");
      return;
    }
    try {
      if (status === "cancelled" || status === "no_show") {
        const ok = confirm(`ยืนยันตั้งสถานะเป็น “${status === "cancelled" ? "ยกเลิก" : "ไม่มา"}” สำหรับช่องที่เลือก?`);
        if (!ok) return;
      }
      const res = await fetch("/api/admin/bookings/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey, selections: selected, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "update failed");
      alert("อัปเดตสถานะสำเร็จ");
      setSelected([]);
      await loadAvailability(dateKey);
    } catch (e) {
      alert(e.message || "อัปเดตสถานะไม่สำเร็จ");
    }
  };

  return (
    <div className="page">
      <style>{css}</style>

      {/* Header */}
      <header className="header"><br/>
        <div className="boxed headerRow">
          <a href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-emerald-800 font-semibold hover:bg-emerald-100 transition mb-4">
            ← กลับหน้าแรก
          </a>
        </div>
        <div className="boxed headerRow">
          <div className="brandBlock">
            <h1 className="brand"><span className="brandIcon" aria-hidden>🏸</span>จัดการสถานะการจอง (Admin)</h1>
            <div className="brandUnderline" aria-hidden />
            <p className="brandSub">Badminton • เปิดบริการ 09:00–21:00</p>
          </div>
          <div className="dayBadge fancy" title={dateKey} aria-live="polite" aria-atomic="true">
            <span className="dowPill">{formatDateThai(dateKey, { onlyDow: true })}</span>
            <div className="dateMain">
              <span className="dateBig">{formatDateThai(dateKey, { noDow: true })}</span>
              <span className="note">ตาราง “วันนี้” • อัปเดตอัตโนมัติ 00:00</span>
            </div>
          </div>
        </div><br/>
      </header>

      {/* Legend */}
      <div className="boxed legend row gap8 wrap">
        <span className="tag free">ว่าง</span>
        <span className="tag picked">ที่เลือก</span>
        <span className="tag booked">จองแล้ว/มาแล้ว</span>
        <span className="hint">คลิกช่องเพื่อเลือก แล้วกดปุ่มด้านล่างเพื่อเปลี่ยนสถานะ</span>
      </div>

      {/* ตาราง */}
      <main className="boxed">
        <div className="gridWrap">
          {nowIndicator && dateKey === todayKey && (
            <div
              className="nowLine"
              style={{ transform: `translateY(calc(var(--row-h) * ${nowIndicator.rowOffset}))` }}
              title={`ตอนนี้ประมาณ ${nowIndicator.label}`}
              aria-hidden="true"
            />
          )}

          <div className={`grid ${hasSelection ? "hasSelection" : ""}`} role="grid" aria-label="ผังการจองสนามแบดมินตัน (วันนี้เท่านั้น)">
            <div className="corner" aria-hidden="true" />
            {COURTS.map((c) => (
              <div key={`h-${c}`} className="head court"><span>Court {c}</span></div>
            ))}

            {HOURS.map((h) => (
              <React.Fragment key={`r-${h}`}>
                <div className="head time"><span className="timeChip">{fmtRange(h, h + 1)}</span></div>
                {COURTS.map((c) => {
                  const booked = isBooked(c, h);
                  const picked = isPicked(c, h);
                  const detail = booked ? getBookedDetail(c, h) : null;
                  const userLabel = detail?.user ? shortName(detail.user) : null;
                  const statusLabel = detail?.status ? statusText(detail.status) : "-";

                  const statusClass = booked && detail?.status ? `status-${detail.status}` : "";
                  const cls = `cell ${booked ? `booked ${statusClass}` : picked ? "picked" : "free"}`;
                  const pickIndex = picked ? selected.findIndex((s) => s.court === c && s.hour === h) + 1 : null;

                  return (
                    <button
                      key={`cell-${h}-${c}`}
                      className={cls}
                      title={
                        booked
                          ? `Court ${c} • ${fmtRange(h, h + 1)} • ${statusLabel} • ผู้จอง: ${userLabel ?? "-"}`
                          : `Court ${c} • ${fmtRange(h, h + 1)} • ${picked ? "ที่เลือก" : "ว่าง"}`
                      }
                      onClick={() => togglePick(c, h)}
                      aria-pressed={picked}
                      aria-label={
                        booked
                          ? `Court ${c} เวลา ${fmtRange(h, h + 1)} ไม่ว่าง ผู้จอง ${userLabel ?? "ไม่ทราบ"} สถานะ ${statusLabel}`
                          : `Court ${c} เวลา ${fmtRange(h, h + 1)} ${picked ? "ที่เลือก" : "ว่าง"}`
                      }
                    >
                      {picked && <span className="mark" aria-hidden="true">{pickIndex}</span>}
                      {picked && <span className="check" aria-hidden="true">✓</span>}

                      {/* แสดงเฉพาะชื่อผู้จอง (ไม่มีกรอบ/ชิป) */}
                      {booked && userLabel && <span className="bookedName" aria-hidden="true">{userLabel}</span>}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </main>

      {/* แถบสรุป + ปุ่มเปลี่ยนสถานะ */}
      <div className="bar" role="region" aria-label="สรุปการเลือก & เปลี่ยนสถานะ (Admin)">
        <div className="boxed row between wrap center gap8">
          <div className="row wrap gap16 info" aria-live="polite">
            <Item label="วันที่" value={`${formatDateThai(dateKey)} (${dateKey})`} />
            <Item label="จำนวนที่เลือก" value={`${selected.length} ช่อง`} />
            <Item label="สรุป" value={selected.length ? humanSummary(selected) : "-"} />
          </div>

          <div className="row gap8 actions">
            <button className="btn ghost" onClick={resetSelection}>ล้าง</button>
            <button className="btn primary" onClick={() => applyStatus("booked")}>จองแล้ว</button>
            <button className="btn ghost" onClick={() => applyStatus("checked_in")}>มาแล้ว</button>
            <button className="btn ghost" onClick={() => applyStatus("cancelled")}>ยกเลิก</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== Hooks ============== */
function useNowIndicator() {
  const [state, setState] = useState(null);
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      if (h < OPEN_HOUR || h >= CLOSE_HOUR) {
        setState(null);
        return;
      }
      const rowOffset = (h - OPEN_HOUR) + m / 60;
      const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      setState({ rowOffset, label });
    };
    update();
    const t = setInterval(update, 30 * 1000);
    return () => clearInterval(t);
  }, []);
  return state;
}

/* ============== Components & Utils ============== */
function Item({ label, value }) {
  return (
    <div className="item">
      <div className="small">{label}</div>
      <div className="big">{value}</div>
    </div>
  );
}

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmt(h) { return `${String(h).padStart(2, "0")}:00`; }
function fmtRange(startH, endH) { return `${fmt(startH)} - ${fmt(endH)}`; }
function formatDateThai(dateKey, opts = {}) {
  const DAYS = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
  const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = DAYS[dt.getDay()];
  const text = `${d} ${MONTHS[m - 1]} ${y}`;
  if (opts.onlyDow) return dow;
  if (opts.noDow) return text;
  return `${dow} ${text}`;
}
function groupByCourtAndRange(selected) {
  const byCourt = {};
  selected.slice().sort((a, b) => a.court - b.court || a.hour - b.hour).forEach(({ court, hour }) => {
    byCourt[court] = byCourt[court] || [];
    byCourt[court].push(hour);
  });
  const result = {};
  Object.keys(byCourt).forEach((court) => {
    const hours = byCourt[court];
    const ranges = [];
    let start = hours[0], prev = hours[0];
    for (let i = 1; i < hours.length; i++) {
      const h = hours[i];
      if (h === prev + 1) prev = h;
      else { ranges.push([start, prev]); start = prev = h; }
    }
    ranges.push([start, prev]);
    result[court] = ranges;
  });
  return result;
}
function humanSummary(selected) {
  const grouped = groupByCourtAndRange(selected);
  const parts = Object.keys(grouped).map((court) => {
    const txt = grouped[court].map(([a, b]) => `${fmt(a)}-${fmt(b + 1)}`).join(", ");
    return `C${court}: ${txt}`;
  });
  return parts.join(" | ");
}

/* ============== STYLES ============== */
const css = `
:root{
  --bg:#f7f8fb;
  --card:#ffffff;
  --ink:#0b0f14;
  --muted:#64748b;
  --line:#cfd5e3;
  --line-strong:#9eabc3;
  --accent:#10b981;
  --accent-ink:#064e3b;

  --free:#effcf4;
  --picked:#bff1d1;

  /* สีพื้นหลังตามสถานะ */
  --bg-booked:#fef3c7;      /* เหลืองอ่อน */
  --bg-checked:#dcfce7;     /* เขียวอ่อน */
  --bg-cancelled:#fee2e2;   /* แดงอ่อน */

  --row-h: 54px;
}
*{box-sizing:border-box}
body{
  margin:0;
  font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans Thai",sans-serif;
  color:var(--ink);
  background:linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,.92) 30%, rgba(255,255,255,0) 100%), var(--bg);
}
a{color:inherit; text-decoration:none}
.boxed{max-width:1160px; margin:0 auto; padding:0 16px}
.row{display:flex} .wrap{flex-wrap:wrap} .center{align-items:center; justify-content:center}
.between{justify-content:space-between} .gap8{gap:8px} .gap12{gap:12px} .gap16{gap:16px}

/* Header */
.header{
  position:sticky; top:0; z-index:10;
  background:color-mix(in oklab, #ffffff 88%, transparent);
  backdrop-filter:saturate(160%) blur(8px);
  border-bottom:2px solid var(--line-strong);
}
.headerRow{ display:flex; align-items:center; justify-content:space-between; gap:20px; padding:10px 0; }
.brandBlock{display:flex; flex-direction:column; gap:6px}
.brand{
  margin:0; font-size:30px; line-height:1.1; letter-spacing:.3px; font-weight:900;
  background:linear-gradient(90deg, #0f172a, #0b3a2b 30%, #0b3a2b 38%, #10b981 70%, #0f172a);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  display:flex; align-items:center; gap:8px;
}
.brandIcon{filter:drop-shadow(0 2px 8px rgba(16,185,129,.35))}
.brandUnderline{ height:5px; width:160px; border-radius:999px; background:linear-gradient(90deg, rgba(16,185,129,0), rgba(16,185,129,.85), rgba(16,185,129,0)); }
.brandSub{margin:0; color:#4b5563; font-size:13px}
.dayBadge{ display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:16px; background:#f0fdf4; border:1.5px solid var(--line-strong); }
.dowPill{ padding:6px 10px; border-radius:999px; border:1px solid #bbf7d0; background:#ecfdf5; color:#065f46; font-weight:900; font-size:13px; }
.dateMain{display:flex; flex-direction:column; line-height:1.1}
.dateBig{font-weight:900; color:#0b1220; font-size:20px}
.note{color:var(--muted); font-size:12px; margin-top:4px}

/* Legend */
.legend{margin:14px auto 0; align-items:center}
.tag{
  display:inline-flex; align-items:center; gap:8px; padding:7px 12px;
  border-radius:999px; border:1.8px solid var(--line-strong); font-size:14px; background:#fff; font-weight:800;
}
.tag::before{content:""; width:12px; height:12px; border-radius:4px; border:1.4px solid var(--line-strong); display:inline-block}
.tag.free::before{background:var(--free)}
.tag.picked::before{background:var(--picked)}
.tag.booked::before{background:repeating-linear-gradient(45deg,#e1e5ed,#e1e5ed 6px,#eef2f7 6px,#eef2f7 12px)}
.hint{color:var(--muted); font-size:13px}

/* GRID */
.gridWrap{
  position:relative; margin:16px 0 104px;
  border:2px solid var(--line-strong); border-radius:22px; background:#fff;
  overflow:auto;
}
.nowLine{
  pointer-events:none; position:sticky; top:calc(0px + 54px);
  height:0; border-top:3px dashed #10b981; filter:drop-shadow(0 0 10px rgba(16,185,129,.45));
  z-index:4; margin-left:160px;
}
.grid{
  --col-time: 170px;
  display:grid; grid-template-columns: var(--col-time) repeat(6, minmax(140px, 1fr));
  grid-auto-rows: var(--row-h); min-width: 1020px; position:relative;
}
.grid.hasSelection .cell.free{ opacity:.55; filter:saturate(.85) contrast(.95); }
.grid.hasSelection .cell.booked{ opacity:.8; }

/* Heads */
.corner{position:sticky; top:0; left:0; background:#fff; z-index:3; border-bottom:2px solid var(--line-strong); border-right:2px solid var(--line-strong)}
.head{
  position:sticky; background:linear-gradient(180deg, #ffffff, #f8fafc); z-index:2;
  border-bottom:2px solid var(--line-strong); display:flex; align-items:center; justify-content:center; font-weight:900;
}
.head.time{ left:0; justify-content:flex-start; padding-left:14px; border-right:2px solid var(--line-strong); color:#0b1220 }
.timeChip{ padding:6px 10px; border-radius:10px; background:#eefcf3; border:1px solid #bbf7d0; color:#065f46; font-weight:800; font-size:12px; }
.court{top:0; border-right:2px solid var(--line-strong); color:#0b1220}

/* Cells */
.cell{
  border-bottom:1.8px solid var(--line-strong); border-right:1.8px solid var(--line-strong);
  cursor:pointer; outline:0;
  transition: background-color .12s ease, transform .06s ease, box-shadow .12s ease, outline-color .12s ease;
  position:relative; padding:10px 12px; text-align:left;
}
.cell::after{ content:""; position:absolute; inset:6px; border-radius:10px; box-shadow: inset 0 0 0 0 rgba(16,185,129,0); transition: box-shadow .2s ease; }

.cell.free{
  background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.9)),
              repeating-linear-gradient(90deg, rgba(16,185,129,.06) 0 6px, rgba(16,185,129,0) 6px 12px);
}
.cell.picked{
  background: linear-gradient(180deg, rgba(187,247,208,1), rgba(134,239,172,.95));
  animation: pop .18s ease-out; box-shadow: 0 6px 18px rgba(16,185,129,.25);
}
.cell.picked::after{ box-shadow: inset 0 0 0 3px color-mix(in oklab, #10b981 75%, #22c55e 25%); }

/* สถานะ: สีพื้นหลังของเซลล์ */
.cell.booked{ /* ให้กดได้ */ cursor:pointer; }
.cell.booked.status-booked{ background: var(--bg-booked); }
.cell.booked.status-checked_in{ background: var(--bg-checked); }
.cell.booked.status-cancelled{ background: var(--bg-cancelled); }

/* ชื่อผู้จอง (ไม่มีกรอบ) */
.cell .bookedName{
  font-weight:900; font-size:14px; color:#0b1220;
  display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}

/* picked indicators */
.cell.picked .check { position:absolute; left:10px; bottom:8px; font-weight:900; font-size:16px; color:#10b981; text-shadow:0 1px 0 #fff; }
.cell.picked .mark { position:absolute; right:8px; top:6px; min-width:22px; height:22px; padding:0 6px; border-radius:999px;
  display:inline-flex; align-items:center; justify-content:center; font-weight:900; font-size:12px; color:#10b981; background:#ffffffaa; border:1.5px solid #10b981; }

.cell:hover{ transform: translateY(-1px); filter: brightness(0.99); }
.cell:active{ transform: translateY(0); }
.cell:focus-visible{ outline:3px solid color-mix(in oklab, #10b981 40%, #86efac 15%); outline-offset:-3px; }

@keyframes pop{ 0%{ transform:scale(.98); filter:brightness(1.02); } 100%{ transform:scale(1); } }

/* Bottom bar */
.bar{
  position:fixed; left:0; right:0; bottom:0; background:linear-gradient(180deg,#ffffff,#f9fafb);
  border-top:2px solid var(--line-strong); box-shadow:0 -8px 24px rgba(3,7,18,.08);
  z-index:20; padding:12px 0;
}
.item .small{font-size:12px; color:var(--muted)}
.item .big{font-weight:900; color:#0b1220}

.actions .btn{
  padding:12px 16px; border-radius:12px; border:2px solid var(--accent); font-weight:900; cursor:pointer;
  transition:.15s transform, .15s filter, .15s box-shadow, .15s background-color, .15s color;
}
.btn.primary{ background:var(--accent); color:#fff; box-shadow:0 12px 26px rgba(16,185,129,.28); }
.btn.primary:hover{filter:brightness(.98); transform:translateY(-1px)}
.btn.primary:active{transform:translateY(1px)}
.btn.ghost{background:#fff; color:var(--accent-ink)}
.btn.ghost:hover{background:#f0fdf4}

/* Responsive */
@media (max-width: 960px){ .grid{grid-template-columns: 150px repeat(6, 132px); min-width: 942px} }
@media (max-width: 560px){
  .brand{font-size:24px}
  .brandUnderline{width:120px; height:4px}
  .dayBadge{padding:10px 12px}
  .dateBig{font-size:18px}
  .grid{grid-template-columns: 140px repeat(6, 120px); min-width: 860px}
}
`;
