
"use client";
import Link from "next/link";
import InputField from "../components/inputField";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "../../../lib/auth/api";
import { Suspense, useState } from "react";
import AuthPageHeader from "../components/AuthPageHeader";

const resetSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Please confirm your password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const code = searchParams.get("code") || "";
  const [success, setSuccess] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetFormValues) => {
    try {
      await resetPassword(email, code, values.newPassword, values.confirmPassword);
      setSuccess("Password updated. You can now log in.");
      setTimeout(() => router.push("/authentication/login"), 1200);
    } catch (err: unknown) {
      console.error("Reset password error:", err);
      let message = "Failed to update password. Try again.";
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
          title="Reset password"
          subtitle="Choose a strong new password for your account."
        />

        <form
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-4">
            <InputField
              title="New password"
              placeholder="Enter new password"
              type="password"
              {...register("newPassword")}
              error={errors.newPassword?.message}
            />
            <InputField
              title="Confirm new password"
              placeholder="Repeat new password"
              type="password"
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-blue-700 hover:shadow-md active:translate-y-0 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-60"
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>

          {errors.root && (
            <div className="mt-4 text-sm text-red-600 dark:text-red-400">{errors.root.message}</div>
          )}
          {success && (
            <div className="mt-4 text-sm text-green-600 dark:text-green-400">{success}</div>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-slate-400 dark:text-slate-500">
          Need help?{" "}
          <Link
            href="/authentication/forgot-password"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Request another reset link
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordPageContent />
    </Suspense>
  );
}
