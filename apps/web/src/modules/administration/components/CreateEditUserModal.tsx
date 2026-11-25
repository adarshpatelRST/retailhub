import * as React from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Building2,
  Check,
  Compass,
  Eye,
  EyeOff,
  Globe2,
  Mail,
  Phone,
  ShieldCheck,
  Store,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "@/context/AuthContext";
import { useDataScope } from "@/context/DataScopeContext";
import {
  adminCreateUserSchema,
  AdminCreateUserFormData,
} from "@/lib/validation-rules";
import { authApi, UserSummaryDto } from "../../auth/api/auth.api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateEditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit?: UserSummaryDto | null;
  onSuccess: () => void;
}

const DEFAULT_REGIONS = [
  { id: "reg-central-mp", code: "REG-CENTRAL-MP", name: "Central MP (Bhopal & Indore)" },
  { id: "reg-west-mh", code: "REG-WEST-MH", name: "Western Maharashtra (Mumbai & Pune)" },
  { id: "reg-south-ka", code: "REG-SOUTH-KA", name: "Karnataka South (Bengaluru)" },
  { id: "reg-delhi-ncr", code: "REG-DELHI-NCR", name: "Delhi NCR & Gurugram" },
];

export const CreateEditUserModal: React.FC<CreateEditUserModalProps> = ({
  open,
  onOpenChange,
  userToEdit,
  onSuccess,
}) => {
  const isEditing = Boolean(userToEdit);
  const { availableStores } = useDataScope();

  const [showInitialPass, setShowInitialPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AdminCreateUserFormData>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      mobileNumber: "",
      role: "STORE_MANAGER",
      storeIds: [],
      regionIds: [],
      initialPassword: "",
      confirmPassword: "",
    },
  });

  const selectedRole = watch("role");
  const selectedStoreIds = watch("storeIds") || [];
  const selectedRegionIds = watch("regionIds") || [];

  useEffect(() => {
    if (userToEdit) {
      reset({
        fullName: userToEdit.fullName,
        email: userToEdit.email,
        mobileNumber: userToEdit.mobileNumber,
        role: userToEdit.role,
        storeIds: userToEdit.assignedStores.map((s) => s.id),
        regionIds: userToEdit.assignedRegions.map((r) => r.id),
        initialPassword: "DummyPassword@123",
        confirmPassword: "DummyPassword@123",
      });
    } else {
      reset({
        fullName: "",
        email: "",
        mobileNumber: "",
        role: "STORE_MANAGER",
        storeIds: availableStores.length > 0 ? [availableStores[0].id] : [],
        regionIds: [],
        initialPassword: "",
        confirmPassword: "",
      });
    }
  }, [userToEdit, reset, availableStores]);

  const toggleStoreSelection = (storeId: string) => {
    const current = selectedStoreIds;
    const exists = current.includes(storeId);
    const next = exists
      ? current.filter((id) => id !== storeId)
      : [...current, storeId];
    setValue("storeIds", next, { shouldValidate: true });
  };

  const toggleRegionSelection = (regionId: string) => {
    const current = selectedRegionIds;
    const exists = current.includes(regionId);
    const next = exists
      ? current.filter((id) => id !== regionId)
      : [...current, regionId];
    setValue("regionIds", next, { shouldValidate: true });
  };

  const onSubmit = async (data: AdminCreateUserFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && userToEdit) {
        await authApi.updateUser(userToEdit.id, {
          fullName: data.fullName,
          mobileNumber: data.mobileNumber,
          role: data.role,
          storeIds: data.role === "STORE_MANAGER" ? data.storeIds : [],
          regionIds: data.role === "REGIONAL_MANAGER" ? data.regionIds : [],
        });
        toast.success(`User ${data.fullName} updated successfully.`);
      } else {
        await authApi.createUser({
          ...data,
          storeIds: data.role === "STORE_MANAGER" ? data.storeIds : [],
          regionIds: data.role === "REGIONAL_MANAGER" ? data.regionIds : [],
        });
        toast.success(
          `Manager onboarded successfully. Credentials emailed to ${data.email}.`,
        );
      }
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to process user onboarding.");
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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <UserPlus className="size-5 text-blue-600" />
            {isEditing ? "Edit Manager & Authority" : "Onboard New Enterprise Manager"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
            {isEditing
              ? "Update personal contact details and operational scope assignments."
              : "Create an enterprise account. The system will dispatch an automated welcome email with login credentials."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Full Name & Corporate Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="e.g. Rajesh Sharma"
                  className="pl-9"
                  {...register("fullName")}
                />
              </div>
              {errors.fullName && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3" />
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Corporate Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                <Input
                  type="email"
                  placeholder="name@retailhub.com"
                  disabled={isEditing}
                  className="pl-9"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3" />
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          {/* Mobile Number & Operational Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Indian Mobile Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="9820112233"
                  className="pl-9"
                  {...register("mobileNumber")}
                />
              </div>
              {errors.mobileNumber && (
                <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3" />
                  {errors.mobileNumber.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Role Authority
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(val) =>
                  setValue("role", val as UserRole, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operational role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STORE_MANAGER">Store Manager</SelectItem>
                  <SelectItem value="REGIONAL_MANAGER">Regional Manager</SelectItem>
                  <SelectItem value="EXECUTIVE">Executive (HQ)</SelectItem>
                  <SelectItem value="ADMIN">System Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic Scope Picker Based On Selected Role */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe2 className="size-3.5 text-blue-500" />
              Operational Scope Assignment
            </Label>

            {/* Scope 1: STORE_MANAGER Store Selector */}
            {selectedRole === "STORE_MANAGER" && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  Select the physical store location(s) this Store Manager oversees:
                </p>
                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 space-y-1 bg-slate-50/50 dark:bg-slate-950/40">
                  {availableStores.map((store) => {
                    const isSelected = selectedStoreIds.includes(store.id);
                    return (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => toggleStoreSelection(store.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors ${
                          isSelected
                            ? "bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Store className="size-3.5 text-blue-500" />
                          <span className="font-medium">{store.name}</span>
                          <span className="text-[10px] text-slate-400">
                            ({store.storeCode} · {store.city})
                          </span>
                        </div>
                        {isSelected && <Check className="size-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
                {errors.storeIds && (
                  <p className="text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {errors.storeIds.message}
                  </p>
                )}
              </div>
            )}

            {/* Scope 2: REGIONAL_MANAGER Region Selector */}
            {selectedRole === "REGIONAL_MANAGER" && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  Select the geographic territories this Regional Manager manages:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEFAULT_REGIONS.map((reg) => {
                    const isSelected = selectedRegionIds.includes(reg.id);
                    return (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => toggleRegionSelection(reg.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-colors ${
                          isSelected
                            ? "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-200"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Compass className="size-4 text-emerald-500" />
                          <div>
                            <div className="font-medium">{reg.name}</div>
                            <div className="text-[10px] text-slate-400">{reg.code}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="size-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
                {errors.regionIds && (
                  <p className="text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {errors.regionIds.message}
                  </p>
                )}
              </div>
            )}

            {/* Scope 3: EXECUTIVE & ADMIN Callout */}
            {(selectedRole === "EXECUTIVE" || selectedRole === "ADMIN") && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2">
                <Building2 className="size-4 text-blue-600 shrink-0" />
                <span>
                  This role possesses <strong>unrestricted enterprise-wide access</strong>{" "}
                  across all operational regions, stores, financial reports, and inventory
                  balances.
                </span>
              </div>
            )}
          </div>

          {/* Initial Password Fields (Only when Creating) */}
          {!isEditing && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-blue-600" />
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Initial Password &amp; Credential Dispatch
                </Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-slate-600 dark:text-slate-400">
                    Temporary Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showInitialPass ? "text" : "password"}
                      placeholder="e.g. Manager@2026!"
                      className="pr-10"
                      {...register("initialPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowInitialPass(!showInitialPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showInitialPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.initialPassword && (
                    <p className="text-[11px] text-rose-500 mt-1">
                      {errors.initialPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] text-slate-600 dark:text-slate-400">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPass ? "text" : "password"}
                      placeholder="Re-enter password"
                      className="pr-10"
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-rose-500 mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <StandardButton
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </StandardButton>
            <StandardButton type="submit" loading={isSubmitting}>
              {isEditing ? "Save Changes" : "Create & Send Credentials (✉️)"}
            </StandardButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
