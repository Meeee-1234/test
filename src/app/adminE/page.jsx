"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** ============== CONFIG ============== */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21; // ช่องสุดท้าย 20:00–21:00
const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const COURTS = [1, 2, 3, 4, 5, 6];

/** ============== HELPERS ============== */
function toDateKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function formatDateThai(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleString("th-TH", { dateStyle: "medium" });
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toCSV(rows) {
  if (!rows?.length) return "";
  const heads = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [heads.map(esc).join(","), ...rows.map((r) => heads.map((h) => esc(r[h])).join(","))].join("\n");
}

/** ============== PAGE ============== */
export default function AdminDashboardPage() {
  const router = useRouter();

  // Auth & loading
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Data
  const [users, setUsers] = useState([]);
  const [bookingsAll, setBookingsAll] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Date helpers
  const today = startOfToday();

  // ===== AUTH CHECK =====
  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/me", { cache: "no-store" });
        const me = meRes.ok ? await meRes.json() : { user: null };
        if (!me?.user?.is_admin) {
          router.push("/");
          return;
        }
        setAuthChecked(true);
        await refreshAll();
      } catch (_e) {
        router.push("/");
        return;
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // ===== DATA LOADERS =====
  async function fetchUsers() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.status === 401 || res.status === 403) throw new Error("unauthorized");
    const data = res.ok ? await res.json() : { users: [] };
    const sorted = (data.users || []).slice().sort((a, b) => a.id - b.id);
    setUsers(sorted);
  }

  // ดึง bookings ทุกหน้าเพื่อคำนวณรวม
  async function fetchAllBookingsPaginated({ q = "", limit = 200 } = {}) {
    let page = 1;
    let total = 0;
    const acc = [];
    while (true) {
      const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
      const res = await fetch(`/api/admin/bookings?${params.toString()}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) throw new Error("unauthorized");
      const data = res.ok ? await res.json() : { bookings: [], totalRows: 0 };
      const rows = data.rows || data.bookings || [];
      const mapped = rows.map((bk) => ({
        id: bk.id,
        user_id: bk.user_id ?? bk.uid ?? null,
        username: bk.username || bk.user || "-",
        email: bk.email || "-",
        booking_date: bk.booking_date ? new Date(bk.booking_date) : (bk.date ? new Date(bk.date) : null),
        dateKey: bk.booking_date ? toDateKey(bk.booking_date) : (bk.date ? toDateKey(bk.date) : null),
        court: typeof bk.court === "number" ? bk.court : (parseInt(bk.court, 10) || null),
        timeHour: bk.hour != null ? Number(bk.hour) : null,
        status: bk.status || "booked",
        created_at: bk.created_at ? new Date(bk.created_at) : (bk.created_at_text ? new Date(bk.created_at_text) : null),
      }));
      acc.push(...mapped);
      total = data.totalRows ?? data.total ?? acc.length;
      if (acc.length >= total || rows.length === 0) break;
      page += 1;
      if (page > 50) break; // กันลูป
    }
    return acc;
  }

  async function refreshAll() {
    setErrorMsg("");
    setFetching(true);
    try {
      await Promise.all([
        fetchUsers(),
        (async () => {
          const all = await fetchAllBookingsPaginated();
          setBookingsAll(all);
        })(),
      ]);
    } catch (e) {
      setErrorMsg(e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setFetching(false);
    }
  }

  // ===== DERIVED STATS (KPI/Chart) =====
  const {
    totalUsers,
    totalBookings,
    bookingsToday,
    occupancyTodayPct,
    statusCounts,
    topCourts,
    hourStatsToday,
  } = useMemo(() => {
    const totalUsers = users.length;
    const totalBookings = bookingsAll.length;

    const todayKey = toDateKey(today);
    const todayBookings = bookingsAll.filter((b) => b.dateKey === todayKey);

    const slotsPerDay = (CLOSE_HOUR - OPEN_HOUR) * COURTS.length;
    const occupiedSlots = todayBookings.length;
    const occupancyTodayPct = slotsPerDay > 0 ? Math.round((occupiedSlots / slotsPerDay) * 100) : 0;

    const statusCounts = bookingsAll.reduce(
      (acc, b) => {
        const st = b.status;
        acc.total++;
        if (st === "booked") acc.booked++;
        else if (st === "checked_in") acc.checked_in++;
        else if (st === "cancelled") acc.cancelled++;
        else if (st === "no_show") acc.no_show++;
        else acc.other++;
        return acc;
      },
      { total: 0, booked: 0, checked_in: 0, cancelled: 0, no_show: 0, other: 0 }
    );

    const courtCount = new Map();
    bookingsAll.forEach((b) => {
      if (b.court != null) courtCount.set(b.court, (courtCount.get(b.court) || 0) + 1);
    });
    const topCourts = Array.from(courtCount.entries())
      .map(([court, count]) => ({ court, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const hourStatsToday = {};
    HOURS.forEach((h) => (hourStatsToday[h] = 0));
    todayBookings.forEach((b) => {
      if (b.timeHour != null && hourStatsToday[b.timeHour] != null) hourStatsToday[b.timeHour] += 1;
    });

    return {
      totalUsers,
      totalBookings,
      bookingsToday: todayBookings.length,
      occupancyTodayPct,
      statusCounts,
      topCourts,
      hourStatsToday,
    };
  }, [users, bookingsAll]);

  // ===== EXPORT “วันนี้” =====
  function exportTodayCSV() {
    const todayKey = toDateKey(today);
    const rows = bookingsAll
      .filter((b) => b.dateKey === todayKey)
      .map((b) => ({
        id: b.id,
        user: b.username,
        email: b.email,
        date: formatDateThai(b.booking_date),
        court: b.court != null ? `คอร์ต ${b.court}` : "-",
        time: b.timeHour != null ? `${pad2(b.timeHour)}:00 - ${pad2(b.timeHour + 1)}:00` : "-",
        status:
          b.status === "booked"
            ? "จองแล้ว"
            : b.status === "checked_in"
            ? "มาแล้ว"
            : b.status === "cancelled"
            ? "ยกเลิก"
            : b.status === "no_show"
            ? "ไม่มา"
            : b.status || "-",
        created_at: b.created_at ? b.created_at.toLocaleString("th-TH") : "-",
      }));
    const csv = toCSV(rows);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings_today_${toDateKey(today)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===== การจองทั้งหมด: กรองเดือน + เรียงคอลัมน์ =====
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [sortField, setSortField] = useState("created_at"); // created_at | booking_date | timeHour | court | status | username | id
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  function sameYearMonth(dateObj, ymStr) {
    if (!dateObj || !ymStr) return true;
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const [yy, mm] = ymStr.split("-");
    return String(y) === String(yy) && m === String(mm);
  }

  const filteredAndSorted = useMemo(() => {
    const arr = bookingsAll.filter((b) => !monthFilter || sameYearMonth(b.booking_date, monthFilter));

    const val = (b) => {
      switch (sortField) {
        case "booking_date": return b.booking_date?.getTime?.() || 0;
        case "timeHour": return b.timeHour ?? -1;
        case "court": return b.court ?? -1;
        case "status": return b.status || "";
        case "username": return (b.username || "").toLowerCase();
        case "id": return b.id ?? 0;
        case "created_at":
        default: return b.created_at?.getTime?.() || 0;
      }
    };

    arr.sort((a, b) => {
      const A = val(a), B = val(b);
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      // ไทเบรกด้วย created_at desc เพื่อให้คงความสดใหม่
      const ca = a.created_at?.getTime?.() || 0;
      const cb = b.created_at?.getTime?.() || 0;
      return cb - ca;
    });
    return arr;
  }, [bookingsAll, monthFilter, sortField, sortDir]);

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortHeader({ field, children }) {
    const active = sortField === field;
    return (
      <button
        onClick={() => toggleSort(field)}
        className={`inline-flex items-center gap-1 font-semibold ${
          active ? "text-emerald-700" : "text-emerald-900"
        }`}
        title="คลิกเพื่อเรียง"
      >
        {children}
        <span className="text-emerald-700 text-[10px] leading-none">
          {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    );
  }

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(1100px_520px_at_85%_-10%,rgba(16,185,129,.14),transparent_60%),radial-gradient(900px_480px_at_-10%_20%,rgba(16,185,129,.10),transparent_60%)]">
        <div className="animate-pulse text-gray-500">Loading admin dashboard…</div>
      </div>
    );
  }
  if (!authChecked) return null;

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
      try {
        localStorage.removeItem("auth:user");
      } catch {}
    } finally {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1100px_520px_at_85%_-10%,rgba(16,185,129,.14),transparent_60%),radial-gradient(900px_480px_at_-10%_20%,rgba(16,185,129,.10),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-5 py-8 md:py-12">
          <div className="flex items-center justify-between gap-3 mb-4">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-emerald-800 font-semibold hover:bg-emerald-100 transition"
            >
              ← กลับหน้าแรก
            </a>
            <div className="flex items-center gap-2">
              <a
                href="/adminE/management"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                ไปหน้า Admin Management
              </a>
              <button
                onClick={exportTodayCSV}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Export วันนี้ (CSV)
              </button>
              <button
                onClick={refreshAll}
                disabled={fetching}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 font-semibold shadow-sm transition"
              >
                {fetching ? "กำลังรีเฟรช…" : "รีเฟรชข้อมูล"}
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 font-semibold hover:bg-slate-50 transition"
                style={{ backgroundColor: "#fee2e2" }}
                title="ออกจากระบบ"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-emerald-900">Admin Dashboard</h1>
              <p className="text-slate-600 mt-1">ภาพรวมการใช้งานระบบจองสนามแบดมินตัน</p>
            </div>
            <div className="text-sm text-slate-600">
              วันนี้: <span className="font-semibold">{formatDateThai(today)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-6xl px-5 pb-16 space-y-10">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard title="ผู้ใช้ทั้งหมด" value={totalUsers} hint="นับจากตาราง users" />
          <KpiCard title="ยอดจองทั้งหมด" value={totalBookings} hint="รวมทุกสถานะ" />
          <KpiCard title="ยอดจองวันนี้" value={bookingsToday} hint="นับตามวันที่ (วันนี้)" />
          <KpiCard title="การใช้สนามวันนี้" value={`${occupancyTodayPct}%`} hint="จองแล้ว / ช่องทั้งหมด" />
        </div>

        {/* STATUS BREAKDOWN + TOP COURTS + (ตัวอย่าง) FILTER เดือนแสดงผลข้อความ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <h3 className="text-lg font-bold text-emerald-900 mb-3">สถานะการจอง (ทั้งหมด)</h3>
            <StatusRow label="จองแล้ว (booked)" count={statusCounts.booked} total={statusCounts.total} badgeClass="bg-blue-100 text-blue-700" />
            <StatusRow label="มาแล้ว (checked_in)" count={statusCounts.checked_in} total={statusCounts.total} badgeClass="bg-emerald-100 text-emerald-700" />
            <StatusRow label="ยกเลิก (cancelled)" count={statusCounts.cancelled} total={statusCounts.total} badgeClass="bg-red-100 text-red-700" />
            <StatusRow label="ไม่มา (no_show)" count={statusCounts.no_show} total={statusCounts.total} badgeClass="bg-yellow-100 text-yellow-700" />
            {statusCounts.other > 0 && (
              <StatusRow label="อื่น ๆ" count={statusCounts.other} total={statusCounts.total} badgeClass="bg-neutral-200 text-neutral-700" />
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <h3 className="text-lg font-bold text-emerald-900 mb-3">คอร์ตที่มีการใช้งานสูงสุด</h3>
            <div className="space-y-2">
              {topCourts.length === 0 && <p className="text-slate-500">ยังไม่มีข้อมูลการจอง</p>}
              {topCourts.map((c) => (
                <div key={c.court} className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <div className="font-semibold">คอร์ต {c.court}</div>
                  <div className="text-slate-600">{c.count} ครั้ง</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">* คำนวณจากจำนวนรายการจองทั้งหมด</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <h3 className="text-lg font-bold text-emerald-900 mb-3">ตัวกรอง (แสดงผลเดือนที่เลือก)</h3>
            <div className="flex items-center gap-3">
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <span className="text-sm text-slate-500">ใช้กรองตาราง “การจองทั้งหมด” ด้านล่าง</span>
            </div>
          </div>
        </div>

        {/* HOURLY CHART (TODAY) */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-emerald-900">ยอดจองรายชั่วโมง (วันนี้)</h3>
            <span className="text-sm text-slate-600">ช่วงเปิดบริการ {pad2(OPEN_HOUR)}:00–{pad2(CLOSE_HOUR)}:00</span>
          </div>
          <HourlyBarChart data={HOURS.map((h) => ({ hour: h, value: (hourStatsToday[h] || 0) }))} />
          <p className="text-xs text-slate-400 mt-2">* 1 รายการ = 1 ช่องเวลา 1 ชั่วโมง</p>
        </div>

        {/* การจองทั้งหมด (แทน “การจองล่าสุด”) */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-3 gap-3">
            <h3 className="text-lg font-bold text-emerald-900">การจองทั้งหมด</h3>
            <div className="flex items-center gap-2 text-sm">
              <label className="text-slate-600">เลือกเดือน:</label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-emerald-50 text-emerald-800">
                <tr>
                  <th className="px-4 py-3"><SortHeader field="id">ID</SortHeader></th>
                  <th className="px-4 py-3"><SortHeader field="username">ผู้จอง</SortHeader></th>
                  <th className="px-4 py-3">อีเมล</th>
                  <th className="px-4 py-3"><SortHeader field="booking_date">วันที่</SortHeader></th>
                  <th className="px-4 py-3"><SortHeader field="court">คอร์ต</SortHeader></th>
                  <th className="px-4 py-3"><SortHeader field="timeHour">เวลา</SortHeader></th>
                  <th className="px-4 py-3"><SortHeader field="status">สถานะ</SortHeader></th>
                  <th className="px-4 py-3"><SortHeader field="created_at">บันทึกเมื่อ</SortHeader></th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">{b.id}</td>
                    <td className="px-4 py-3">{b.username}</td>
                    <td className="px-4 py-3">{b.email}</td>
                    <td className="px-4 py-3">{b.booking_date ? formatDateThai(b.booking_date) : "-"}</td>
                    <td className="px-4 py-3">{b.court != null ? `คอร์ต ${b.court}` : "-"}</td>
                    <td className="px-4 py-3">
                      {b.timeHour != null ? `${pad2(b.timeHour)}:00 - ${pad2(b.timeHour + 1)}:00` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          b.status === "checked_in"
                            ? "bg-emerald-100 text-emerald-700"
                            : b.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : b.status === "no_show"
                            ? "bg-yellow-100 text-yellow-700"
                            : b.status === "booked"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-neutral-200 text-neutral-700"
                        }`}
                      >
                        {b.status === "booked" ? "จองแล้ว"
                          : b.status === "checked_in" ? "มาแล้ว"
                          : b.status === "cancelled" ? "ยกเลิก"
                          : b.status === "no_show" ? "ไม่มา"
                          : b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{b.created_at ? b.created_at.toLocaleString("th-TH") : "-"}</td>
                  </tr>
                ))}
                {filteredAndSorted.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      ไม่มีรายการในเดือนที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3">
            ข้อผิดพลาด: {errorMsg}
          </div>
        )}
      </section>
    </div>
  );
}

/** ============== SUB-COMPONENTS ============== */
function KpiCard({ title, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-3xl font-extrabold text-emerald-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

function StatusRow({ label, count, total, badgeClass }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between">
        <div className={`px-2 py-1 rounded ${badgeClass}`}>{label}</div>
        <div className="text-sm text-slate-600">{count} ({pct}%)</div>
      </div>
      <div className="h-2 rounded bg-slate-100 mt-2">
        <div className="h-2 rounded bg-emerald-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HourlyBarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 28;
  const gap = 12;
  const chartW = data.length * barW + (data.length - 1) * gap + 40;
  const chartH = 160;
  const paddingBottom = 24;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={chartW} height={chartH + paddingBottom} role="img" aria-label="Bar chart">
        <line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke="#e5e7eb" strokeWidth="1" />
        {data.map((d, i) => {
          const h = Math.round((d.value / max) * (chartH - 10));
          const x = i * (barW + gap) + 20;
          const y = chartH - h;
          return (
            <g key={d.hour}>
              <rect x={x} y={y} width={barW} height={h} rx="8" className="fill-emerald-400" />
              <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize="10" fill="#475569">
                {String(d.hour).padStart(2, "0")}
              </text>
              {d.value > 0 && (
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#0f766e">
                  {d.value}
                </text>
              )}
            </g>
          );
        })}
        <text x="0" y="12" fontSize="12" fill="#334155">จำนวนการจอง</text>
        <text x={chartW - 100} y={chartH + 20} fontSize="11" fill="#64748b">ชั่วโมง (24h)</text>
      </svg>
    </div>
  );
}
