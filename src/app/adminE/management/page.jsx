"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin Management — app/admin/management/page.jsx
 * API ที่ใช้:
 * - GET  /api/me
 * - GET  /api/admin/users
 * - DELETE /api/admin/users/:id      (soft delete)
 * - GET  /api/admin/bookings?q=&page=&limit=
 */

function toCSV(rows) {
  if (!rows?.length) return "";
  const heads = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [heads.map(esc).join(","), ...rows.map((r) => heads.map((h) => esc(r[h])).join(","))].join("\n");
}

function th(d) {
  return new Date(d).toLocaleString("th-TH");
}

export default function AdminManagementPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Users
  const [users, setUsers] = useState([]);
  const [userSort, setUserSort] = useState({ key: "id", dir: "asc" });
  const [deletingIds, setDeletingIds] = useState([]);

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalRows, setTotalRows] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));

  const debounceRef = useRef(null);
  useEffect(() => {
    // debounce 300ms
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  async function fetchUsers() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.status === 401 || res.status === 403) throw new Error("unauthorized");
    const data = res.ok ? await res.json() : { users: [] };
    setUsers(data.users ?? []);
  }

  async function fetchBookings() {
    const params = new URLSearchParams({
      q: search,
      page: String(page),
      limit: String(limit),
    });
    const res = await fetch(`/api/admin/bookings?${params.toString()}`, { cache: "no-store" });
    if (res.status === 401 || res.status === 403) throw new Error("unauthorized");
    const data = res.ok ? await res.json() : { bookings: [], totalRows: 0 };
    const rows = data.rows || data.bookings || [];
    setBookings(
      rows.map((bk) => ({
        id: bk.id,
        username: bk.username || bk.user || "-",
        email: bk.email || "-",
        date: bk.booking_date
          ? new Date(bk.booking_date).toLocaleDateString("th-TH")
          : bk.date || "-",
        court: bk.court ? `คอร์ต ${bk.court}` : bk.court_name || "-",
        time:
          bk.hour != null
            ? `${String(bk.hour).padStart(2, "0")}:00 - ${String(bk.hour + 1).padStart(2, "0")}:00`
            : bk.time || "-",
        status:
          bk.status === "booked"
            ? "จองแล้ว"
            : bk.status === "checked_in"
            ? "มาแล้ว"
            : bk.status === "cancelled"
            ? "ยกเลิก"
            : bk.status === "no_show"
            ? "ไม่มา"
            : bk.status || "-",
        created_at: bk.created_at ? th(bk.created_at) : bk.created_at_text || "-",
      }))
    );
    setTotalRows(data.totalRows ?? data.total ?? rows.length);
  }

  async function fetchAll() {
    await Promise.all([fetchUsers(), fetchBookings()]);
  }

  // Check auth once
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
        await fetchAll();
      } catch {
        router.push("/");
        return;
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // reload bookings when search/page/limit changes
  useEffect(() => {
    if (!authChecked) return;
    fetchBookings().catch(() => {});
  }, [authChecked, search, page, limit]);

  // Sort users client-side
  const sortedUsers = useMemo(() => {
    const arr = [...users];
    const { key, dir } = userSort;
    arr.sort((a, b) => {
      const av = a?.[key] ?? "";
      const bv = b?.[key] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return dir === "asc" ? av - bv : bv - av;
      }
      return dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [users, userSort]);

  function toggleUserSort(key) {
    setUserSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      return { key, dir: s.dir === "asc" ? "desc" : "asc" };
    });
  }

  const filteredBookings = useMemo(() => {
    // server ค้นหาแล้ว แต่กันเหนียวให้ client กรองซ้ำ
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) =>
      [b.id, b.username, b.email, b.date, b.court, b.time, b.status, b.created_at]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [bookings, search]);

  async function handleSoftDeleteUser(id) {
    if (!confirm("ยืนยันลบผู้ใช้งานนี้แบบ Soft Delete?")) return;
    try {
      setDeletingIds((s) => [...s, id]);
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "ลบไม่สำเร็จ");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } finally {
      setDeletingIds((s) => s.filter((x) => x !== id));
    }
  }

  function exportBookingsCSV() {
    const csv = toCSV(
      filteredBookings.map((b) => ({
        id: b.id,
        user: b.username,
        email: b.email,
        date: b.date,
        court: b.court,
        time: b.time,
        status: b.status,
        created_at: b.created_at,
      }))
    );
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(1100px_520px_at_85%_-10%,rgba(16,185,129,.14),transparent_60%),radial-gradient(900px_480px_at_-10%_20%,rgba(16,185,129,.10),transparent_60%)]">
        <div className="animate-pulse text-gray-500">Loading admin…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1100px_520px_at_85%_-10%,rgba(16,185,129,.14),transparent_60%),radial-gradient(900px_480px_at_-10%_20%,rgba(16,185,129,.10),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
          <div className="flex items-center justify-between mb-4 gap-2">
            
            <div className="flex items-center gap-2">
              <a
                href="/adminE"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                ไปหน้า Dashboard
              </a>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-emerald-900 text-center">Admin Management</h1>
          <p className="text-slate-600 mt-2 max-w-2xl mx-auto text-center">
            หน้าจัดการผู้ใช้และประวัติการจอง (แยกจาก Dashboard)
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-6xl px-5 pb-14 space-y-10">
        {/* USERS */}
        <div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-4 text-center">รายชื่อผู้ใช้งาน</h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-emerald-50 text-emerald-800 sticky top-0">
                <tr>
                  <ThButton label="ID" sortKey="id" sort={userSort} onSort={toggleUserSort} />
                  <ThButton label="ชื่อผู้ใช้" sortKey="username" sort={userSort} onSort={toggleUserSort} />
                  <ThButton label="อีเมล" sortKey="email" sort={userSort} onSort={toggleUserSort} />
                  <th className="px-4 py-3">เบอร์โทร</th>
                  <ThButton label="สมัครเมื่อ" sortKey="created_at" sort={userSort} onSort={toggleUserSort} />
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">{u.id}</td>
                    <td className="px-4 py-3">{u.username || u.name || "-"}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.phone || "-"}</td>
                    <td className="px-4 py-3">{u.created_at ? th(u.created_at) : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={deletingIds.includes(u.id)}
                        onClick={() => handleSoftDeleteUser(u.id)}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-3 py-1.5 font-semibold shadow-sm transition"
                        title="Soft delete ผู้ใช้งาน"
                      >
                        {deletingIds.includes(u.id) ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
                {sortedUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีผู้ใช้งาน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DIVIDER */}
        <hr className="border-t border-slate-200 my-2" />

        {/* BOOKINGS */}
        <div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold text-emerald-900">ประวัติการจองทั้งหมด</h2>
            <div className="w-full md:w-[32rem] flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-600 mb-1" htmlFor="searchBookings">
                  ค้นหา (ผู้จอง/อีเมล/วันที่/คอร์ต/เวลา/สถานะ)
                </label>
                <input
                  id="searchBookings"
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setPage(1);
                    setSearchInput(e.target.value);
                  }}
                  placeholder="เช่น 2025, คอร์ต 3, จองแล้ว, name@email.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <button
                onClick={exportBookingsCSV}
                className="inline-flex items-center h-[42px] mt-[22px] rounded-xl border border-slate-300 bg-white px-4 text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-emerald-50 text-emerald-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">ผู้จอง</th>
                  <th className="px-4 py-3">อีเมล</th>
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3">คอร์ต</th>
                  <th className="px-4 py-3">เวลา</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3">บันทึกเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">{b.id}</td>
                    <td className="px-4 py-3">{b.username}</td>
                    <td className="px-4 py-3">{b.email}</td>
                    <td className="px-4 py-3">{b.date}</td>
                    <td className="px-4 py-3">{b.court}</td>
                    <td className="px-4 py-3">{b.time}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          b.status === "มาแล้ว"
                            ? "bg-emerald-100 text-emerald-700"
                            : b.status === "ยกเลิก"
                            ? "bg-red-100 text-red-700"
                            : b.status === "ไม่มา"
                            ? "bg-yellow-100 text-yellow-700"
                            : b.status === "จองแล้ว"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-neutral-200 text-neutral-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{b.created_at}</td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      ไม่พบรายการที่ตรงกับ "{search}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
            <div className="text-sm text-slate-600">
              ทั้งหมด {totalRows} รายการ • หน้า {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg border" onClick={() => setPage(1)} disabled={page <= 1}>
                หน้าแรก
              </button>
              <button
                className="px-3 py-1.5 rounded-lg border"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ก่อนหน้า
              </button>
              <button
                className="px-3 py-1.5 rounded-lg border"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                ถัดไป
              </button>
              <button
                className="px-3 py-1.5 rounded-lg border"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
              >
                หน้าสุดท้าย
              </button>
              <select
                className="border rounded-xl px-2 py-1"
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(Number(e.target.value));
                }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}/หน้า
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-3">
            * สถานะที่รองรับ: จองแล้ว (booked), มาแล้ว (checked_in), ยกเลิก (cancelled), ไม่มา (no_show)
          </p>
        </div>
      </section>
    </div>
  );
}

/* ===== Sub Components ===== */
function ThButton({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 ${active ? "text-emerald-800 font-semibold" : ""}`}
        title="คลิกเพื่อเรียง"
      >
        {label}
        <span className="text-xs opacity-70">{active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}
