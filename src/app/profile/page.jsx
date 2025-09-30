
// Profile

"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ username: "", email: "", phone: "" });
  const [bookings, setBookings] = useState([]);

  const fileRef = useRef(null);

  const handleChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handlePickFile = () => fileRef.current?.click();

  const handleUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("avatar", f);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUser((u) => ({ ...u, avatar_url: data.avatar_url }));
        setMessage("อัปโหลดรูปเรียบร้อย ✓");
      } else {
        alert(data.error || "Upload failed");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // ดึงโปรไฟล์ (จากคุกกี้)
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          setForm({
            username: data.user.username || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
          });
        }
        // ดึงประวัติการจอง (จากคุกกี้)
        const res2 = await fetch("/api/profile/bookings", { cache: "no-store" });
        const data2 = await res2.json();
        if (res2.ok) {
          setBookings(
            (data2.bookings || []).map((b) => ({
              id: b.id,
              date: new Date(b.booking_date).toLocaleDateString("th-TH"),
              court: `คอร์ต ${b.court}`,
              time: `${String(b.hour).padStart(2, "0")}:00 - ${String(b.hour + 1).padStart(2, "0")}:00`,
              status:
                b.status === "booked"
                  ? "จองแล้ว"
                  : b.status === "checked_in"
                  ? "มาแล้ว"
                  : b.status === "cancelled"
                  ? "ยกเลิก"
                  : "ไม่มา",
            }))
          );
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          phone: form.phone,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setForm({
          username: data.user.username,
          email: data.user.email,
          phone: data.user.phone,
        });
        // ให้หน้าอื่นที่ยังพึ่ง localStorage sync ชื่อได้ (ถ้ามี)
        const stored = JSON.parse(localStorage.getItem("auth:user") || "null") || {};
        localStorage.setItem(
          "auth:user",
          JSON.stringify({
            ...stored,
            username: data.user.username,
            email: data.user.email,
            phone: data.user.phone,
          })
        );
        window.dispatchEvent(new Event("auth:changed"));
        setMessage("บันทึกข้อมูลแล้ว ✓");
      } else {
        setMessage(data.error || "บันทึกล้มเหลว");
      }
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    // เผื่อหน้าบางส่วนยังอ้าง localStorage
    localStorage.removeItem("auth:user");
    window.dispatchEvent(new Event("auth:changed"));
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(1100px_520px_at_85%_-10%,rgba(16,185,129,.14),transparent_60%),radial-gradient(900px_480px_at_-10%_20%,rgba(16,185,129,.10),transparent_60%)]">
        <div className="animate-pulse text-gray-500">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1100px_520px_at_85%_-10%,rgba(16,185,129,.14),transparent_60%),radial-gradient(900px_480px_at_-10%_20%,rgba(16,185,129,.10),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-emerald-800 font-semibold hover:bg-emerald-100 transition mb-4"
          >
            ← กลับหน้าแรก
          </a>

          <h1 className="text-3xl md:text-4xl font-extrabold text-emerald-900 text-center">
            Your Profile
          </h1>
          <p className="text-slate-600 mt-2 max-w-2xl mx-auto text-center">
            จัดการข้อมูลบัญชีของคุณ และอัปเดตเบอร์ติดต่อเพื่อการจองที่รวดเร็วขึ้น
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-6xl px-5 pb-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* LEFT: SUMMARY CARD */}
          <aside className="md:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-4">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    className="h-14 w-14 rounded-full object-cover border"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold">
                    {form.username?.[0]?.toUpperCase() || form.email?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div>
                  <div className="text-xl font-bold text-slate-900">
                    {form.username || form.email}
                  </div>
                  <div className="text-sm text-slate-500">{form.email}</div>
                </div>
              </div>

              {/* Upload avatar (ไม่เปลี่ยนสไตล์เดิม แค่เพิ่มปุ่ม) */}
              <div className="mt-4">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleUpload}
                />
                <button
                  onClick={handlePickFile}
                  disabled={uploading}
                  className="inline-flex justify-center rounded-xl bg-white border border-emerald-300 text-emerald-800 px-4 py-2 font-semibold hover:bg-emerald-50 transition"
                >
                  {uploading ? "Uploading..." : "เปลี่ยนรูป"}
                </button>
              </div>

              <div className="mt-6 divide-y divide-slate-200 text-sm">
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-medium text-slate-800">{form.phone || "-"}</span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-500">Member since</span>
                  <span className="font-medium text-slate-800">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={logout}
                  className="inline-flex justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 font-semibold shadow-md transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* RIGHT: EDIT FORM */}
          <main className="md:col-span-3">
            <form
              onSubmit={handleSave}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6"
            >
              <h2 className="text-xl font-bold text-emerald-900 mb-4">แก้ไขข้อมูล</h2>

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 p-3 outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    readOnly
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 text-slate-600 p-3 outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">* เปลี่ยนอีเมลควรทำผ่านการยืนยันตัวตน</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 p-3 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-3 font-semibold shadow-md transition"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                {message && (
                  <span
                    className={`text-sm ${
                      message.includes("✓") ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {message}
                  </span>
                )}
              </div>
            </form>
          </main>
        </div>
      </section>

      {/* Divider */}
      <hr className="border-t border-slate-200 my-10 mx-auto max-w-6xl" /><br/>

      {/* Booking History */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="text-2xl font-bold text-emerald-900 mb-6 text-center">
          ประวัติการจองสนาม
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-emerald-50 text-emerald-800">
              <tr>
                <th className="px-4 py-3">วันที่จอง</th>
                <th className="px-4 py-3">คอร์ตที่</th>
                <th className="px-4 py-3">เวลา</th>
                <th className="px-4 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">{b.date}</td>
                  <td className="px-4 py-3">{b.court}</td>
                  <td className="px-4 py-3">{b.time}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${b.status === "มาแล้ว" ? "bg-emerald-100 text-emerald-700" : ""}
                        ${b.status === "ยกเลิก" ? "bg-red-100 text-red-700" : ""}
                        ${b.status === "ไม่มา" ? "bg-yellow-100 text-yellow-700" : ""}
                      `}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}

              {bookings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    ยังไม่มีประวัติการจอง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
