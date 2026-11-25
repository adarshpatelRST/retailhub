import { PrismaClient } from "@prisma/client";
import { logger } from "./utils/logger";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

try {
  if (process.env.NODE_ENV === "production") {
    prisma = new PrismaClient();
  } else {
    if (!global.__prisma) {
      global.__prisma = new PrismaClient({
        log: ["error", "warn"],
      });
    }
    prisma = global.__prisma;
  }
} catch (err) {
  logger.warn("PrismaClient initial instantiation warning:", err);
  prisma = new PrismaClient();
}

export { prisma };
export default prisma;
