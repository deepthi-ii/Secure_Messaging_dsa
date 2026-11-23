import { BookOpen, KeyRound, LayoutDashboard, MessagesSquare, Network, ShieldAlert, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, description: "Metrics and security events" },
  { href: "/messaging", label: "Messaging demo", icon: MessagesSquare, description: "Send and replay messages" },
  { href: "/merkle", label: "Merkle verification", icon: Network, description: "Batch integrity proofs" },
  { href: "/keys", label: "Key management", icon: KeyRound, description: "Session keys and rotation" },
  { href: "/replay", label: "Replay protection", icon: ShieldAlert, description: "Message-ID window" },
  { href: "/about", label: "About the project", icon: BookOpen, description: "Objectives and disclaimer" },
];
