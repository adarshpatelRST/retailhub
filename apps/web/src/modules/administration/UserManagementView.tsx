import * as React from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Compass,
  Edit3,
  KeyRound,
  Mail,
  Phone,
  Search,
  Shield,
  ShieldAlert,
  Store,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Avatar, AvatarFallback, getInitials } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { StandardButton } from "@/components/ui/StandardButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Switch } from "@/components/ui/switch";
import { authApi, UserSummaryDto } from "../auth/api/auth.api";
import { CreateEditUserModal } from "./components/CreateEditUserModal";
import { ResetPasswordModal } from "./components/ResetPasswordModal";
import { UserRole } from "@/context/AuthContext";

const INITIAL_FALLBACK_USERS: UserSummaryDto[] = [
  {
    id: "usr-admin-ops",
    email: "admin@retailhub.com",
    fullName: "Ananya Deshmukh",
    mobileNumber: "9820990011",
    avatarUrl: null,
    role: "ADMIN",
    isActive: true,
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-10-26T14:32:00.000Z",
    assignedStores: [],
    assignedRegions: [],
  },
  {
    id: "usr-exec-hq",
    email: "executive@retailhub.com",
    fullName: "Vikram Aditya",
    mobileNumber: "9820778899",
    avatarUrl: null,
    role: "EXECUTIVE",
    isActive: true,
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-10-26T13:50:00.000Z",
    assignedStores: [],
    assignedRegions: [],
  },
  {
    id: "usr-rm-west",
    email: "regional.central@retailhub.com",
    fullName: "Priya Nair",
    mobileNumber: "9820445566",
    avatarUrl: null,
    role: "REGIONAL_MANAGER",
    isActive: true,
    createdAt: "2026-02-15T09:30:00.000Z",
    updatedAt: "2026-10-26T14:28:00.000Z",
    assignedStores: [],
    assignedRegions: [
      { id: "reg-central-mp", code: "REG-CENTRAL-MP", name: "Central MP" },
    ],
  },
  {
    id: "usr-sm-bhopal",
    email: "store.bhopal@retailhub.com",
    fullName: "Rajesh Sharma",
    mobileNumber: "9820112233",
    avatarUrl: null,
    role: "STORE_MANAGER",
    isActive: true,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-10-26T14:10:00.000Z",
    assignedStores: [
      {
        id: "store-bpl-001",
        storeCode: "BPL-001",
        name: "Bhopal MP Nagar Store",
      },
    ],
    assignedRegions: [],
  },
];

export const UserManagementView: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modal States
  const [createEditModalOpen, setCreateEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserSummaryDto | null>(null);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<UserSummaryDto | null>(null);

  // Fetch users via TanStack Query with fallback
  const { data: users = INITIAL_FALLBACK_USERS, isLoading, refetch } = useQuery({
    queryKey: ["users", search, roleFilter],
    queryFn: async () => {
      try {
        const result = await authApi.getUsers({
          search: search.trim() || undefined,
          role: roleFilter !== "ALL" ? roleFilter : undefined,
        });
        return result.length > 0 ? result : INITIAL_FALLBACK_USERS;
      } catch {
        return INITIAL_FALLBACK_USERS;
      }
    },
  });

  // Toggle active status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: boolean }) => {
      return authApi.toggleUserStatus(id, nextStatus);
    },
    onSuccess: (updated) => {
      toast.success(
        `User ${updated.fullName} is now ${
          updated.isActive ? "ACTIVE" : "DEACTIVATED"
        }.`,
      );
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update user status.");
    },
  });

  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.mobileNumber.toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, search]);

  const handleOpenCreate = () => {
    setUserToEdit(null);
    setCreateEditModalOpen(true);
  };

  const handleOpenEdit = (user: UserSummaryDto) => {
    setUserToEdit(user);
    setCreateEditModalOpen(true);
  };

  const handleOpenReset = (user: UserSummaryDto) => {
    setUserToReset(user);
    setResetModalOpen(true);
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return "brand";
      case "EXECUTIVE":
        return "info";
      case "REGIONAL_MANAGER":
        return "warning";
      case "STORE_MANAGER":
        return "default";
      default:
        return "neutral";
    }
  };

  return (
    <PageLayout
      title="User Management & Role Governance"
      breadcrumbs={[
        { label: "Administration", href: "/admin/users-roles" },
        { label: "User Directory" },
      ]}
      actions={
        <StandardButton
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white"
        >
          <UserPlus className="size-4" />
          Onboard New Manager
        </StandardButton>
      }
    >
      <div className="space-y-6">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {["ALL", "STORE_MANAGER", "REGIONAL_MANAGER", "EXECUTIVE", "ADMIN"].map(
              (r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    roleFilter === r
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {r === "ALL"
                    ? "All Roles"
                    : r
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ),
            )}
          </div>
        </div>

        {/* User Directory Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Employee / Manager</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Role Authority</th>
                  <th className="py-3 px-4">Operational Scope Assignment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-xs font-bold">
                              {getInitials(user.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">{user.fullName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: {user.id.slice(0, 12)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Mail className="size-3 text-slate-400 shrink-0" />
                          <span>{user.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="size-3 text-slate-400 shrink-0" />
                          <span>+91 {user.mobileNumber}</span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <StatusBadge
                          variant={getRoleBadgeVariant(user.role)}
                          label={user.role.replace(/_/g, " ")}
                        />
                      </td>

                      {/* Operational Scope */}
                      <td className="py-3.5 px-4">
                        {user.role === "EXECUTIVE" || user.role === "ADMIN" ? (
                          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                            <Building2 className="size-3.5" />
                            <span>Enterprise-Wide (HQ)</span>
                          </div>
                        ) : user.role === "REGIONAL_MANAGER" ? (
                          <div className="flex flex-wrap gap-1">
                            {user.assignedRegions.length > 0 ? (
                              user.assignedRegions.map((reg) => (
                                <span
                                  key={reg.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium text-emerald-800 dark:text-emerald-300"
                                >
                                  <Compass className="size-3" />
                                  {reg.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[11px]">
                                No regions assigned
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {user.assignedStores.length > 0 ? (
                              user.assignedStores.map((store) => (
                                <span
                                  key={store.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                                >
                                  <Store className="size-3 text-blue-500" />
                                  {store.name} ({store.storeCode})
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[11px]">
                                No stores assigned
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.isActive}
                            onCheckedChange={(checked) =>
                              toggleStatusMutation.mutate({
                                id: user.id,
                                nextStatus: checked,
                              })
                            }
                          />
                          <span
                            className={`text-[11px] font-semibold ${
                              user.isActive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {user.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReset(user)}
                            title="Reset Password & Email Credentials"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 transition-colors"
                          >
                            <KeyRound className="size-3.5 text-slate-500 hover:text-amber-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            title="Edit User & Reassign Scope"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors"
                          >
                            <Edit3 className="size-3.5 text-slate-500 hover:text-blue-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Onboard / Edit Modal */}
      <CreateEditUserModal
        open={createEditModalOpen}
        onOpenChange={setCreateEditModalOpen}
        userToEdit={userToEdit}
        onSuccess={() => refetch()}
      />

      {/* Password Reset Modal */}
      <ResetPasswordModal
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        user={userToReset}
        onSuccess={() => refetch()}
      />
    </PageLayout>
  );
};
