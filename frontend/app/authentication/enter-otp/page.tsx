
"use client";
import InputField from "../components/inputField";

import AuthPageHeader from "../components/AuthPageHeader";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { verifyForgotOtp } from "../../../lib/auth/api";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

const otpSchema = z.object({
  code: z.string().length(6, "OTP must be 6 digits."),
});

type OtpFormValues = z.infer<typeof otpSchema>;

function EnterOtpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const handleResend = async () => {
    if (timeLeft > 0) return;
    try {
      // Mocking resend or calling forgotPassword as requested in plan
      // await forgotPassword(email); 
      setSuccess("A new code has been sent to " + email);
      setTimeLeft(60);
    } catch (err: unknown) {
      console.error("Resend OTP error:", err);
      let message = "Failed to resend OTP. Please try again later.";
      const axiosError = err as { response?: { data?: unknown }; message?: string };
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        if (typeof data === "string") {
          message = data;
        } else if (typeof data === "object" && data !== null) {
          message = (data as { detail?: string; error?: string }).detail || (data as { detail?: string; error?: string }).error || message;
        }
      } else if (axiosError.message) {
        message = axiosError.message;
      }
      setError("root", { message });
    }
  };

  const onSubmit = async (values: OtpFormValues) => {
    try {
      await verifyForgotOtp(email, values.code);
      setSuccess("OTP verified. Proceed to reset password.");
      setTimeout(() => router.push("/authentication/reset-password?email=" + encodeURIComponent(email) + "&code=" + values.code), 1200);
    } catch (err: unknown) {
      console.error("Verify OTP error:", err);
      let message = "Invalid OTP. Try again.";
      const axiosError = err as { response?: { data?: unknown }; message?: string };
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        if (typeof data === "string") {
          message = data;
        } else if (typeof data === "object" && data !== null) {
          message = (data as { detail?: string; error?: string }).detail || (data as { detail?: string; error?: string }).error || message;
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
          title="Verify OTP"
          subtitle="Enter the 6-digit code sent to your email."
        />

        <form
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          onSubmit={handleSubmit(onSubmit)}
        >
          <InputField
            title="One-time password"
            placeholder="Enter 6-digit code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            helperText="Code expires in 10 minutes."
            {...register("code")}
            error={errors.code?.message}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-blue-700 hover:shadow-md active:translate-y-0 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-60"
          >
            {isSubmitting ? "Verifying..." : "Verify Code"}
          </button>

          {errors.root && (
            <div className="mt-4 text-sm text-red-600 dark:text-red-400">{errors.root.message}</div>
          )}
          {success && (
            <div className="mt-4 text-sm text-green-600 dark:text-green-400">{success}</div>
          )}
        </form>

        <div className="mt-6 text-center text-sm text-slate-400 dark:text-slate-500">
          Didn&apos;t receive code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={timeLeft > 0}
            className={`font-medium transition-colors ${timeLeft > 0
              ? "text-slate-400 cursor-not-allowed"
              : "text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
              }`}
          >
            {timeLeft > 0 ? `Resend OTP (${timeLeft}s)` : "Resend OTP"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function EnterOtpPage() {
  return (
    <Suspense
      fallback={
        <section className="flex justify-center px-8 py-12 md:px-12">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            Loading...
          </div>
        </section>
      }
    >
      <EnterOtpPageContent />
    </Suspense>
  );
}
