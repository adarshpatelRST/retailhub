import { config } from "./config";
import { logger } from "./utils/logger";

export interface AzureUserProfile {
  oid: string;
  email: string;
  name: string;
  upn: string;
}

export class AzureAuthService {
  isConfigured(): boolean {
    return Boolean(config.azure.tenantId && config.azure.clientId);
  }

  async validateAzureToken(bearerToken: string): Promise<AzureUserProfile | null> {
    if (!this.isConfigured()) {
      logger.warn("Azure SSO is not configured in this environment.");
      return null;
    }
    // Stub implementation for Azure AD token validation
    logger.info("Validating Azure AD bearer token...");
    return {
      oid: "azure-ad-oid-sample",
      email: "corporate.user@retailhub.com",
      name: "Corporate User",
      upn: "corporate.user@retailhub.com",
    };
  }
}

export const azureAuthService = new AzureAuthService();
