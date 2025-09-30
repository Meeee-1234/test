"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ============== CONFIG ============== */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21; // ช่องสุดท้าย 20:00–21:00
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];

// === helpers: แปลง taken -> { courtId: [hours] }
const normalizeTakenToMap = (taken = []) => {
  const map = {};
  for (const key of taken) {
    const [c, h] = String(key).split(":").map(Number);
    if (!Number.isFinite(c) || !Number.isFinite(h)) continue;
    (map[c] ??= []).push(h);
  }
  return map; // { 1:[9,10], 2:[13], ... }
};

// ⭐ added — แปลง items (ถ้ามี) ให้เป็น set ของช่อง "court:hour" ที่เป็นของเราเอง
const myKeysFromItems = (items = [], meId) => {
  if (!meId) return new Set();
  const set = new Set();
  for (const it of items) {
    if (it?.user?.id && it.user.id === meId) {
      set.add(`${it.court}:${it.hour}`);
    }
  }
  return set;
};

/* ============== PAGE ============== */
export default function BookingPage() {
  // วันปัจจุบัน (ล็อกเป็น "วันนี้")
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [dateKey, setDateKey] = useState(todayKey);
  const router = useRouter();

  // สถานะจองของวันนั้น
  const [bookedForDay, setBookedForDay] = useState({}); // { courtId: [hours] }

  // ⭐ added — ช่องที่ "ฉัน" จองไว้ของวันนั้น (รูปแบบ set ของ "court:hour")
  const [myBookedSet, setMyBookedSet] = useState(new Set());

  // ช่องที่ผู้ใช้เลือก
  const [selected, setSelected] = useState([]); // [{ court, hour }]

  const resetSelection = () => setSelected([]);

  // เปลี่ยนเป็น “วันนี้” อัตโนมัติทุกเที่ยงคืน
  useEffect(() => {
    const updateToToday = () => {
      const nowKey = toDateKey(new Date());
      setDateKey((prev) => (prev !== nowKey ? nowKey : prev));
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

  // โหลดสถานะการจองของ “วันนี้”
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/availability?date=${encodeURIComponent(dateKey)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "load failed");

        // ตารางรวมทั้งหมด
        setBookedForDay(normalizeTakenToMap(data.taken || []));

        // ⭐ added — หาว่าช่องไหนเป็นของเราเอง
        // 1) พยายามดู user id ของเรา
        let meId = null;
        try {
          const meRes = await fetch("/api/me", { cache: "no-store" });
          if (meRes.ok) {
            const me = await meRes.json();
            meId = me?.user?.id ?? null;
          }
        } catch {}

        // 2) ถ้ามี items จาก availability + meId -> หา my keys จาก items ได้เลย
        if (Array.isArray(data?.items) && meId) {
          setMyBookedSet(myKeysFromItems(data.items, meId));
        } else {
          // 3) ถ้าไม่มี items หรือไม่รู้ meId -> ลองเรียก endpoint เฉพาะของเรา
          //    ให้ /api/my-bookings?date=YYYY-MM-DD คืน [{court,hour}, ...]
          try {
            const mineRes = await fetch(`/api/my-bookings?date=${encodeURIComponent(dateKey)}`, { cache: "no-store" });
            if (mineRes.ok) {
              const mine = await mineRes.json();
              const set = new Set((mine?.slots || []).map(({ court, hour }) => `${court}:${hour}`));
              setMyBookedSet(set);
            } else {
              setMyBookedSet(new Set());
            }
          } catch {
            setMyBookedSet(new Set());
          }
        }
      } catch {
        setBookedForDay({});
        setMyBookedSet(new Set());
      }
    })();
  }, [dateKey]);

  const isBooked = (court, hour) => {
    const arr = bookedForDay?.[court];
    return Array.isArray(arr) && arr.includes(hour);
  };

  // ⭐ added — ช่องนี้เป็นของเราเองไหม
  const isMine = (court, hour) => myBookedSet.has(`${court}:${hour}`);

  const isPicked = (court, hour) => selected.some((s) => s.court === court && s.hour === hour);

  const togglePick = (court, hour) => {
    if (isBooked(court, hour)) return;
    setSelected((prev) => {
      const exists = prev.some((s) => s.court === court && s.hour === hour);
      return exists ? prev.filter((s) => !(s.court === court && s.hour === hour)) : [...prev, { court, hour }];
    });
  };

  // แถบ “เวลาปัจจุบัน”
  const nowIndicator = useNowIndicator();

  // ส่งเมื่อกดจอง
  const onSubmit = async () => {
    if (!selected.length) {
      alert("กรุณาเลือกช่วงเวลาก่อน");
      return;
    }
    try {
      for (const { court, hour } of selected) {
        const r = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: dateKey, court, hour }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (r.status === 401) { alert("กรุณาเข้าสู่ระบบ"); return; }
          throw new Error(j.error || "booking failed");
        }
      }

      alert("จองสำเร็จ");
      setSelected([]);
      // reload ตาราง + ช่องของเรา
      const res = await fetch(`/api/availability?date=${encodeURIComponent(dateKey)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBookedForDay(normalizeTakenToMap(data.taken || []));
      }
      // รีเฟรชสีม่วงของเรา
      try {
        const mineRes = await fetch(`/api/my-bookings?date=${encodeURIComponent(dateKey)}`, { cache: "no-store" });
        if (mineRes.ok) {
          const mine = await mineRes.json();
          const set = new Set((mine?.slots || []).map(({ court, hour }) => `${court}:${hour}`));
          setMyBookedSet(set);
        }
      } catch {}
    } catch (e) {
      alert(e.message || "ไม่สามารถจองได้");
    }
  };

  return (
    <div className="page">
      <style>{css}</style>
      
      {/* Header — Brand + Day badge (glass) */}
      <header className="header"><br/>
        <div className="boxed headerRow">
          <a href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-emerald-800 font-semibold hover:bg-emerald-100 transition mb-4">
            ← กลับหน้าแรก
          </a>
        </div>
        <div className="boxed headerRow">
          <div className="brandBlock">
            <h1 className="brand">
              <span className="brandIcon" aria-hidden>🏸</span>
              จองสนามแบดมินตัน
            </h1>
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
        <span className="tag booked">จองแล้ว</span>
        <span className="tag mine">ของฉัน</span> {/* ⭐ added legend */}
        <span className="hint">คลิกเพื่อเลือก/ยกเลิก • Enter/Space เพื่อเลือกด้วยคีย์บอร์ด</span>
      </div>

      {/* ตาราง */}
      <main className="boxed">
        <div className="gridWrap">
          {/* แถบเวลาปัจจุบัน (ถ้าวันนี้และอยู่ในช่วงชั่วโมงทำการ) */}
          {nowIndicator && dateKey === todayKey && (
            <div
              className="nowLine"
              style={{ transform: `translateY(calc(var(--row-h) * ${nowIndicator.rowOffset}))` }}
              title={`ตอนนี้ประมาณ ${nowIndicator.label}`}
              aria-hidden="true"
            />
          )}

          <div className="grid" role="grid" aria-label="ผังการจองสนามแบดมินตัน (วันนี้เท่านั้น)">
            <div className="corner" aria-hidden="true" />
            {COURTS.map((c) => (
              <div key={`h-${c}`} className="head court">
                <span>Court {c}</span>
              </div>
            ))}

            {HOURS.map((h) => (
              <React.Fragment key={`r-${h}`}>
                <div className="head time">
                  <span className="timeChip">{fmtRange(h, h + 1)}</span>
                </div>
                {COURTS.map((c) => {
                  const booked = isBooked(c, h);
                  const picked = isPicked(c, h);
                  const mine = isMine(c, h); // ⭐ added
                  const cls = `cell ${booked ? "booked" : picked ? "picked" : "free"} ${mine ? "mine" : ""}`; // ⭐ added
                  return (
                    <button
                      key={`cell-${h}-${c}`}
                      className={cls}
                      title={`Court ${c} • ${fmtRange(h, h + 1)} • ${mine ? "จองโดยคุณ" : booked ? "จองแล้ว" : picked ? "ที่เลือก" : "ว่าง"}`}
                      onClick={() => togglePick(c, h)}
                      disabled={booked} // ของตัวเองก็ยังถือว่า "จองแล้ว" เลยกดเพิ่มไม่ได้ในหน้า user
                      aria-pressed={picked}
                      aria-label={`Court ${c} เวลา ${fmtRange(h, h + 1)} ${mine ? "จองโดยคุณ" : booked ? "จองแล้ว" : picked ? "ที่เลือก" : "ว่าง"}`}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </main>

      {/* แถบสรุป */}
      <div className="bar" role="region" aria-label="สรุปการจอง">
        <div className="boxed row between wrap center gap8">
          <div className="row wrap gap16 info">
            <Item label="วันที่" value={`${formatDateThai(dateKey)} (${dateKey})`} />
            <Item label="จำนวนที่เลือก" value={`${selected.length} ช่อง`} />
            <Item label="สรุป" value={selected.length ? humanSummary(selected) : "-"} />
          </div>
          
          <div className="row gap8 actions">
            <button className="btn ghost" onClick={resetSelection}>ล้าง</button>
            <button className="btn primary" onClick={onSubmit}>ยืนยันการจอง</button>
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
      const rowOffset = (h - OPEN_HOUR) + m / 60; // แถว + เศษนาที
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
  selected
    .slice()
    .sort((a, b) => a.court - b.court || a.hour - b.hour)
    .forEach(({ court, hour }) => {
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

/* ============== STYLES (เพิ่ม .mine สีม่วง) ============== */
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
  --booked:#e9edf4;

  /* ⭐ added: สีม่วงของ "ของฉัน" */
  --mine:#dcfce7; /* purple-100 */

  --radius:16px;
  --shadow:0 10px 26px rgba(3, 7, 18, .08);

  --bg-grad:
    radial-gradient(1100px 520px at 85% -10%, rgba(16,185,129,.12), transparent 60%),
    radial-gradient(900px 480px at -10% 20%, rgba(16,185,129,.10), transparent 60%);

  --row-h: 54px; /* สูงแถว (ใช้กับเส้นเวลาปัจจุบัน) */
}
*{box-sizing:border-box}
body{
  margin:0;
  font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans Thai",sans-serif;
  color:var(--ink);
  background:linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,.92) 30%, rgba(255,255,255,0) 100%), var(--bg-grad), var(--bg);
}
a{color:inherit; text-decoration:none}
.boxed{max-width:1160px; margin:0 auto; padding:0 16px}
.row{display:flex} .wrap{flex-wrap:wrap} .center{align-items:center; justify-content:center}
.between{justify-content:space-between} .gap8{gap:8px} .gap12{gap:12px} .gap16{gap:16px}

/* ===== Header ===== */
.header{
  position:sticky; top:0; z-index:10;
  background:color-mix(in oklab, #ffffff 88%, transparent);
  backdrop-filter:saturate(160%) blur(8px);
  border-bottom:2px solid var(--line-strong);
}
.headerRow{
  display:flex; align-items:center; justify-content:space-between; gap:20px; padding:10px 0;
}

/* Brand */
.brandBlock{display:flex; flex-direction:column; gap:6px}
.brand{
  margin:0; font-size:30px; line-height:1.1; letter-spacing:.3px; font-weight:900;
  background:linear-gradient(90deg, #0f172a, #0b3a2b 30%, #0b3a2b 38%, #10b981 70%, #0f172a);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  display:flex; align-items:center; gap:8px;
}
.brandIcon{filter:drop-shadow(0 2px 8px rgba(16,185,129,.35))}
.brandUnderline{
  height:5px; width:160px; border-radius:999px;
  background:linear-gradient(90deg, rgba(16,185,129,0), rgba(16,185,129,.85), rgba(16,185,129,0));
  box-shadow:0 0 20px rgba(16,185,129,.55), inset 0 0 7px rgba(16,185,129,.45);
}
.brandSub{margin:0; color:#4b5563; font-size:13px}

/* Day badge */
.dayBadge{
  display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:16px;
  background:linear-gradient(135deg, rgba(240,253,244,.9), rgba(255,255,255,.9));
  border:1.5px solid var(--line-strong);
  box-shadow:inset 0 0 0 1px #d1fae5, 0 10px 26px rgba(16,185,129,.14);
}
.dayBadge.fancy{ position:relative; }
.dowPill{
  display:inline-flex; align-items:center; justify-content:center;
  padding:6px 10px; border-radius:999px; border:1px solid #bbf7d0;
  background:#ecfdf5; color:#065f46; font-weight:900; font-size:13px; white-space:nowrap;
}
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
.tag.mine::before{background:var(--mine)} /* ⭐ added */
.hint{color:var(--muted); font-size:13px}

/* ===== GRID WRAP ===== */
.gridWrap{
  position:relative;
  margin:16px 0 104px;
  border:2px solid var(--line-strong); border-radius:22px;
  background:
    linear-gradient(180deg, rgba(16,185,129,.06), rgba(16,185,129,0)) top/100% 120px no-repeat,
    var(--card);
  box-shadow:var(--shadow);
  overflow:auto;
}

/* “เส้นเวลาปัจจุบัน” */
.nowLine{
  pointer-events:none;
  position:sticky; top:calc(0px + 54px);
  height:0; border-top:3px dashed color-mix(in oklab, var(--accent) 70%, #16a34a 30%);
  filter:drop-shadow(0 0 10px rgba(16,185,129,.45));
  z-index:4; margin-left:160px;
}

/* ===== GRID ===== */
.grid{
  --col-time: 170px;
  display:grid;
  grid-template-columns: var(--col-time) repeat(6, minmax(140px, 1fr));
  grid-auto-rows: var(--row-h);
  min-width: 1020px;
  position:relative;
}

/* หัวแถว/คอลัมน์ */
.corner{position:sticky; top:0; left:0; background:var(--card); z-index:3; border-bottom:2px solid var(--line-strong); border-right:2px solid var(--line-strong)}
.head{
  position:sticky; background:linear-gradient(180deg, #ffffff, #f8fafc); z-index:2;
  border-bottom:2px solid var(--line-strong); display:flex; align-items:center; justify-content:center; font-weight:900;
}
.head.time{
  left:0; justify-content:flex-start; padding-left:14px;
  border-right:2px solid var(--line-strong); color:#0b1220
}
.timeChip{
  display:inline-block; padding:6px 10px; border-radius:10px;
  background:#eefcf3; border:1px solid #bbf7d0; color:#065f46; font-weight:800; font-size:12px;
}
.court{top:0; border-right:2px solid var(--line-strong); color:#0b1220}
.court span{transform:translateY(1px)}

/* เซลล์ */
.cell{
  border-bottom:1.8px solid var(--line-strong);
  border-right:1.8px solid var(--line-strong);
  cursor:pointer; outline:0;
  transition: background-color .12s ease, transform .06s ease, box-shadow .12s ease, outline-color .12s ease;
  position:relative;
}
.cell::after{
  content:""; position:absolute; inset:6px; border-radius:10px;
  box-shadow: inset 0 0 0 0 rgba(16,185,129,0);
  transition: box-shadow .2s ease;
}
.cell.free{
  background:
    linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.8)),
    repeating-linear-gradient(90deg, rgba(16,185,129,.06) 0 6px, rgba(16,185,129,0) 6px 12px);
}
.cell.picked{
  background:
    linear-gradient(180deg, rgba(187,247,208,.85), rgba(134,239,172,.85));
}
.cell.picked::after{
  box-shadow: inset 0 0 0 2.5px color-mix(in oklab, var(--accent) 70%, #86efac 30%);
}
.cell.booked{
  background:
    repeating-linear-gradient(45deg, #e6e9ef, #e6e9ef 6px, #f3f4f6 6px, #f3f4f6 12px);
  cursor:not-allowed; color:#6b7280; filter:saturate(.9);
}

/* ⭐ added — ของฉันให้พื้นหลังม่วง */
.cell.mine {
  background: var(--mine) !important;
  /* ลบเส้นกรอบออก */
  box-shadow: none !important;
}
  
/* hover/focus */
.cell:hover:not(:disabled):not(.booked){
  transform: translateY(-1px);
  filter: brightness(0.99);
}
.cell:focus-visible:not(.booked){
  outline:3px solid color-mix(in oklab, var(--accent) 40%, #86efac 15%);
  outline-offset:-3px;
}

/* แถบสรุป */
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
.btn.primary{
  background:var(--accent); color:#fff;
  box-shadow:0 12px 26px rgba(16,185,129,.28);
}
.btn.primary:hover{filter:brightness(.98); transform:translateY(-1px)}
.btn.primary:active{transform:translateY(1px)}
.btn.ghost{background:#fff; color:#064e3b}
.btn.ghost:hover{background:#f0fdf4}

/* Responsive */
@media (max-width: 960px){
  .grid{grid-template-columns: 150px repeat(6, 132px); min-width: 942px}
}
@media (max-width: 560px){
  .brand{font-size:24px}
  .brandUnderline{width:120px; height:4px}
  .dayBadge{padding:10px 12px}
  .dateBig{font-size:18px}
  .grid{grid-template-columns: 140px repeat(6, 120px); min-width: 860px}
}
`;
