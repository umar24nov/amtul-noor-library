"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/login/actions";

function LogoutButtonInner({ compact }: { compact?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      variant="outline"
      size={compact ? "icon" : "sm"}
      className={compact ? "size-10" : "w-full justify-start"}
      disabled={pending}
      title="Sign out"
    >
      <LogOut className="size-4" />
      {!compact && "Sign out"}
    </Button>
  );
}

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <LogoutButtonInner compact={compact} />
    </form>
  );
}