export type Tier = 'standard' | 'professional' | 'enterprise';

export interface TierLimits {
  maxVehicles: number;
  canSingleVinScan: boolean;
  canExportPdfCertificate: boolean;
  canShareAuditLink: boolean;
  canUploadProofOfRemedy: boolean;
  canBulkImportCsv: boolean;
  canUseWebhooks: boolean;
}

export const TIER_PERMISSIONS: Record<Tier, TierLimits> = {
  standard: {
    maxVehicles: 50,
    canSingleVinScan: false,
    canExportPdfCertificate: false,
    canShareAuditLink: false,
    canUploadProofOfRemedy: false,
    canBulkImportCsv: false,
    canUseWebhooks: false,
  },
  professional: {
    maxVehicles: 250,
    canSingleVinScan: true,
    canExportPdfCertificate: true,
    canShareAuditLink: true,
    canUploadProofOfRemedy: true,
    canBulkImportCsv: true,
    canUseWebhooks: false,
  },
  enterprise: {
    maxVehicles: Infinity,
    canSingleVinScan: true,
    canExportPdfCertificate: true,
    canShareAuditLink: true,
    canUploadProofOfRemedy: true,
    canBulkImportCsv: true,
    canUseWebhooks: true,
  },
};