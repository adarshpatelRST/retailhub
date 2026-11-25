import { z } from "zod";

/**
 * Enterprise Security & Regex Patterns
 */
export const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export const indianMobileRegex = /^[6-9]\d{9}$/;

export const UserRoleEnum = z.enum([
  "EXECUTIVE",
  "REGIONAL_MANAGER",
  "STORE_MANAGER",
  "ADMIN",
]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const TransferStatusEnum = z.enum([
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED_IN_TRANSIT",
  "RECEIVED",
  "REJECTED",
  "CANCELLED",
]);
export type TransferStatus = z.infer<typeof TransferStatusEnum>;

export const StockHealthEnum = z.enum([
  "CRITICAL",
  "LOW",
  "HEALTHY",
  "EXCESS",
]);
export type StockHealth = z.infer<typeof StockHealthEnum>;

/**
 * Auth & User Schemas
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email cannot be empty")
    .email("Please enter a valid corporate email"),
  password: z.string().min(1, "Password cannot be empty"),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        strongPasswordRegex,
        "Password must contain 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password cannot be identical to current password",
    path: ["newPassword"],
  });
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const createUserSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100),
    email: z.string().trim().toLowerCase().min(1).email("Invalid email format"),
    mobileNumber: z
      .string()
      .trim()
      .transform((val) =>
        val
          .replace(/[\s\-+]/g, "")
          .replace(/^91/, "")
          .replace(/^0/, ""),
      )
      .refine(
        (val) => indianMobileRegex.test(val),
        "Must be a valid 10-digit Indian mobile number",
      ),
    role: UserRoleEnum,
    storeIds: z.array(z.string()).optional(),
    regionIds: z.array(z.string()).optional(),
    initialPassword: z
      .string()
      .min(8)
      .regex(strongPasswordRegex, "Must satisfy strong password policy"),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.initialPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (d) => (d.role === "STORE_MANAGER" ? Boolean(d.storeIds?.length) : true),
    {
      message: "Please assign at least one store for a Store Manager",
      path: ["storeIds"],
    },
  )
  .refine(
    (d) =>
      d.role === "REGIONAL_MANAGER" ? Boolean(d.regionIds?.length) : true,
    {
      message: "Please assign at least one region for a Regional Manager",
      path: ["regionIds"],
    },
  );
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  mobileNumber: z
    .string()
    .trim()
    .transform((val) =>
      val
        .replace(/[\s\-+]/g, "")
        .replace(/^91/, "")
        .replace(/^0/, ""),
    )
    .refine(
      (val) => indianMobileRegex.test(val),
      "Must be a valid 10-digit Indian mobile number",
    )
    .optional(),
  role: UserRoleEnum.optional(),
  isActive: z.boolean().optional(),
  storeIds: z.array(z.string()).optional(),
  regionIds: z.array(z.string()).optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8)
      .regex(strongPasswordRegex, "Must satisfy strong password policy"),
    confirmPassword: z.string().min(1),
    sendEmail: z.boolean().default(true),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

/**
 * Catalog & Store Schemas
 */
export const productPricingSchema = z
  .object({
    sku: z.string().min(1),
    name: z.string().min(2),
    barcode: z.string().min(8),
    costPrice: z.number().positive(),
    sellingPrice: z.number().positive(),
    mrp: z.number().positive(),
    unitOfMeasure: z.enum(["PIECE", "PACK", "KG", "LITRE"]),
  })
  .refine((d) => d.costPrice <= d.sellingPrice, {
    message: "Selling price cannot be less than cost price",
    path: ["sellingPrice"],
  })
  .refine((d) => d.sellingPrice <= d.mrp, {
    message: "Selling price cannot exceed Maximum Retail Price (MRP)",
    path: ["sellingPrice"],
  });
export type ProductPricingDto = z.infer<typeof productPricingSchema>;

/**
 * Inventory Adjustment & Stock Transfer Schemas
 */
export const stockAdjustmentSchema = z.object({
  storeId: z.string().min(1),
  productId: z.string().min(1),
  adjustmentQuantity: z.number(),
  reason: z.string().min(1),
  currentVersion: z.number().int().positive().optional().default(1),
});
export type StockAdjustmentDto = z.infer<typeof stockAdjustmentSchema>;

export const createTransferSchema = z.object({
  fromStoreId: z.string().min(1),
  toStoreId: z.string().min(1),
  productId: z.string().min(1),
  requestedQuantity: z.number().positive(),
  remarks: z.string().optional(),
});
export type CreateTransferDto = z.infer<typeof createTransferSchema>;

export const actionRecommendationSchema = z.object({
  recommendationId: z.string().min(1),
  actionType: z.enum(["APPROVE", "REJECT", "MODIFY"]),
  modifiedQuantity: z.number().positive().optional(),
  comments: z.string().optional(),
});
export type ActionRecommendationDto = z.infer<typeof actionRecommendationSchema>;

/**
 * Standard API Envelope Interfaces
 */
export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  correlationId: string;
  timestamp: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  path: string;
  method: string;
  correlationId: string;
  timestamp: string;
}

export interface AuthUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  mobileNumber?: string;
  avatarUrl?: string | null;
  assignedRegionIds: string[];
  assignedStoreIds: string[];
}
