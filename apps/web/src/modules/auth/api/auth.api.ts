import { apiClient, ApiEnvelope } from "@/api/client";
import { UserRole } from "@/context/AuthContext";
import {
  AdminCreateUserFormData,
  AdminResetPasswordFormData,
  AdminUpdateUserFormData,
  ChangePasswordFormData,
  LoginFormData,
} from "@/lib/validation-rules";

export interface AuthLoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    mobileNumber: string;
    avatarUrl: string | null;
    role: UserRole;
    assignedStoreIds: string[];
    assignedRegionIds: string[];
  };
}

export interface UserSummaryDto {
  id: string;
  email: string;
  fullName: string;
  mobileNumber: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedStores: Array<{ id: string; name: string; storeCode: string }>;
  assignedRegions: Array<{ id: string; name: string; code: string }>;
}

export const authApi = {
  login: async (payload: LoginFormData): Promise<AuthLoginResponse> => {
    const res = await apiClient.post<ApiEnvelope<AuthLoginResponse>>(
      "/auth/login",
      payload,
    );
    return res.data.data;
  },

  getMe: async (): Promise<AuthLoginResponse["user"]> => {
    const res = await apiClient.get<ApiEnvelope<AuthLoginResponse["user"]>>(
      "/auth/me",
    );
    return res.data.data;
  },

  changePassword: async (
    payload: ChangePasswordFormData,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<
      ApiEnvelope<{ success: boolean; message: string }>
    >("/auth/change-password", payload);
    return res.data.data;
  },

  getUsers: async (params?: {
    role?: string;
    search?: string;
  }): Promise<UserSummaryDto[]> => {
    const res = await apiClient.get<ApiEnvelope<UserSummaryDto[]>>("/users", {
      params,
    });
    return res.data.data;
  },

  getUserById: async (id: string): Promise<UserSummaryDto> => {
    const res = await apiClient.get<ApiEnvelope<UserSummaryDto>>(`/users/${id}`);
    return res.data.data;
  },

  createUser: async (
    payload: AdminCreateUserFormData,
  ): Promise<UserSummaryDto> => {
    const res = await apiClient.post<ApiEnvelope<UserSummaryDto>>(
      "/users",
      payload,
    );
    return res.data.data;
  },

  updateUser: async (
    id: string,
    payload: AdminUpdateUserFormData,
  ): Promise<UserSummaryDto> => {
    const res = await apiClient.put<ApiEnvelope<UserSummaryDto>>(
      `/users/${id}`,
      payload,
    );
    return res.data.data;
  },

  resetPassword: async (
    id: string,
    payload: AdminResetPasswordFormData,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post<
      ApiEnvelope<{ success: boolean; message: string }>
    >(`/users/${id}/reset-password`, payload);
    return res.data.data;
  },

  toggleUserStatus: async (
    id: string,
    isActive: boolean,
  ): Promise<UserSummaryDto> => {
    const res = await apiClient.patch<ApiEnvelope<UserSummaryDto>>(
      `/users/${id}/status`,
      { isActive },
    );
    return res.data.data;
  },
};
