import type { Metadata } from "next";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  LockKeyhole,
  Receipt,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { MemberStatusBadge } from "@/components/status-badges";
import { formatDate, formatINR, formatMonth } from "@/lib/format";
import { PayFeesButton } from "../pay-fees-button";
import { getFeeSummary, getSeatLabel, loadPortal } from "../portal-data";
import { PortalGate, PortalShell } from "../portal-shell";
import {
  Accent,
  Detail,
  PortalHero,
  SectionHeading,
  StatCard,
  type Tone,
} from "../portal-ui";