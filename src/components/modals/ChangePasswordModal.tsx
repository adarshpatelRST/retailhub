import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  changePasswordSchema,
  ChangePasswordFormData,
} from "@/lib/validation-rules";
import { authApi } from "@/api/auth.api";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StandardButton } from "@/components/ui/StandardButton";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword");

  // Reset form cleanly whenever modal is opened
  React.useEffect(() => {
    if (open) {
      reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [open, reset]);

  const onSubmit = async (data: ChangePasswordFormData) => {
    setIsSubmitting(true);
    try {
      await authApi.changePassword(data);
      toast.success(
        "Password updated successfully. Please sign in with your new password.",
      );
      reset();
      onOpenChange(false);
      logout();
      navigate("/login");
    } catch (err: any) {
      toast.error(
        err.message || "Failed to update password. Verify current password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md bg-white border-slate-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
            <KeyRound className="size-5 text-blue-600" />
            Change Account Password
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            Update your operational password. A strong password requires at least 8
            characters, 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Current Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="currentPassword"
              className="text-xs font-semibold text-slate-700"
            >
              Current Password
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                className="pr-10"
                {...register("currentPassword")}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                <AlertCircle className="size-3" />
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="newPassword"
              className="text-xs font-semibold text-slate-700"
            >
              New Password
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                placeholder="Enter new strong password"
                className="pr-10"
                {...register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                <AlertCircle className="size-3" />
                {errors.newPassword.message}
              </p>
            )}

            {/* Micro Password Strength Meter */}
            {newPasswordValue && (
              <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck
                    className={`size-3.5 ${
                      newPasswordValue.length >= 8
                        ? "text-emerald-500"
                        : "text-slate-400"
                    }`}
                  />
                  <span>At least 8 characters</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="confirmPassword"
              className="text-xs font-semibold text-slate-700"
            >
              Confirm New Password
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter new password"
                className="pr-10"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                <AlertCircle className="size-3" />
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-3">
            <StandardButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </StandardButton>
            <StandardButton type="submit" loading={isSubmitting}>
              Update Password
            </StandardButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
