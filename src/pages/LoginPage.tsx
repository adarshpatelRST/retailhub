import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Building2,
  AlertCircle,
  Sparkles,
  Shield,
  UserCheck,
  Store as StoreIcon,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, UserRole, DEMO_PERSONAS } from "@/context/AuthContext";
import { loginSchema, LoginFormData } from "@/lib/validation-rules";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StandardButton } from "@/components/ui/StandardButton";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithCredentials, switchDemoPersona } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const redirectByRole = (role: UserRole) => {
    switch (role) {
      case "STORE_MANAGER":
        navigate("/dashboard/store");
        break;
      case "REGIONAL_MANAGER":
        navigate("/intelligence/action-center");
        break;
      case "EXECUTIVE":
      case "ADMIN":
      default:
        navigate("/dashboard/executive");
        break;
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true);
      const user = await loginWithCredentials(data.email, data.password);
      toast.success(`Welcome back, ${user.fullName}`);
      redirectByRole(user.role);
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in. Please verify credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    switchDemoPersona(role);
    const persona = DEMO_PERSONAS[role];
    toast.success(`Signed in as ${persona.fullName} (${persona.role})`);
    redirectByRole(role);
  };

  const demoCards: Array<{
    role: UserRole;
    name: string;
    title: string;
    email: string;
    badge: string;
    badgeColor: string;
    icon: React.ReactNode;
  }> = [
      {
        role: "ADMIN",
        name: "Ananya Deshmukh",
        title: "Platform Admin",
        email: "admin@retailhub.com",
        badge: "Full Access",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        icon: <Crown className="size-4 text-purple-600 shrink-0" />,
      },
      {
        role: "EXECUTIVE",
        name: "Vikram Aditya",
        title: "VP Retail Operations",
        email: "executive@retailhub.com",
        badge: "Enterprise Oversight",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        icon: <Shield className="size-4 text-blue-600 shrink-0" />,
      },
      {
        role: "REGIONAL_MANAGER",
        name: "Priya Nair",
        title: "Regional Manager",
        email: "regional.central@retailhub.com",
        badge: "Central MP Corridor",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: <UserCheck className="size-4 text-emerald-600 shrink-0" />,
      },
      {
        role: "STORE_MANAGER",
        name: "Rajesh Sharma",
        title: "Store Manager",
        email: "store.bhopal@retailhub.com",
        badge: "Bhopal Hypermarket",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        icon: <StoreIcon className="size-4 text-amber-600 shrink-0" />,
      },
    ];

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#f4f5f7] text-slate-900 p-4 sm:p-6 py-10 space-y-4 relative">
      {/* 1. Main Login Card - Matching Reference UI */}
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 sm:p-10 space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2 mb-2">
          <div className="flex items-center justify-center gap-2.5">
            <div className="inline-flex items-center justify-center p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shadow-xs">
              <Building2 className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              RepleniQ
              <sup className="ml-0.5 text-[11px] font-semibold tracking-normal leading-none relative -top-[0.75em] text-slate-500">
                TM
              </sup>
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            High-Velocity Retail Operations &amp; Rebalance OS
          </p>
          <p className="text-[11px] font-semibold tracking-wide text-blue-700">
            Powered by RustyStick Technologies LLP
          </p>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email Field with Red Asterisk */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              className="h-10 px-3.5 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-600 focus-visible:border-blue-600 rounded-lg text-sm shadow-xs"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle className="size-3" />
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field with Red Asterisk, Eye Toggle & Red Forgot Password Link */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Password <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs font-medium text-red-500 hover:text-red-600 hover:underline transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-10 px-3.5 pr-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-600 focus-visible:border-blue-600 rounded-lg text-sm shadow-xs"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle className="size-3" />
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <StandardButton
            type="submit"
            loading={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 py-2.5 rounded-lg shadow-md transition-all mt-3 cursor-pointer text-sm"
          >
            Sign In
          </StandardButton>
        </form>
      </div>

      {/* 2. Separate Quick Logins Section - Same Width ([440px]) Directly Below */}
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-5 space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-blue-600" />
            1-Click Fast Persona Login
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Click any persona to enter</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {demoCards.map((p) => (
            <button
              key={p.role}
              type="button"
              onClick={() => handleQuickLogin(p.role)}
              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all text-left group cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors shrink-0">
                {p.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {p.name}
                </div>
                <div className="text-[10px] text-slate-500 font-medium truncate">{p.title}</div>
                <div className="mt-1">
                  <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold border ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-2 text-center border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Protected by Enterprise RBAC</span>
          <span>Password: <strong className="text-slate-600 font-mono">RetailHub@2026</strong></span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-center relative z-10">
        RepleniQ<sup className="ml-0.5 text-[8px] font-semibold leading-none relative -top-[0.4em]">TM</sup> — Powered by RustyStick Technologies LLP &bull; &copy; 2026 All Rights Reserved
      </p>
    </div>
  );
};

export const LoginView = LoginPage;
