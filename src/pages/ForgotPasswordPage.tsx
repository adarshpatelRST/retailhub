import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetStep = "EMAIL" | "OTP" | "NEW_PASSWORD" | "SUCCESS";

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = React.useState<ResetStep>("EMAIL");
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Timer for OTP countdown
  const [timeLeft, setTimeLeft] = React.useState(600); // 10 minutes

  React.useEffect(() => {
    if (step !== "OTP" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid corporate email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post<any>("/auth/forgot-password/request-otp", {
        email: email.trim().toLowerCase(),
      });
      const data = res.data;

      if (!data.success) {
        setErrorMessage(
          data.error?.message || "Failed to find account or send verification code."
        );
        return;
      }

      toast.success("Verification Code Sent", {
        description:
          data.data?.devOtp
            ? `Code sent! [DEV TEST OTP: ${data.data.devOtp}]`
            : "Please check your corporate inbox for your 6-digit OTP code.",
      });

      setTimeLeft(600);
      setStep("OTP");
    } catch (err: any) {
      setErrorMessage("Network error connecting to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (otp.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post<any>("/auth/forgot-password/verify-otp", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      const data = res.data;

      if (!data.success) {
        setErrorMessage(
          data.error?.message || "Invalid or expired verification code."
        );
        return;
      }

      toast.success("Code Verified", {
        description: "Your identity has been verified. Now set your new password.",
      });
      setStep("NEW_PASSWORD");
    } catch (err) {
      setErrorMessage("Error verifying code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setErrorMessage(
        "Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special character."
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post<any>("/auth/forgot-password/reset-password", {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });
      const data = res.data;

      if (!data.success) {
        setErrorMessage(
          data.error?.message || "Failed to reset password. Please try again."
        );
        return;
      }

      toast.success("Password Updated", {
        description:
          "Your password has been reset successfully. Redirecting to sign in...",
      });
      setStep("SUCCESS");

      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setErrorMessage("Network error updating password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password checklist validation
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      {/* Container Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/50 p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary mb-3">
            <Flame className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            RepleniQ
            <sup className="ml-0.5 text-[11px] font-semibold tracking-normal leading-none relative -top-[0.75em] text-slate-500">
              TM
            </sup>
          </h1>
          <p className="text-[11px] font-semibold tracking-wide text-blue-700 mt-0.5">
            Powered by RustyStick Technologies LLP
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {step === "EMAIL" && "Account Recovery & Password Reset"}
            {step === "OTP" && "Verify Corporate Identity"}
            {step === "NEW_PASSWORD" && "Create New Secure Password"}
            {step === "SUCCESS" && "Password Reset Complete"}
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 font-medium">
            {errorMessage}
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === "EMAIL" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Corporate Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@retailhub.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-11 focus-visible:ring-primary"
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-slate-500">
                Enter your registered enterprise email. We will send a 6-digit OTP verification code.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-medium bg-primary hover:bg-primary/90 text-white shadow-sm mt-2"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Account...
                </>
              ) : (
                "Send Verification Code"
              )}
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Enter OTP */}
        {step === "OTP" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              We have sent a 6-digit verification code to <strong>{email}</strong>.
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="otp" className="text-xs font-semibold text-slate-700">
                  Enter 6-Digit Code
                </Label>
                <span className="text-xs font-medium text-slate-500">
                  Expires in: <span className="text-primary font-bold">{formatTime(timeLeft)}</span>
                </span>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="pl-9 tracking-widest text-center text-lg font-mono font-semibold bg-white border-slate-300 text-slate-900 h-11 focus-visible:ring-primary"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-medium bg-primary hover:bg-primary/90 text-white shadow-sm"
              disabled={isLoading || otp.length !== 6 || timeLeft === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Code...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>

            <div className="flex justify-between items-center pt-2 text-xs">
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={isLoading}
                className="text-primary hover:underline font-medium disabled:opacity-50"
              >
                Resend Verification Code
              </button>
              <button
                type="button"
                onClick={() => setStep("EMAIL")}
                className="text-slate-500 hover:text-slate-800 font-medium"
              >
                Change Email
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Enter New Password */}
        {step === "NEW_PASSWORD" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-700">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-11 focus-visible:ring-primary"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-11 focus-visible:ring-primary"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Security Checklist */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs text-slate-600">
              <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Security Requirements:
              </div>
              <div className="flex items-center gap-1.5">
                <span className={hasMinLength ? "text-emerald-600 font-bold" : "text-slate-400"}>
                  {hasMinLength ? "✓" : "○"}
                </span>
                <span>Minimum 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={hasUpper && hasLower ? "text-emerald-600 font-bold" : "text-slate-400"}>
                  {hasUpper && hasLower ? "✓" : "○"}
                </span>
                <span>Uppercase & lowercase letters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={hasNumber && hasSpecial ? "text-emerald-600 font-bold" : "text-slate-400"}>
                  {hasNumber && hasSpecial ? "✓" : "○"}
                </span>
                <span>At least 1 number and 1 special symbol</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={passwordsMatch ? "text-emerald-600 font-bold" : "text-slate-400"}>
                  {passwordsMatch ? "✓" : "○"}
                </span>
                <span>Passwords match</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-medium bg-primary hover:bg-primary/90 text-white shadow-sm mt-2"
              disabled={
                isLoading ||
                !hasMinLength ||
                !hasUpper ||
                !hasLower ||
                !hasNumber ||
                !hasSpecial ||
                !passwordsMatch
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        )}

        {/* STEP 4: Success confirmation */}
        {step === "SUCCESS" && (
          <div className="text-center py-4 space-y-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Password Reset Successful!
            </h2>
            <p className="text-xs text-slate-600">
              Your enterprise account password has been updated securely. A confirmation email has been dispatched to your corporate address.
            </p>
            <div className="pt-4">
              <Button
                onClick={() => navigate("/login")}
                className="w-full h-11 font-medium bg-primary hover:bg-primary/90 text-white"
              >
                Sign In With New Password
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
