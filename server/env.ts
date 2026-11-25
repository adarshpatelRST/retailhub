import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const booleanEnv = (defaultVal = false) =>
  z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true" || val === "1")
    .default(defaultVal);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default(
    "sqlserver://localhost:1433;database=retailhub;user=sa;password=YourPassword123;encrypt=true;trustServerCertificate=true;",
  ),
  JWT_SECRET: z.string().default("retailhub-enterprise-jwt-super-secret-key-2025"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  APP_URL: z.string().default("http://localhost:5173"),
  SMTP_HOST: z.string().default("smtp.ethereal.email"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  MAIL_FROM: z.string().default('"RetailHub System" <noreply@retailhub.com>'),
  AZURE_TENANT_ID: z.string().optional(),
  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  // Automated Rebalance Scheduler
  AUTO_SCAN_ENABLED: booleanEnv(true),
  AUTO_SCAN_MODE: z.enum(["WAVES", "HOURLY", "BOTH"]).default("WAVES"),
  AUTO_SCAN_WAVE_HOURS: z.string().default("02:00,06:00,14:00"),
  AUTO_SCAN_HOURLY_ENABLED: booleanEnv(false),
  AUTO_SCAN_HOURLY_INTERVAL_MINUTES: z.coerce.number().default(60),
  AUTO_SCAN_AUTO_EXPIRE: booleanEnv(true),
});

export const env = envSchema.parse(process.env);
