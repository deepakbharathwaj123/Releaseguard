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

export const DEMO_USERS: UserProfile[] = [
  {
    id: "user-sre-1",
    name: "Sarah Chen",
    email: "sarah.chen@releaseguard.enterprise",
    role: "SRE_COMMANDER",
    roleTitle: "Principal SRE & Release Commander",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
    clearanceLevel: "TIER_1_RESTRICTED",
    organization: "ReleaseGuard Corp",
    department: "Cloud Reliability & Production Operations",
    permissions: {
      canOverrideVerdict: true,
      canExecuteRollback: true,
      canTriggerSimulations: true,
      canConfigureWebhooks: true,
      canApproveFinOps: true,
    },
    mfaEnabled: true,
    lastLogin: "Active Now",
  },
  {
    id: "user-sec-2",
    name: "Marcus Vance",
    email: "m.vance@releaseguard.enterprise",
    role: "SECURITY_LEAD",
    roleTitle: "Staff Security Champion (SOC2 / PCI)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    clearanceLevel: "TIER_2_AUDIT",
    organization: "ReleaseGuard Corp",
    department: "InfoSec & Cryptographic Compliance",
    permissions: {
      canOverrideVerdict: true,
      canExecuteRollback: false,
      canTriggerSimulations: true,
      canConfigureWebhooks: false,
      canApproveFinOps: false,
    },
    mfaEnabled: true,
    lastLogin: "14 mins ago",
  },
  {
    id: "user-arch-3",
    name: "Elena Rostova",
    email: "elena.rostova@releaseguard.enterprise",
    role: "LEAD_ARCHITECT",
    roleTitle: "Lead Cloud Platform Architect",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80",
    clearanceLevel: "TIER_3_ELEVATED",
    organization: "ReleaseGuard Corp",
    department: "Platform Engineering & FinOps",
    permissions: {
      canOverrideVerdict: false,
      canExecuteRollback: true,
      canTriggerSimulations: true,
      canConfigureWebhooks: true,
      canApproveFinOps: true,
    },
    mfaEnabled: true,
    lastLogin: "1 hour ago",
  },
  {
    id: "user-dev-4",
    name: "Alex Rivera",
    email: "alex.rivera@releaseguard.enterprise",
    role: "CONTRIBUTOR",
    roleTitle: "Senior Software Engineer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    clearanceLevel: "TIER_4_STANDARD",
    organization: "ReleaseGuard Corp",
    department: "Core Banking Payments API",
    permissions: {
      canOverrideVerdict: false,
      canExecuteRollback: false,
      canTriggerSimulations: false,
      canConfigureWebhooks: false,
      canApproveFinOps: false,
    },
    mfaEnabled: false,
    lastLogin: "3 hours ago",
  },
];
