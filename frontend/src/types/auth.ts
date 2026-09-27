export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "SRE_COMMANDER" | "SECURITY_LEAD" | "LEAD_ARCHITECT" | "CONTRIBUTOR";
  roleTitle: string;
  avatar: string;
  clearanceLevel: "TIER_1_RESTRICTED" | "TIER_2_AUDIT" | "TIER_3_ELEVATED" | "TIER_4_STANDARD";
  organization: string;
  department: string;
  permissions: {
    canOverrideVerdict: boolean;
    canExecuteRollback: boolean;
    canTriggerSimulations: boolean;
    canConfigureWebhooks: boolean;
    canApproveFinOps: boolean;
  };
  mfaEnabled: boolean;
  lastLogin: string;
}