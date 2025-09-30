
// Admin Dashboard

"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [deletingIds, setDeletingIds] = useState([]);
  const [search, setSearch] = useState("");

  const fetchAll = async () => {
    // ไม่ต้องส่ง header อะไรทั้งนั้น ให้ API ฝั่งเซิร์ฟทำ guard จากคุกกี้
    const [uRes, bRes] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/bookings", { cache: "no-store" }),
    ]);

    if (uRes.status === 401 || uRes.status === 403 || bRes.status === 401 || bRes.status === 403) {
      router.push("/"); // ไม่ใช่แอดมิน
      return;
    }

    const uJson = uRes.ok ? await uRes.json() : { users: [] };
    const bJson = bRes.ok ? await bRes.json() : { bookings: [] };

    const sortedUsers = (uJson.users || []).slice().sort((a, b) => a.id - b.id);
    setUsers(sortedUsers);

    setBookings(
      (bJson.bookings || []).map((bk) => ({
        id: bk.id,
        username: bk.username || "-",
        email: bk.email || "-",
        date: new Date(bk.booking_date).toLocaleDateString("th-TH"),
        court: `คอร์ต ${bk.court}`,
        time: `${String(bk.hour).padStart(2, "0")}:00 - ${String(bk.hour + 1).padStart(2, "0")}:00`,
        status:
          bk.status === "booked"
            ? "จองแล้ว"
            : bk.status === "checked_in"
            ? "มาแล้ว"
            : bk.status === "cancelled"
            ? "ยกเลิก"
            : "ไม่มา",
        created_at: new Date(bk.created_at).toLocaleString("th-TH"),
      }))
    );
  };

  useEffect(() => {
    (async () => {
      try {
        // เช็คสิทธิ์จากเซิร์ฟเวอร์ (อ่านจากคุกกี้ HttpOnly)
        const meRes = await fetch("/api/me", { cache: "no-store" });
        const me = meRes.ok ? await meRes.json() : { user: null };
        if (!me?.user?.is_admin) {
          router.push("/"); // ไม่ใช่แอดมินเด้งกลับ
          return;
        }
        await fetchAll();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleSoftDeleteUser = async (id) => {
    const ok = confirm("ยืนยันลบผู้ใช้งานนี้แบบ Soft Delete?");
    if (!ok) return;

    try {
      setDeletingIds((s) => [...s, id]);
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "ลบไม่สำเร็จ");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      console.error(e);
      alert("มีข้อผิดพลาด");
    } finally {
      setDeletingIds((s) => s.filter((x) => x !== id));
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" }); // เคลียร์คุกกี้ HttpOnly
      // (localStorage ไม่ได้ใช้สำหรับ auth แล้ว แต่ล้างได้ถ้ามี)
      try { localStorage.removeItem("auth:user"); } catch {}
    } finally {
      router.push("/login");
    }
  };

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) => {
      const hay = [
        String(b.id),
        b.username,
        b.email,
        b.date,
        b.court,
        b.time,
        b.status,
        b.created_at,
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [bookings, search]);

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
          <div className="flex items-center justify-between mb-4">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-emerald-800 font-semibold hover:bg-emerald-100 transition"
            >
              ← กลับหน้าแรก
            </a>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 font-semibold hover:bg-slate-50 transition"
              style={{backgroundcolor: "red"}}
              title="ออกจากระบบ"
            >
              ออกจากระบบ
            </button>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-emerald-900 text-center">
            Admin Dashboard
          </h1>
          <p className="text-slate-600 mt-2 max-w-2xl mx-auto text-center">
            ดูรายชื่อผู้ใช้งาน และประวัติการจองสนามทั้งหมด
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-6xl px-5 pb-14">
        <div className="grid grid-cols-1 gap-10">
          {/* Users */}
          <div>
            <h2 className="text-2xl font-bold text-emerald-900 mb-4 text-center">รายชื่อผู้ใช้งาน</h2>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-emerald-50 text-emerald-800">
                  <tr>
                    <th className="px-4 py-3">ID ↑</th>
                    <th className="px-4 py-3">ชื่อผู้ใช้</th>
                    <th className="px-4 py-3">อีเมล</th>
                    <th className="px-4 py-3">เบอร์โทร</th>
                    <th className="px-4 py-3">สมัครเมื่อ</th>
                    <th className="px-4 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">{u.id}</td>
                      <td className="px-4 py-3">{u.username || "-"}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{u.phone || "-"}</td>
                      <td className="px-4 py-3">
                        {u.created_at ? new Date(u.created_at).toLocaleString("th-TH") : "-"}
                      </td>
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
                  {users.length === 0 && (
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

          {/* Divider */}
          <hr className="border-t border-slate-200 my-2" />

          {/* All Bookings */}
          <div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
              <h2 className="text-2xl font-bold text-emerald-900">ประวัติการจองทั้งหมด</h2>
              <div className="w-full md:w-80">
                <label className="block text-sm font-semibold text-slate-600 mb-1" htmlFor="searchBookings">
                  ค้นหาในประวัติ (ผู้จอง/อีเมล/วันที่/คอร์ท/เวลา/สถานะ)
                </label>
                <input
                  id="searchBookings"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="พิมพ์คำค้น เช่น 2025, คอร์ต 3, จองแล้ว, name@email.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-emerald-50 text-emerald-800">
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
                          className={`px-3 py-1 rounded-full text-xs font-semibold
                            ${b.status === "มาแล้ว" ? "bg-emerald-100 text-emerald-700" : ""}
                            ${b.status === "ยกเลิก" ? "bg-red-100 text-red-700" : ""}
                            ${b.status === "ไม่มา" ? "bg-yellow-100 text-yellow-700" : ""}
                            ${b.status === "จองแล้ว" ? "bg-blue-100 text-blue-700" : ""}
                          `}
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

            <p className="text-xs text-slate-400 mt-3">
              * สถานะที่รองรับ: จองแล้ว (booked), มาแล้ว (checked_in), ยกเลิก (cancelled), ไม่มา (no_show)
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
