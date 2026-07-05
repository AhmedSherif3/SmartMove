"use client";

import Link from "next/link";
import InputField from "../components/inputField";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { register as registerUser } from "../../../lib/auth/api";
import { useRouter } from "next/navigation";
import AuthPageHeader from "../components/AuthPageHeader";
import { useOrbLogin } from "@/components/orb/OrbLoginContext";

const registerSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters."),
    lastName: z.string().min(2, "Last name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(8, "Please confirm your password."),
    region: z.enum(["egypt", "dubai", "england"]),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setOrbState } = useOrbLogin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirm_password: "",
      region: "egypt",
    },
  });

  const firstNameField = register("firstName");
  const lastNameField = register("lastName");
  const emailField = register("email");
  const passwordField = register("password");
  const confirmPasswordField = register("confirm_password");
  const regionField = register("region");

  const setEmailLikeState = () => {
    if (!isSubmitting) {
      setOrbState("email");
    }
  };

  const setPasswordState = () => {
    if (!isSubmitting) {
      setOrbState("password");
    }
  };

  const resetState = () => {
    if (!isSubmitting) {
      setOrbState("idle");
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerUser({
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        password: values.password,
        confirm_password: values.confirm_password,
        region: values.region,
      });
      router.push(`/authentication/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err: unknown) {
      console.error("Registration error:", err);
      let message = "Registration failed. Please check your inputs and try again.";
      const axiosError = err as { response?: { data?: unknown }; message?: string };
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        if (typeof data === "string") {
          message = data;
        } else if (typeof data === "object" && data !== null) {
          const dataObj = data as Record<string, unknown>;
          if (typeof dataObj.detail === "string") {
            message = dataObj.detail;
          } else if (typeof dataObj.error === "string") {
            message = dataObj.error;
          } else if (Array.isArray(dataObj.non_field_errors)) {
            message = dataObj.non_field_errors.join(" ");
          } else {
            let hasFieldErrors = false;
            const fieldMap: Record<string, keyof RegisterFormValues> = {
              first_name: "firstName",
              last_name: "lastName",
              email: "email",
              password: "password",
              confirm_password: "confirm_password",
              region: "region",
            };

            Object.entries(dataObj).forEach(([key, val]) => {
              const formField = fieldMap[key];
              const errMsg = Array.isArray(val) ? val.join(" ") : String(val);
              if (formField) {
                setError(formField, { message: errMsg });
                hasFieldErrors = true;
              }
            });

            if (hasFieldErrors) {
              message = "Registration failed. Please correct the errors above.";
            } else {
              const values = Object.values(dataObj);
              if (values.length > 0) {
                message = Array.isArray(values[0]) ? values[0].join(" ") : String(values[0]);
              }
            }
          }
        }
      } else if (axiosError.message) {
        message = axiosError.message;
      }

      setError("root", {
        message,
      });
    }
  };

  return (
    <section className="flex justify-center px-8 py-12 md:px-12">
      <div className="w-full max-w-md">
        <AuthPageHeader
          title="Create account"
          subtitle="Start your SmartMove journey in seconds."
        />

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="space-y-4">
            <InputField
              title="First name"
              placeholder="Enter your first name"
              error={errors.firstName?.message}
              autoComplete="given-name"
              {...firstNameField}
              onChange={(event) => {
                firstNameField.onChange(event);
                setEmailLikeState();
              }}
              onFocus={setEmailLikeState}
              onBlur={(event) => {
                firstNameField.onBlur(event);
                resetState();
              }}
            />
            <InputField
              title="Last name"
              placeholder="Enter your last name"
              error={errors.lastName?.message}
              autoComplete="family-name"
              {...lastNameField}
              onChange={(event) => {
                lastNameField.onChange(event);
                setEmailLikeState();
              }}
              onFocus={setEmailLikeState}
              onBlur={(event) => {
                lastNameField.onBlur(event);
                resetState();
              }}
            />
            <InputField
              title="Email"
              placeholder="name@example.com"
              type="email"
              error={errors.email?.message}
              autoComplete="email"
              {...emailField}
              onChange={(event) => {
                emailField.onChange(event);
                setEmailLikeState();
              }}
              onFocus={setEmailLikeState}
              onBlur={(event) => {
                emailField.onBlur(event);
                resetState();
              }}
            />
            <InputField
              title="Password"
              placeholder="Create a password"
              type="password"
              error={errors.password?.message}
              autoComplete="new-password"
              {...passwordField}
              onChange={(event) => {
                passwordField.onChange(event);
                setPasswordState();
              }}
              onFocus={setPasswordState}
              onBlur={(event) => {
                passwordField.onBlur(event);
                resetState();
              }}
            />
            <InputField
              title="Confirm password"
              placeholder="Repeat your password"
              type="password"
              error={errors.confirm_password?.message}
              autoComplete="new-password"
              {...confirmPasswordField}
              onChange={(event) => {
                confirmPasswordField.onChange(event);
                setEmailLikeState();
              }}
              onFocus={setEmailLikeState}
              onBlur={(event) => {
                confirmPasswordField.onBlur(event);
                resetState();
              }}
            />
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Region</label>
              <select
                {...regionField}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                onChange={(event) => {
                  regionField.onChange(event);
                  setEmailLikeState();
                }}
                onFocus={setEmailLikeState}
                onBlur={(event) => {
                  regionField.onBlur(event);
                  resetState();
                }}
              >
                <option value="egypt">Egypt</option>
                <option value="dubai">Dubai</option>
                <option value="england">England</option>
              </select>
              {errors.region && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.region.message}</div>
              )}
            </div>
          </div>

          {errors.root?.message ? (
            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
              {errors.root.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-blue-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400 dark:text-slate-500">
          Already have an account?{" "}
          <Link href="/authentication/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
