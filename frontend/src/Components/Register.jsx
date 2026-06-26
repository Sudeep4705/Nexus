import React from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useContext } from "react";
import { AuthContext } from "../Context/AuthContext";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

export default function Signup() {
  const {setUser} =  useContext(AuthContext)
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const submitForm = async (data) => {
    try {
      const res = await axios.post("https://nexus-foq8.onrender.com/auth/signup", data, {
        withCredentials: true,
      });
      setUser(res.data.user)
      toast.success(res.data.message || "Account created successfully!");
      navigate("/")
    } catch (error) {
      const msg = error.response?.data?.message || "Something went wrong";
      toast.error(msg);
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-800 px-4">
      <form
        onSubmit={handleSubmit(submitForm)}
        className="w-full max-w-md bg-neutral-900/80 backdrop-blur-sm rounded-3xl px-8 py-12 shadow-2xl border border-neutral-700/50"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Create Account
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Join and start chatting with your AI assistant
          </p>
        </div>

        {/* Name Field (optional) */}
        <div className="mb-5">
          <label className="block text-gray-300 text-sm font-medium mb-1.5">
            Full Name <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="John Doe"
            className={`w-full border rounded-xl px-4 py-3 text-sm text-white bg-neutral-800/50 placeholder:text-gray-500 outline-none transition-all duration-200 ${
              errors.name
                ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/50"
                : "border-neutral-700 focus:border-green-500 focus:ring-1 focus:ring-green-500/50"
            }`}
            {...register("name", {
              minLength: {
                value: 2,
                message: "Name must be at least 2 characters",
              },
            })}
          />
          {errors.name && (
            <p className="text-red-400 text-xs mt-1.5 font-medium">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="mb-5">
          <label className="block text-gray-300 text-sm font-medium mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            className={`w-full border rounded-xl px-4 py-3 text-sm text-white bg-neutral-800/50 placeholder:text-gray-500 outline-none transition-all duration-200 ${
              errors.email
                ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/50"
                : "border-neutral-700 focus:border-green-500 focus:ring-1 focus:ring-green-500/50"
            }`}
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: EMAIL_REGEX,
                message: "Please enter a valid email address",
              },
            })}
          />
          {errors.email && (
            <p className="text-red-400 text-xs mt-1.5 font-medium">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-medium mb-1.5">
            Password
          </label>
          <input
            type="password"
            placeholder="Min 8 characters with letter & number"
            className={`w-full border rounded-xl px-4 py-3 text-sm text-white bg-neutral-800/50 placeholder:text-gray-500 outline-none transition-all duration-200 ${
              errors.password
                ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/50"
                : "border-neutral-700 focus:border-green-500 focus:ring-1 focus:ring-green-500/50"
            }`}
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters",
              },
              pattern: {
                value: PASSWORD_REGEX,
                message: "Must contain at least one letter and one number",
              },
            })}
          />
          {errors.password && (
            <p className="text-red-400 text-xs mt-1.5 font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-semibold py-3.5 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating...
            </span>
          ) : (
            "Create Account"
          )}
        </button>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-green-400 hover:text-green-300 font-medium transition-colors">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}