import { env } from "./env";

export const config = {
  app: {
    env: env.NODE_ENV,
    port: env.PORT,
    url: env.APP_URL,
    isProduction: env.NODE_ENV === "production",
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
  },
  db: {
    url: env.DATABASE_URL,
  },
  mail: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM,
  },
  azure: {
    tenantId: env.AZURE_TENANT_ID,
    clientId: env.AZURE_CLIENT_ID,
    clientSecret: env.AZURE_CLIENT_SECRET,
  },
  gemini: {
    apiKey: env.GOOGLE_API_KEY || env.GEMINI_API_KEY,
  },
  scheduler: {
    enabled: env.AUTO_SCAN_ENABLED,
    mode: env.AUTO_SCAN_MODE,
    waveHours: env.AUTO_SCAN_WAVE_HOURS.split(",").map((h) => h.trim()).filter(Boolean),
    hourlyEnabled: env.AUTO_SCAN_HOURLY_ENABLED,
    hourlyIntervalMinutes: env.AUTO_SCAN_HOURLY_INTERVAL_MINUTES,
    autoExpire: env.AUTO_SCAN_AUTO_EXPIRE,
  },
};
