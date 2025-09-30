"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

export default function MotionSection({ user = null }) {
  // ✅ แปลงให้เป็น boolean แน่ๆ กันเคส "1"/"0", 1/0, "admin"/"true"
  const isAdmin = useMemo(() => {
    const v = user?.is_admin ?? user?.role ?? null;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v === 1;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return s === "1" || s === "true" || s === "admin";
    }
    return false;
  }, [user]);

  return (
    <section className="relative bg-emerald-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            จองคอร์ทแบดมินตัน <br /> ง่าย รวดเร็ว ออนไลน์
          </h1>
          <p className="mt-4 text-gray-200 text-lg">
            เลือกวัน เวลา และสนามที่คุณต้องการผ่านเว็บไซต์
            พร้อมโปรโมชั่นพิเศษสำหรับผู้จองล่วงหน้า
          </p>

          <div className="mt-6 flex gap-4">
            <Link
              href={isAdmin ? "/adminCourt" : "/Booking"} // ⬅️ ใช้ /booking ตัวเล็ก
              className="bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-xl font-semibold shadow"
              title={isAdmin ? "ไปหน้าแอดมิน" : "ไปหน้า Booking"}
            >
              จองคอร์ทตอนนี้
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="flex justify-center"
        >
          <div className="rounded-full overflow-hidden w-72 h-57 border-8 border-white/20 shadow-lg">
            <Image
              src="/image/logo.png"
              alt="สนามแบด"
              width={500}
              height={500}
              className="relative bg-white text-emerald-1000"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
