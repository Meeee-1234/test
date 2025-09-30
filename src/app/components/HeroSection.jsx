"use client";

import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section className="bg-blue-600 text-white py-20 px-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-5xl font-bold max-w-4xl mx-auto"
      >
        ยินดีต้อนรับสู่เว็บไซต์จองคอร์ดแบดมินตัน
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="mt-4 text-lg max-w-2xl mx-auto"
      >
        ระบบจองคอร์ดแบดมินตันออนไลน์ที่สะดวกและรวดเร็วที่สุด
      </motion.p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mt-8 bg-white text-blue-600 font-semibold px-8 py-3 rounded-xl shadow-lg hover:bg-gray-100 transition"
      >
        เริ่มจองเลย
      </motion.button>
    </section>
  );
}
