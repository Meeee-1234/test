import Image from "next/image";
import { getServerUser } from "../utils/serverUser"; 

import MotionCard from "./components/MotionCard";
import MotionSection from "./components/MotionSection";


const styles = {
  page: {
    scrollBehavior: "smooth",
    background: "#f6f7f8",
    color: "#0f172a",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Thai", sans-serif',
  },
};

// ✅ ย้าย baseCss มาไว้ก่อน return เช่นกัน
const baseCss = `
  :root {
    --bg: #f6f7f8;
    --card: #ffffff;
    --ink: #0f172a;
    --muted: #64748b;
    --accent: #10b981;
    --accent-ink: #064e3b;
    --line: #e5e7eb;

    --radius: 18px;
    --shadow: 0 10px 30px rgba(2, 6, 12, 0.06);
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
  }
  a { color: inherit; text-decoration: none; }

  header.sticky {
    position: sticky;
    top: 0;
    z-index: 10;
    background: linear-gradient(90deg, rgba(255, 255, 255, .98), rgba(240, 253, 244, .98));
    backdrop-filter: saturate(180%) blur(8px);
    border-bottom: 1px solid var(--line);
  }

  .btn {
    display: inline-block;
    padding: 12px 18px;
    border-radius: 14px;
    font-weight: 700;
    border: 1px solid var(--accent);
    transition: 0.25s transform, 0.25s box-shadow, 0.25s background-color, 0.25s color;
  }

  .btn.primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 10px 24px rgba(16, 185, 129, 0.25);
  }

  .btn.ghost {
    background: #fff;
    color: var(--accent-ink);
  }

  .btn.tiny {
    padding: 8px 12px;
    border-radius: 12px;
  }
`;



export default async function HomePage() {

  const user = await getServerUser(); // null ถ้าไม่ล็อกอิน

  return (
    <div style={styles.page}>
      <style>{baseCss}</style>

      <header className="sticky w-full">
        <div className="flex justify-between items-center px-6 py-3">

          <Image src="/image/logo.png" alt="Logo" width={85} height={85}
                className="object-contain" />

          <div>
            {!user ? (
              <a href="/login" className="btn tiny ghost">Login</a>
            ) : (
              <a
                href={user.is_admin ? "/adminE" : "/profile"}
                className="btn tiny"
                title={user.is_admin ? "ไปหน้าแอดมิน" : "ไปหน้าโปรไฟล์"}
              >
                {user.username}
              </a>
            )}
          </div>
        </div>
      </header>

      <MotionSection user={user} />

      
       {/* Featured Courts Carousel */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12">ภาพสนาม</h2>
      
        <div className="overflow-x-auto flex gap-6 snap-x snap-mandatory">
          {[
            "/image/B.jpg",
            "/image/B5.jpg",
            "/image/B3.jpg",
            "/image/B4.jpg",
            "/image/B6.jpg",
            "/image/B1.jpg", 
            "/image/B2.jpg",
          ].map((img, i) => (
              <MotionCard key={i} src={img} alt={`สนามแบดมินตัน ${i + 1}`} />
          ))}
        </div>
      </section>
      
      
            {/* Terms & Pricing */}
            <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
                      <section>
                <h2 className="text-xl font-bold text-green-700 mb-4">💰 อัตราค่าบริการ</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="p-3 text-left">ประเภทบริการ</th>
                        <th className="p-3 text-center">วันธรรมดา (จ.–ศ.)</th>
                        <th className="p-3 text-center">วันหยุด (ส.–อา./นักขัตฤกษ์)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="p-3">คอร์ตเดี่ยว (ต่อชั่วโมง)</td>
                        <td className="p-3 text-center">120 บาท</td>
                        <td className="p-3 text-center">150 บาท</td>
                      </tr>
                      <tr>
                        <td className="p-3">คูปอง 10 ชั่วโมง</td>
                        <td className="p-3 text-center">1,100 บาท</td>
                        <td className="p-3 text-center">1,300 บาท</td>
                      </tr>
                      <tr>
                        <td className="p-3">เช่ารองเท้า</td>
                        <td className="p-3 text-center">20 บาท/คู่</td>
                        <td className="p-3 text-center">20 บาท/คู่</td>
                      </tr>
                      <tr>
                        <td className="p-3">เช่าไม้แบด</td>
                        <td className="p-3 text-center">50 บาท/ไม้</td>
                        <td className="p-3 text-center">50 บาท/ไม้</td>
                      </tr>
                      <tr>
                        <td className="p-3">ลูกขนไก่ (จำหน่าย)</td>
                        <td className="p-3 text-center">เริ่มต้น 100 บาท</td>
                        <td className="p-3 text-center">เริ่มต้น 100 บาท</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
      
              <section>
                <h2 className="text-xl font-bold text-green-700 mb-4">📝 เงื่อนไขการใช้สนาม</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold">1. เวลาเปิด–ปิด</h3>
                    <ul className="list-disc ml-6">
                      <li>เปิดทุกวัน เวลา <b>09:00 – 21:00 น.</b></li>
                      <li>กรุณาออกจากสนามภายในเวลา <b>22:00 น.</b></li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold">2. การจองสนาม</h3>
                    <ul className="list-disc ml-6">
                      <li>สามารถจองล่วงหน้าได้</li>
                      <li>มาสายเกิน <b>15 นาที</b> สิทธิ์จะถูกตัด</li>
                      <li>ยกเลิกต้องแจ้ง <b>1 ชั่วโมง</b> ก่อน</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold">3. การแต่งกายและอุปกรณ์</h3>
                    <ul className="list-disc ml-6">
                      <li>ต้องใส่ <b>รองเท้าแบดมินตัน</b></li>
                      <li>เช่า 20 บาท/คู่</li>
                      <li>ห้ามนำรองเท้าเปียกหรือสกปรกเข้าภายในสนาม</li>
                      <li>ต้องเตรียมไม้แบดและลูกขนไก่เอง</li>
                      <li>เช่าไม้แบด 50 บาท/ไม้ | ลูกขนไก่เริ่มต้น 100 บาท</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold">4. มารยาทการใช้สนาม</h3>
                    <ul className="list-disc ml-6">
                      <li>ห้ามนำอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า)</li>
                      <li>ห้ามสูบบุหรี่หรือดื่มแอลกอฮอล์</li>
                      <li>เก็บขยะและอุปกรณ์ส่วนตัวทุกครั้ง</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold">5. ความปลอดภัย</h3>
                    <ul className="list-disc ml-6">
                      <li>บาดเจ็บแจ้งเจ้าหน้าที่ทันที</li>
                      <li>รับผิดชอบทรัพย์สินและอุปกรณ์เอง</li>
                    </ul>
                  </div>
                </div>
              </section>
      
            </main>
      
            {/* Contact Section */}
            <section className="bg-emerald-50 py-20 px-6">
              <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-6">ติดต่อเรา</h2>
                  <p>📞 โทร: 081-234-5678</p>
                  <p>💬 ไลน์: @universebad</p>
                  <p>📍 ที่อยู่: 123 ถนนสปอร์ต ซิตี้</p>
                  <p className="text-gray-600 mt-2">เปิดทุกวัน 09:00 – 21:00</p>
                </div>
                <div className="rounded-xl overflow-hidden shadow-md">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18..."
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                  ></iframe>
                </div>
              </div>
            </section>
      
            {/* Footer */}
            <footer className="bg-emerald-900 text-white text-center py-6">
              © {new Date().getFullYear()} Universe Badminton. All rights reserved.
            </footer>
          </div>
        )
      ;
      }
      