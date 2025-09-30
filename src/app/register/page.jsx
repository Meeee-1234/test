
// Register

"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function RegisterPage() {

  const [formData, setFormData] = useState({ username: "", email: "", phone: "", password: "", confirm: "" });
  const router = useRouter();
  const [msg, setMsg] = useState();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if(formData.password !== formData.confirm) {
      return setMsg("Password and confirm do not match");
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    if (res.ok) {
      router.push("/login");
    } else {
      setMsg(data.error || "Register Failed!!");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-gray-100 to-green-50">
      <div className="mx-auto w-full max-w-lg rounded-3xl bg-white shadow-xl border border-gray-200 p-8">
        
        <div className="flex justify-center mb-6">
          <Image src="/image/logo.png" alt="Logo" width={120} height={120}
                 className="object-contain drop-shadow-md"/>
        </div>

        <h1 className="text-center text-3xl font-bold text-gray-900 mb-6">Create an Account</h1>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {msg && (
            <p className="text-center text-red-600 font-medium">{msg}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" name="username" placeholder="Enter your username"
                   value={formData.username} onChange={handleChange}
                   className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 p-3 outline-none transition" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" placeholder="Enter your email"
                   value={formData.email} onChange={handleChange}
                   className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 p-3 outline-none transition"required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" name="phone" placeholder="Enter your phone number"
                   value={formData.phone} onChange={handleChange}
                   className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 p-3 outline-none transition" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" name="password" placeholder="Enter your password"
                   value={formData.password} onChange={handleChange}
                   className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 p-3 outline-none transition" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type="password" name="confirm" placeholder="Enter your confirm password"
                   value={formData.confirm} onChange={handleChange}
                   className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 p-3 outline-none transition" required />
          </div>

          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold shadow-md transition transform hover:scale-[1.01]">
            Register </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600"> Already have an account?{" "}
          <a href="/login" className="font-medium text-green-600 hover:text-green-700">Login here </a>
        </p>

      </div>
    </div>
  );
}
