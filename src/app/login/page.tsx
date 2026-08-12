"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useLogin } from "@/hooks/use-auth";
import { useAuth } from "@/lib/store";
import { ApiError } from "@/lib/api";
import { DotGrid } from "@/components/reactbits/dot-grid";
import { SpotlightCard } from "@/components/reactbits/spotlight-card";
import { ShinyText } from "@/components/reactbits/shiny-text";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

const editorial = { fontFamily: "var(--font-editorial)" } as const;

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const { token, hydrated } = useAuth();
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@email.com", password: "" },
  });

  useEffect(() => {
    if (hydrated && token) router.replace("/");
  }, [hydrated, token, router]);

  const onSubmit = (values: FormValues) => {
    login.mutate(values, {
      onSuccess: () => {
        toast.success("Welcome back");
        router.replace("/");
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Login failed"),
    });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ backgroundColor: "#08080a" }}>
      {/* Interactive dot-grid field */}
      <DotGrid
        className="absolute inset-0 h-full w-full"
        gap={28}
        dotSize={2.6}
        baseColor="#3a3a48"
        activeColor="#5b9bff"
        proximity={160}
      />

      {/* Corner glows + edge vignette to seat the card */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 10%, rgba(59,130,246,0.14), transparent 60%), radial-gradient(55% 50% at 85% 95%, rgba(139,92,246,0.12), transparent 60%), radial-gradient(120% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.6))",
        }}
      />

      {/* Sign-in card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <SpotlightCard className="login-pop w-full max-w-[400px] rounded-2xl border border-white/10 bg-white/[0.035] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-9">
          {/* Brand */}
          <div className="relative mb-8 flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg text-primary-foreground"
              style={editorial}
            >
              G
            </div>
            <ShinyText
              text="Gazon · VCMS"
              speed={5}
              className="text-[0.7rem] font-medium uppercase tracking-[0.28em]"
            />
          </div>

          {/* Heading */}
          <div className="relative mb-7">
            <h1 className="text-[2.5rem] leading-none tracking-tight text-white" style={editorial}>
              Sign in
            </h1>
            <p className="mt-2.5 text-sm text-white/50">
              Vendor commissions, zone to ledger. Enter your details to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-4" noValidate>
            <DarkField label="Email" htmlFor="email" error={errors.email?.message}>
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                className={cn(fieldCls, errors.email && "ring-1 ring-red-400/60")}
                {...register("email")}
              />
            </DarkField>

            <DarkField label="Password" htmlFor="password" error={errors.password?.message}>
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(fieldCls, "pr-10", errors.password && "ring-1 ring-red-400/60")}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </DarkField>

            <button
              type="submit"
              disabled={login.isPending}
              className="group mt-1 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[0.9375rem] font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a] disabled:opacity-60"
            >
              {login.isPending ? (
                "Signing in…"
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="relative mt-7 text-center text-[0.7rem] uppercase tracking-[0.18em] text-white/30">
            Vendor Commission Management System
          </p>
        </SpotlightCard>
      </div>
    </div>
  );
}

const fieldCls =
  "h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-3 text-[0.9375rem] text-white placeholder:text-white/25 outline-none transition-colors focus:border-primary/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-primary/25";

function DarkField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-white/55">
        {label}
      </label>
      <div className="relative">{children}</div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
