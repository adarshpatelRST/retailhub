import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
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
import { authApi, UserSummaryDto } from "@/api/auth.api";
import { storeApi } from "@/api/store.api";
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
import { DropSearch } from "@/components/ui/DropSearch";

interface CreateEditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit?: UserSummaryDto | null;
  onSuccess: () => void;
}

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

  // 1. Fetch real active regions from database API
  const { data: realRegions = [] } = useQuery({
    queryKey: ["regions-list"],
    queryFn: () => storeApi.getRegions(),
    staleTime: 60_000,
  });

  // 2. Fetch real active stores from database API
  const { data: realStores = [] } = useQuery({
    queryKey: ["stores-list"],
    queryFn: () => storeApi.getStores(),
    staleTime: 60_000,
  });

  // 3. Fetch active users to determine existing store & region assignments
  const { data: usersList = [] } = useQuery({
    queryKey: ["users-directory"],
    queryFn: () => authApi.getUsers(),
    staleTime: 30_000,
  });

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

  // Reset form state cleanly every time modal opens
  useEffect(() => {
    if (open) {
      setShowInitialPass(false);
      setShowConfirmPass(false);
      if (userToEdit) {
        reset({
          fullName: userToEdit.fullName,
          email: userToEdit.email,
          mobileNumber: userToEdit.mobileNumber,
          role: userToEdit.role,
          storeIds: userToEdit.assignedStores?.map((s: any) => s.id) || [],
          regionIds: userToEdit.assignedRegions?.map((r: any) => r.id) || [],
          initialPassword: "DummyPassword@123",
          confirmPassword: "DummyPassword@123",
        });
      } else {
        reset({
          fullName: "",
          email: "",
          mobileNumber: "",
          role: "STORE_MANAGER",
          storeIds: [],
          regionIds: [],
          initialPassword: "",
          confirmPassword: "",
        });
      }
    }
  }, [open, userToEdit, reset]);

  // Compute occupied Store IDs and Region IDs from existing active managers
  const occupiedStoreIds = useMemo(() => {
    const set = new Set<string>();
    usersList.forEach((u) => {
      if (u.isActive && (!userToEdit || u.id !== userToEdit.id)) {
        u.assignedStores?.forEach((s: any) => set.add(s.id));
      }
    });
    return set;
  }, [usersList, userToEdit]);

  const occupiedRegionIds = useMemo(() => {
    const set = new Set<string>();
    usersList.forEach((u) => {
      if (u.isActive && (!userToEdit || u.id !== userToEdit.id)) {
        u.assignedRegions?.forEach((r: any) => set.add(r.id));
      }
    });
    return set;
  }, [usersList, userToEdit]);

  // Consolidate all available stores (prefer real database stores, fallback to context stores)
  const allStores = useMemo(() => {
    if (realStores.length > 0) return realStores;
    return availableStores.map((s) => ({
      id: s.id,
      storeCode: s.storeCode,
      name: s.name,
      city: s.city,
      regionId: s.regionId,
      storeFormat: "SUPERMARKET" as const,
      address: s.city,
      isActive: true,
    }));
  }, [realStores, availableStores]);

  // Filter only UNASSIGNED stores (plus current manager's assigned store if editing)
  const unassignedStores = useMemo(() => {
    return allStores.filter(
      (s) =>
        !occupiedStoreIds.has(s.id) ||
        userToEdit?.assignedStores?.some((as: any) => as.id === s.id),
    );
  }, [allStores, occupiedStoreIds, userToEdit]);

  // Filter only UNASSIGNED regions (plus current manager's assigned region if editing)
  const unassignedRegions = useMemo(() => {
    return realRegions.filter(
      (r) =>
        !occupiedRegionIds.has(r.id) ||
        userToEdit?.assignedRegions?.some((ar: any) => ar.id === r.id),
    );
  }, [realRegions, occupiedRegionIds, userToEdit]);

  // Find currently selected single store and single region objects for display
  const currentSelectedStore = useMemo(() => {
    if (selectedStoreIds.length === 0) return null;
    return allStores.find((s) => s.id === selectedStoreIds[0]) || null;
  }, [selectedStoreIds, allStores]);

  const currentSelectedRegion = useMemo(() => {
    if (selectedRegionIds.length === 0) return null;
    return realRegions.find((r) => r.id === selectedRegionIds[0]) || null;
  }, [selectedRegionIds, realRegions]);

  const onSubmit = async (data: AdminCreateUserFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && userToEdit) {
        await authApi.updateUser(userToEdit.id, {
          fullName: data.fullName,
          mobileNumber: data.mobileNumber,
          role: data.role,
          isActive: userToEdit.isActive,
          storeIds: data.role === "STORE_MANAGER" ? (data.storeIds || []).slice(0, 1) : [],
          regionIds: data.role === "REGIONAL_MANAGER" ? (data.regionIds || []).slice(0, 1) : [],
        });
        toast.success(`User ${data.fullName} updated successfully.`);
      } else {
        await authApi.createUser({
          ...data,
          storeIds: data.role === "STORE_MANAGER" ? (data.storeIds || []).slice(0, 1) : [],
          regionIds: data.role === "REGIONAL_MANAGER" ? (data.regionIds || []).slice(0, 1) : [],
        });
        toast.success(
          `Manager onboarded successfully. Credentials emailed to ${data.email}.`,
        );
      }
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(
        err.message ||
          "Failed to process manager account. Ensure email and mobile are unique.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200 text-slate-900 shadow-xl rounded-xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
            <UserPlus className="size-5 text-blue-600" />
            {isEditing ? "Edit Enterprise Manager" : "Onboard New Enterprise Manager"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            {isEditing
              ? `Update profile details and operational scope for ${userToEdit?.fullName}.`
              : "Create an enterprise account. The system will dispatch an automated welcome email with login credentials."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Full Name & Corporate Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Full Name
                <span className="text-red-500 font-bold ml-0.5">*</span>
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
              <Label className="text-xs font-semibold text-slate-700">
                Corporate Email
                <span className="text-red-500 font-bold ml-0.5">*</span>
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
              <Label className="text-xs font-semibold text-slate-700">
                Indian Mobile Number
                <span className="text-red-500 font-bold ml-0.5">*</span>
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
              <Label className="text-xs font-semibold text-slate-700">
                Role Authority
                <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(val) => {
                  setValue("role", val as UserRole, { shouldValidate: true });
                  // Clear opposite scope when switching roles
                  if (val === "STORE_MANAGER") {
                    setValue("regionIds", []);
                  } else if (val === "REGIONAL_MANAGER") {
                    setValue("storeIds", []);
                  } else {
                    setValue("storeIds", []);
                    setValue("regionIds", []);
                  }
                }}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select operational role" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="STORE_MANAGER">Store Manager</SelectItem>
                  <SelectItem value="REGIONAL_MANAGER">Regional Manager</SelectItem>
                  <SelectItem value="EXECUTIVE">Executive (HQ)</SelectItem>
                  <SelectItem value="ADMIN">System Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Operational Scope Assignment */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Globe2 className="size-3.5 text-blue-500" />
              Operational Scope Assignment
              {(selectedRole === "STORE_MANAGER" || selectedRole === "REGIONAL_MANAGER") && (
                <span className="text-red-500 font-bold ml-0.5">*</span>
              )}
            </Label>

            {/* Scope 1: STORE_MANAGER Single Store Selector */}
            {selectedRole === "STORE_MANAGER" && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  Assign the single physical store location this Store Manager oversees (showing unassigned stores):
                </p>

                {currentSelectedStore ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-blue-200 bg-blue-50/80 text-xs">
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-semibold text-blue-950">
                          {currentSelectedStore.name}
                        </span>
                        <span className="font-mono text-slate-500 ml-1.5">
                          ({currentSelectedStore.storeCode})
                        </span>
                        {currentSelectedStore.city && (
                          <span className="text-slate-500 ml-1.5">
                            • {currentSelectedStore.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setValue("storeIds", [], { shouldValidate: true })}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 rounded"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    {unassignedStores.length > 0 ? (
                      <DropSearch
                        items={unassignedStores.map((s) => ({
                          id: s.id,
                          label: `${s.name} (${s.storeCode})`,
                          subLabel: s.city || "",
                        }))}
                        value={null}
                        onChange={(val) => {
                          if (val) {
                            setValue("storeIds", [val], { shouldValidate: true });
                          }
                        }}
                        placeholder="Select an unassigned store..."
                        searchPlaceholder="Search store by name, code, or city..."
                        width="w-full"
                      />
                    ) : (
                      <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
                        All stores are currently assigned to active managers. Unassign an existing manager to reallocate.
                      </div>
                    )}
                  </>
                )}

                {errors.storeIds && (
                  <p className="text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {errors.storeIds.message}
                  </p>
                )}
              </div>
            )}

            {/* Scope 2: REGIONAL_MANAGER Single Region Selector */}
            {selectedRole === "REGIONAL_MANAGER" && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  Assign the single territory this Regional Manager oversees (showing unassigned regions):
                </p>

                {currentSelectedRegion ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/80 text-xs">
                    <div className="flex items-center gap-2">
                      <Compass className="size-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-semibold text-emerald-950">
                          {currentSelectedRegion.name}
                        </span>
                        <span className="font-mono text-slate-500 ml-1.5">
                          ({(currentSelectedRegion as any).code || (currentSelectedRegion as any).regionCode})
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setValue("regionIds", [], { shouldValidate: true })}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 rounded"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    {unassignedRegions.length > 0 ? (
                      <DropSearch
                        items={unassignedRegions.map((r: any) => ({
                          id: r.id,
                          label: r.name,
                          subLabel: r.code || r.regionCode || "",
                        }))}
                        value={null}
                        onChange={(val) => {
                          if (val) {
                            setValue("regionIds", [val], { shouldValidate: true });
                          }
                        }}
                        placeholder="Select an unassigned region..."
                        searchPlaceholder="Search region by name or code..."
                        width="w-full"
                      />
                    ) : (
                      <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
                        All regions are currently assigned to active managers. Unassign an existing manager to reallocate.
                      </div>
                    )}
                  </>
                )}

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
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                <Building2 className="size-4 text-blue-600 shrink-0" />
                <span>
                  This role possesses <strong>unrestricted enterprise-wide access</strong>{" "}
                  across all operational regions, stores, financial reports, and inventory balances.
                </span>
              </div>
            )}
          </div>

          {/* Initial Password Fields (Only when Creating) */}
          {!isEditing && (
            <div className="pt-2 border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-blue-600" />
                <Label className="text-xs font-semibold text-slate-700">
                  Initial Password &amp; Credential Dispatch
                </Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600">
                    Temporary Password
                    <span className="text-red-500 font-bold ml-0.5">*</span>
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
                      {showInitialPass ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.initialPassword && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3" />
                      {errors.initialPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600">
                    Confirm Password
                    <span className="text-red-500 font-bold ml-0.5">*</span>
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
                      {showConfirmPass ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3" />
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>

          <DialogFooter className="p-4 border-t border-slate-100 flex-shrink-0 bg-slate-50/50 gap-2 sm:gap-0">
            <StandardButton
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </StandardButton>
            <StandardButton type="submit" variant="default" disabled={isSubmitting}>
              {isSubmitting
                ? "Provisioning Account..."
                : isEditing
                ? "Save Changes"
                : "Create & Send Credentials (✉)"}
            </StandardButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
