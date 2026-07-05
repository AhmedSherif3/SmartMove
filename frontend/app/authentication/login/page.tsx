"use client";

import InputField from "../components/inputField";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { login } from "../../../lib/auth/api";
import { saveAuthSession } from "../../../lib/auth/session";
import { useState } from "react";
import { useOrbLogin } from "@/components/orb/OrbLoginContext";
import AuthPageHeader from "../components/AuthPageHeader";
import AuthFusionLoader from "@/components/orb/AuthFusionLoader";
import { normalizeRole } from "@/components/layout/DashboardLayoutParts";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isOrbLocked, setIsOrbLocked] = useState(false);
  const [showFusionLoader, setShowFusionLoader] = useState(false);
  const { setOrbState } = useOrbLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const emailField = register("email");
  const passwordField = register("password");

  const resetOrbToIdle = () => {
    if (isOrbLocked) {
      return;
    }

    setOrbState("idle");
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsOrbLocked(true);
    setOrbState("loading");

    try {
      const response = await login(values);

      // Temporary local session until full cookie/header auth flow is finalized.
      saveAuthSession({
        userId: response.user_id,
        email: response.email,
        role: response.role,
      });

      setOrbState("success");

      // Give the success state a moment to breathe
      await new Promise((resolve) => setTimeout(resolve, 600));
      
      // Ignite the Fusion Loader
      setShowFusionLoader(true);

      // Force a 2-second premium delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const rolePath = normalizeRole(response.role);
      router.push(`/${rolePath}`);
    } catch (err: unknown) {
      setIsOrbLocked(false);
      setOrbState("error");

      // Extract the real error from the server response when available
      let message = "Something went wrong. Please try again.";

      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err
      ) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        const serverMsg = axiosErr.response?.data?.error;
        if (serverMsg) {
          message = serverMsg;
        }
      }

      setError("root", { message });

      window.setTimeout(() => {
        setOrbState("idle");
      }, 1700);
    }
  };

  return (
    <section className="flex justify-center px-8 py-12 mt-7 md:px-12">
      {showFusionLoader && (
        <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-white/95 backdrop-blur-2xl transition-all duration-500 dark:bg-slate-950/95">
          <div className="w-full max-w-xl animate-in fade-in zoom-in duration-500">
            <AuthFusionLoader 
              label="Synchronizing your neural workspace..." 
              className="border-none bg-transparent shadow-none"
            />
          </div>
        </div>
      )}
      <div className="w-full max-w-md">
        {/* Header */}

        <AuthPageHeader title="Welcome back" subtitle="Enter your details to continue" />

        {/* Card */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >

          {/* Google SSO */}
          <button
            type="button"
            className="mb-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:-translate-y-px hover:border-blue-300 hover:shadow-sm active:translate-y-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 dark:text-slate-500">or</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <InputField
              title="Email"
              placeholder="name@example.com"
              type="email"
              error={errors.email?.message}
              autoComplete="email"
              {...emailField}
              onChange={(event) => {
                emailField.onChange(event);

                if (!isOrbLocked) {
                  setOrbState("email");
                }
              }}
              onFocus={() => {
                if (isOrbLocked) {
                  return;
                }

                setOrbState("email");
              }}
              onBlur={(event) => {
                emailField.onBlur(event);
                resetOrbToIdle();
              }}
            />
            <InputField
              title="Password"
              placeholder="Enter your password"
              type="password"
              error={errors.password?.message}
              autoComplete="current-password"
              {...passwordField}
              onChange={(event) => {
                passwordField.onChange(event);

                if (!isOrbLocked) {
                  setOrbState("password");
                }
              }}
              onInput={() => {
                if (!isOrbLocked) {
                  setOrbState("password");
                }
              }}
              onFocus={() => {
                if (isOrbLocked) {
                  return;
                }

                setOrbState("password");
              }}
              onBlur={(event) => {
                passwordField.onBlur(event);
                resetOrbToIdle();
              }}
            />
          </div>

          {errors.root?.message ? (
            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
              {errors.root.message}
            </p>
          ) : null}

          {/* Forgot password */}
          <div className="mt-2 flex justify-end">
            <Link
              href="/authentication/forgot-password"
              className="text-xs font-medium text-blue-600 transition-opacity hover:opacity-70 dark:text-blue-400"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-blue-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Sign up link */}
        <p className="mt-5 text-center text-sm text-slate-400 dark:text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/authentication/register" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Sign up
          </Link>
        </p>

      </div>
    </section>
  );
}
