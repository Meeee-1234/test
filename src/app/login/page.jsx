
// Login

"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Login() {

  const [formData, setFormData] = useState({ email: "", password: "" });
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.ok) {
        router.push("/");
      } else {
        alert(data.error || "Login failed");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-gray-100 to-green-50">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-xl border border-gray-200 p-8">

        <div className="flex justify-center mb-6">
          <Image src="/image/logo.png" alt="Logo" width={120} height={120}
                 className="object-contain drop-shadow-md"/>
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">Login</h2>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" placeholder="Enter your email"
                   value={formData.email} onChange={handleChange}
                   className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 p-3 outline-none transition" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" name="password" placeholder="Enter your password"
                   value={formData.password} onChange={handleChange}
                   className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 p-3 outline-none transition" required />
          </div>

          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold shadow-md transition transform hover:scale-[1.01]">
            Login</button>

        </form>

        <p className="mt-6 text-center text-sm text-gray-600"> Don’t have an account?{" "}
          <a href="/register" className="font-medium text-green-600 hover:text-green-700">Register here</a>
        </p>

      </div>
    </div>
  );
}
