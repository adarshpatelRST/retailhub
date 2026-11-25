import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Building2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { loginSchema, LoginFormData } from "@/lib/validation-rules";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StandardButton } from "@/components/ui/StandardButton";

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithCredentials } = useAuth();
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

  const redirectByRole = (role: string) => {
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

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-slate-50 text-slate-900 p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/60 p-6 sm:p-8 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 mb-1 shadow-xs">
            <Building2 className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            RetailHub Enterprise
          </h1>
          <p className="text-xs text-slate-500">
            High-Velocity Retail Operations (D-Mart / JioMart Model)
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
              Corporate Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@retailhub.com"
                className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-600 focus-visible:border-blue-600 shadow-xs"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle className="size-3" />
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-xs font-semibold text-slate-700"
              >
                Password
              </Label>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="pl-9 pr-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-600 focus-visible:border-blue-600 shadow-xs"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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

          <StandardButton
            type="submit"
            loading={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-md transition-all mt-2 cursor-pointer"
          >
            Sign In
          </StandardButton>
        </form>

        <div className="pt-2 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            Protected by RetailHub Enterprise Security & Role-Based Access Control
          </p>
        </div>
      </div>
    </div>
  );
};
