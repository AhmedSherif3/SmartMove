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
      window.location.href = `/${rolePath}`;
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
