
"use client";
import InputField from "../components/inputField";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyEmailOtp, resendOtp } from "../../../lib/auth/api";
import { Suspense, useState } from "react";
import AuthPageHeader from "../components/AuthPageHeader";

const otpSchema = z.object({
  code: z.string().length(6, "OTP must be 6 digits."),
});

type OtpFormValues = z.infer<typeof otpSchema>;

function VerifyEmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [success, setSuccess] = useState("");
  const [resendStatus, setResendStatus] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = async (values: OtpFormValues) => {
    try {
      await verifyEmailOtp(email, values.code);
      setSuccess("Email verified successfully! Redirecting to login...");
      setTimeout(() => router.push("/authentication/login"), 2000);
    } catch (err: unknown) {
      console.error("Verify email error:", err);
      let message = "Invalid verification code.";
      const axiosError = err as { response?: { data?: unknown }; message?: string };
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        if (typeof data === "string") {
          message = data;
        } else if (typeof data === "object" && data !== null) {
          const dataObj = data as { detail?: string; error?: string; non_field_errors?: string[] };
          message = dataObj.error || dataObj.detail || (Array.isArray(dataObj.non_field_errors) ? dataObj.non_field_errors.join(" ") : null) || message; 
        }  
      } else if (axiosError.message) {
        message = axiosError.message;
      }
      setError("root", { message });
    }
  };

  const handleResend = async () => {
    try {
      setResendStatus("Sending...");
      await resendOtp(email, "verify_email");
      setResendStatus("New code sent!");
      setTimeout(() => setResendStatus(""), 3000);
    } catch {
      setResendStatus("Failed to resend.");
    }
  };

  return (
    <section className="flex justify-center px-8 py-12 md:px-12">
      <div className="w-full max-w-md">
        <AuthPageHeader
          title="Verify your email"
          subtitle={
            <>
              We sent a verification code to <strong>{email}</strong>.
            </>
          }
        />

        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
          <strong>Note:</strong> It might take up to a minute for the email to reach you. Please check your spam folder if you don&apos;t see it.
        </div>

        <form
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          onSubmit={handleSubmit(onSubmit)}
        >
          <InputField
            title="Verification code"
            placeholder="Enter 6-digit code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            {...register("code")}
            error={errors.code?.message}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-blue-700 hover:shadow-md active:translate-y-0 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-60"
          >
            {isSubmitting ? "Verifying..." : "Verify Email"}
          </button>

          {errors.root && (
            <div className="mt-4 text-sm text-red-600 dark:text-red-400">{errors.root.message}</div>
          )}
          {success && (
            <div className="mt-4 text-sm text-green-600 dark:text-green-400">{success}</div>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-slate-400 dark:text-slate-500">
          Didn&apos;t receive code?{" "}
          <button 
            onClick={handleResend}
            disabled={!!resendStatus}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400 disabled:opacity-50"
          >
            {resendStatus || "Resend Code"}
          </button>
        </p>
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailPageContent />
    </Suspense>
  );
}
