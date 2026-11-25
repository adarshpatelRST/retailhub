import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  adminResetPasswordSchema,
  AdminResetPasswordFormData,
} from "@/lib/validation-rules";
import { authApi, UserSummaryDto } from "@/api/auth.api";
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
import { Checkbox } from "@/components/ui/checkbox";
import { StandardButton } from "@/components/ui/StandardButton";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserSummaryDto | null;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}) => {
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdminResetPasswordFormData>({
    resolver: zodResolver(adminResetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
      sendEmail: true,
    },
  });

  const sendEmail = watch("sendEmail");

  // Reset form cleanly whenever modal is opened
  React.useEffect(() => {
    if (open) {
      reset();
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [open, reset]);

  const onSubmit = async (data: AdminResetPasswordFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(user.id, data);
      toast.success(
        `Password reset for ${user.fullName}. ${
          data.sendEmail ? "Credentials emailed." : ""
        }`,
      );
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
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
      <DialogContent className="max-w-md bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <KeyRound className="size-5 text-amber-500" />
            Reset Employee Password
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            Assign a new temporary password for <strong>{user?.fullName}</strong> (
            <code>{user?.email}</code>).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* New Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              New Password
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder="e.g. TempReset@2026!"
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
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Confirm New Password
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter password"
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

          {/* Email dispatch checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={(checked) => setValue("sendEmail", Boolean(checked))}
            />
            <Label
              htmlFor="sendEmail"
              className="text-xs font-normal text-slate-600 flex items-center gap-1.5 cursor-pointer"
            >
              <Mail className="size-3.5 text-blue-500" />
              Dispatch updated credentials email to employee via SMTP
            </Label>
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
              Reset &amp; Save
            </StandardButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
