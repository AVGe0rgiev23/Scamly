// The small drawing next to each answer of the call check (line icons, no emoji).
// Decoration only: the words are always shown, and screen readers skip the icons.

import {
  ArrowDownFromLine,
  Check,
  CircleHelp,
  CreditCard,
  Landmark,
  Package,
  Siren,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ChoiceOption } from "@/components/ui/BigChoice";

// Answer value → icon. The values of different questions never collide except
// "other", which gets the same question mark everywhere.
const ICONS: Record<string, ReactNode> = {
  police: <Siren />,
  relative: <Users />,
  official: <Landmark />,
  courier: <Package />,
  other: <CircleHelp />,
  yes: <Check />,
  no: <X />,
  unsure: <CircleHelp />,
  courier_or_stranger: <UserRound />,
  throw: <ArrowDownFromLine />,
  bank_transfer: <CreditCard />,
};

export function withIcons(options: ChoiceOption[]): ChoiceOption[] {
  return options.map((option) => ({ ...option, icon: ICONS[option.value] }));
}
