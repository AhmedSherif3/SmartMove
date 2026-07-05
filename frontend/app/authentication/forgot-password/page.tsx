
"use client";
import Link from "next/link";
import InputField from "../components/inputField";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { forgotPassword } from "../../../lib/auth/api";
import { useState } from "react";
import AuthPageHeader from "../components/AuthPageHeader";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [success, setSuccess] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotFormValues) => {
    try {
      await forgotPassword(values.email);
      setSuccess("Reset link sent. Check your email.");
      setTimeout(() => router.push("/authentication/enter-otp?email=" + encodeURIComponent(values.email)), 1200);
    } catch (err: unknown) {
      console.error("Forgot password error:", err);
      let message = "Failed to send reset link. Try again.";
      const axiosError = err as { response?: { data?: unknown }; message?: string };
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        if (typeof data === "string") {
          message = data;
        } else if (typeof data === "object" && data !== null) {
          const dataObj = data as { detail?: string; error?: string; non_field_errors?: string[] };
          message = dataObj.detail || dataObj.error || (Array.isArray(dataObj.non_field_errors) ? dataObj.non_field_errors.join(" ") : null) || message;
        }
      } else if (axiosError.message) {
        message = axiosError.message;
      }
      setError("root", { message });
    }
  };

  return (
    <section className="flex justify-center px-8 py-12 md:px-12">
      <div className="w-full max-w-md">
        <AuthPageHeader
          title="Forgot password"
          subtitle="Enter your email and we'll send a reset link."
        />

        <form
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          onSubmit={handleSubmit(onSubmit)}
        >
          <InputField
            title="Email"
            placeholder="name@example.com"
            type="email"
            {...register("email")}
            error={errors.email?.message}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-blue-700 hover:shadow-md active:translate-y-0 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>

          {errors.root && (
            <div className="mt-4 text-sm text-red-600 dark:text-red-400">{errors.root.message}</div>
          )}
          {success && (
            <div className="mt-4 text-sm text-green-600 dark:text-green-400">{success}</div>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-slate-400 dark:text-slate-500">
          Remembered your password?{" "}
          <Link href="/authentication/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Back to sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
