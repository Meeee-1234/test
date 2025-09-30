"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function MotionCard({ src, alt }) {
  return (
    <motion.div
      className="snap-center flex-shrink-0 w-64 h-96 rounded-xl overflow-hidden shadow-lg cursor-pointer"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
    >
      <Image src={src} alt={alt} width={256} height={384} className="object-cover w-full h-full" />
    </motion.div>
  );
}
