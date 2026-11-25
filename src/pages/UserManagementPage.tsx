import * as React from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
import { StandardButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Switch } from "@/components/ui/switch";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import {
  ModuleFilterBar,
  ModuleFilterGrid,
  ModuleFilterItem,
} from "@/components/ui/ModuleFilterBar";
import { authApi, UserSummaryDto } from "@/api/auth.api";
import { CreateEditUserModal } from "@/components/modals/CreateEditUserModal";
import { ResetPasswordModal } from "@/components/modals/ResetPasswordModal";
import { UserRole } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";

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
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modal States
  const [createEditModalOpen, setCreateEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserSummaryDto | null>(null);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<UserSummaryDto | null>(null);

  // Fetch users via TanStack Query with fallback
  const { data: users = INITIAL_FALLBACK_USERS, isLoading, refetch } = useQuery({
    queryKey: ["users", debouncedSearch, roleFilter],
    queryFn: async () => {
      try {
        const result = await authApi.getUsers({
          search: debouncedSearch.trim() || undefined,
          role: roleFilter !== "ALL" ? roleFilter : undefined,
        });
        return result.length > 0 ? result : INITIAL_FALLBACK_USERS;
      } catch {
        return INITIAL_FALLBACK_USERS;
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
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
    return users.filter((u: UserSummaryDto) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.mobileNumber.toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, debouncedSearch]);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

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

  const columns = React.useMemo<ServerColumn<UserSummaryDto>[]>(
    () => [
      {
        key: "fullName",
        header: "EMPLOYEE / MANAGER",
        sortable: false,
        render: (user) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-slate-900">{user.fullName}</div>
              <div className="text-[11px] text-slate-400 font-mono">
                ID: {user.id.slice(0, 12)}...
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "contact",
        header: "CONTACT DETAILS",
        sortable: false,
        render: (user) => (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Mail className="size-3 text-slate-400 shrink-0" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Phone className="size-3 text-slate-400 shrink-0" />
              <span>+91 {user.mobileNumber}</span>
            </div>
          </div>
        ),
      },
      {
        key: "role",
        header: "ROLE AUTHORITY",
        sortable: false,
        render: (user) => (
          <StatusBadge
            variant={getRoleBadgeVariant(user.role)}
            label={user.role.replace(/_/g, " ")}
          />
        ),
      },
      {
        key: "scope",
        header: "OPERATIONAL SCOPE ASSIGNMENT",
        sortable: false,
        render: (user) => {
          if (user.role === "EXECUTIVE" || user.role === "ADMIN") {
            return (
              <div className="flex items-center gap-1.5 text-blue-600 font-medium">
                <Building2 className="size-3.5" />
                <span>Enterprise-Wide (HQ)</span>
              </div>
            );
          }
          if (user.role === "REGIONAL_MANAGER") {
            return (
              <div className="flex flex-wrap gap-1">
                {(user.assignedRegions?.length ?? 0) > 0 ? (
                  user.assignedRegions!.map((reg: any) => (
                    <span
                      key={reg.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-800"
                    >
                      <Compass className="size-3" />
                      {reg.name}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-[11px]">No regions assigned</span>
                )}
              </div>
            );
          }
          return (
            <div className="flex flex-wrap gap-1">
              {(user.assignedStores?.length ?? 0) > 0 ? (
                user.assignedStores!.map((store: any) => (
                  <span
                    key={store.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-medium text-slate-700"
                  >
                    <Store className="size-3 text-blue-500" />
                    {store.name} ({store.storeCode})
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-[11px]">No stores assigned</span>
              )}
            </div>
          );
        },
      },
      {
        key: "isActive",
        header: "STATUS",
        sortable: false,
        render: (user) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={user.isActive}
              onCheckedChange={(checked) =>
                toggleStatusMutation.mutate({
                  id: user.id,
                  nextStatus: checked,
                })
              }
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200 border-2 border-transparent data-[state=unchecked]:border-red-400 cursor-pointer"
            />
            <span
              className={`text-[11px] font-semibold ${
                user.isActive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {user.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        header: "ACTIONS",
        align: "right",
        sortable: false,
        render: (user) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenReset(user)}
              title="Reset Password & Email Credentials"
              className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-amber-600 transition-colors shadow-2xs"
            >
              <KeyRound className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenEdit(user)}
              title="Edit User & Reassign Scope"
              className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors shadow-2xs"
            >
              <Edit3 className="size-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [getRoleBadgeVariant, toggleStatusMutation],
  );

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
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="pl-9 h-10 text-xs font-sans bg-white border-slate-300"
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
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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

        {/* User Directory Table using ServerDataTable */}
        <ServerDataTable
          data={paginatedUsers}
          columns={columns}
          loading={isLoading}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredUsers.length}
          onPageChange={setPage}
          emptyMessage="No matching users found."
        />
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

export const UserManagementPage = UserManagementView;
export default UserManagementPage;
