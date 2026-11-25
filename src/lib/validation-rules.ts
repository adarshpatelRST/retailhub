import { z } from "zod";

/**
 * Enterprise Form Validation & Security Standards
 * Master Regex Constants & Input Blockers
 */
export const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export const indianMobileRegex = /^[6-9]\d{9}$/;

/**
 * Strict Numeric Input Lock:
 * Blocks invalid keystrokes ('e', 'E', '+', '-') and optionally decimals ('.')
 */
export const blockInvalidNumberKeys = (
  e: React.KeyboardEvent<HTMLInputElement>,
  allowDecimals = true,
) => {
  if (["e", "E", "+", "-"].includes(e.key)) {
    e.preventDefault();
  }
  if (!allowDecimals && e.key === ".") {
    e.preventDefault();
  }
};

/**
 * UOM-Aware Quantity Validation Helper:
 * PIECE and PACK must be strict integers.
 * KG and LITRE allow up to 3 decimal places (e.g. 1.250).
 */
export const validateUomQuantity = (
  quantity: number | string,
  unitOfMeasure: "PIECE" | "PACK" | "KG" | "LITRE",
): { valid: boolean; error?: string } => {
  const num = typeof quantity === "string" ? parseFloat(quantity) : quantity;
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: "Quantity must be greater than 0" };
  }

  if (unitOfMeasure === "PIECE" || unitOfMeasure === "PACK") {
    if (!Number.isInteger(num)) {
      return {
        valid: false,
        error: `${unitOfMeasure} products only permit whole integer quantities`,
      };
    }
  } else {
    // KG or LITRE: Max 3 decimals allowed
    const str = num.toString();
    const parts = str.split(".");
    if (parts.length === 2 && parts[1].length > 3) {
      return {
        valid: false,
        error: `${unitOfMeasure} products permit at most 3 decimal places (e.g. 2.750)`,
      };
    }
  }

  return { valid: true };
};

/**
 * Corporate Login Schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email cannot be empty")
    .email("Please enter a valid corporate email address"),
  password: z.string().min(1, "Password cannot be empty"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Self-Service Password Change Schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        strongPasswordRegex,
        "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password cannot be identical to current password",
    path: ["newPassword"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Admin User Onboarding Schema
 */
export const adminCreateUserSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email is required")
      .email("Invalid corporate email format"),
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
        "Must be a valid 10-digit Indian mobile number (e.g. 9820112233)",
      ),
    role: z.enum(["STORE_MANAGER", "REGIONAL_MANAGER", "EXECUTIVE", "ADMIN"]),
    storeIds: z.array(z.string()).optional(),
    regionIds: z.array(z.string()).optional(),
    initialPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        strongPasswordRegex,
        "Must include 1 uppercase, 1 lowercase, 1 number, and 1 special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm initial password"),
  })
  .refine((data) => data.initialPassword === data.confirmPassword, {
    message: "Initial passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.role === "STORE_MANAGER") {
        return Boolean(data.storeIds && data.storeIds.length > 0);
      }
      return true;
    },
    {
      message: "Please assign at least one store for this Store Manager",
      path: ["storeIds"],
    },
  )
  .refine(
    (data) => {
      if (data.role === "REGIONAL_MANAGER") {
        return Boolean(data.regionIds && data.regionIds.length > 0);
      }
      return true;
    },
    {
      message: "Please assign at least one region for this Regional Manager",
      path: ["regionIds"],
    },
  );

export type AdminCreateUserFormData = z.infer<typeof adminCreateUserSchema>;

/**
 * Admin User Edit Schema
 */
export const adminUpdateUserSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100),
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
    role: z.enum(["STORE_MANAGER", "REGIONAL_MANAGER", "EXECUTIVE", "ADMIN"]),
    isActive: z.boolean().default(true),
    storeIds: z.array(z.string()).optional(),
    regionIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.role === "STORE_MANAGER") {
        return Boolean(data.storeIds && data.storeIds.length > 0);
      }
      return true;
    },
    {
      message: "Please assign at least one store for this Store Manager",
      path: ["storeIds"],
    },
  )
  .refine(
    (data) => {
      if (data.role === "REGIONAL_MANAGER") {
        return Boolean(data.regionIds && data.regionIds.length > 0);
      }
      return true;
    },
    {
      message: "Please assign at least one region for this Regional Manager",
      path: ["regionIds"],
    },
  );

export type AdminUpdateUserFormData = z.infer<typeof adminUpdateUserSchema>;

/**
 * Admin Password Reset Schema
 */
export const adminResetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        strongPasswordRegex,
        "Must include 1 uppercase, 1 lowercase, 1 number, and 1 special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm new password"),
    sendEmail: z.boolean().default(true),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AdminResetPasswordFormData = z.infer<
  typeof adminResetPasswordSchema
>;

/**
 * Price Spread Validation (D-Mart Value Retail Pricing):
 * costPrice <= sellingPrice <= mrp
 */
export const productPricingSchema = z
  .object({
    costPrice: z.coerce.number().positive("Cost price must be greater than 0"),
    sellingPrice: z.coerce
      .number()
      .positive("Selling price must be greater than 0"),
    mrp: z.coerce.number().positive("MRP must be greater than 0"),
  })
  .refine((data) => data.costPrice <= data.sellingPrice, {
    message: "Selling price cannot be less than cost price",
    path: ["sellingPrice"],
  })
  .refine((data) => data.sellingPrice <= data.mrp, {
    message: "Selling price cannot exceed Maximum Retail Price (MRP)",
    path: ["sellingPrice"],
  });
