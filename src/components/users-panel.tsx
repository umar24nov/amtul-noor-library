"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import { KeyRound, Mail, Power, UserPlus, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { IDLE_STATE, type ActionState } from "@/lib/action-result";
import type { PanelRole } from "@/components/roles-panel";
import {
  createUserAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
  updateUserRoleAction,
} from "@/app/(app)/users/actions";
import type { RoleLevel } from "@/generated/prisma/enums";

export type PanelUser = {
  id: number;
  name: string | null;
  email: string;
  roleId: number;
  roleName: string;
  level: RoleLevel;
  active: boolean;
  lastLoginAt: string | null;
};

/** Runs a form action and reports the outcome as a toast, for the row actions
 *  that have no fields to validate inline. */
async function runAndToast(action: (formData: FormData) => Promise<ActionState>, fd: FormData) {
  const state = await action(fd);
  if (state.status === "error") toast.error(state.message ?? "Something went wrong.");
  else if (state.status === "success") toast.success(state.message ?? "Saved.");
}

function RoleOptions({ roles }: { roles: PanelRole[] }) {
  return (
    <>
      {roles.map((role) => (
        <SelectItem key={role.id} value={String(role.id)}>
          {role.name} — {role.level === "ADMIN" ? "full access" : "standard"}
        </SelectItem>
      ))}
    </>
  );
}

function AddUserDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: PanelRole[];
}) {
  const [state, formAction] = useActionState(createUserAction, IDLE_STATE);
  const initialRole = roles.find((role) => role.level === "DAY_TO_DAY") ?? roles[0];
  const [roleId, setRoleId] = useState(String(initialRole?.id ?? ""));

  useEffect(() => {
    if (state.done) {
      toast.success(state.message ?? "Account created.");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>
            They sign in with this email and password. You can change either one later.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="user-name">Name (optional)</Label>
            <Input id="user-name" name="name" placeholder="e.g. Sister" maxLength={60} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="user-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="user-email"
              name="email"
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(state.fieldErrors?.email)}
            />
            {state.fieldErrors?.email && (
              <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label>
              Role <span className="text-destructive">*</span>
            </Label>
            <input type="hidden" name="roleId" value={roleId} />
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <RoleOptions roles={roles} />
              </SelectContent>
            </Select>
            {state.fieldErrors?.roleId && (
              <p className="text-xs text-destructive">{state.fieldErrors.roleId}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="user-password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="user-password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(state.fieldErrors?.password)}
            />
            {state.fieldErrors?.password && (
              <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
            )}
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          {state.status === "error" && state.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Creating">Create account</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A role picker for one row. Choosing a role calls the server action straight
 *  away, so changing someone's role is one action rather than a form plus a
 *  save. The action is invoked directly with FormData so there is no hidden
 *  field that could still hold the previous choice when it is read. */
function RoleSelect({ user, roles }: { user: PanelUser; roles: PanelRole[] }) {
  const [value, setValue] = useState(String(user.roleId));
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(next) => {
        if (next === value) return;
        const previous = value;
        setValue(next);
        startTransition(async () => {
          const fd = new FormData();
          fd.set("userId", String(user.id));
          fd.set("roleId", next);
          const state = await updateUserRoleAction(fd);
          if (state.status === "error") {
            toast.error(state.message ?? "Something went wrong.");
            setValue(previous);
          } else if (state.status === "success") {
            toast.success(state.message ?? "Saved.");
          }
        });
      }}
    >
      <SelectTrigger size="sm" className="w-full" aria-label={`Role for ${user.email}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <RoleOptions roles={roles} />
      </SelectContent>
    </Select>
  );
}

function ResetPasswordDialog({
  user,
  onOpenChange,
}: {
  user: PanelUser | null;
  onOpenChange: (user: PanelUser | null) => void;
}) {
  const [state, formAction] = useActionState(resetUserPasswordAction, IDLE_STATE);

  useEffect(() => {
    if (state.done) {
      toast.success(state.message ?? "Password updated.");
      onOpenChange(null);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onOpenChange(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>{user ? `Set a new password for ${user.email}.` : ""}</DialogDescription>
        </DialogHeader>
        {user && (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="userId" value={user.id} />
            <div className="grid gap-1.5">
              <Label htmlFor="reset-password">
                New password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reset-password"
                name="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(state.fieldErrors?.password)}
              />
              {state.fieldErrors?.password && (
                <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            {state.status === "error" && state.message && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(null)}>
                Cancel
              </Button>
              <SubmitButton pendingLabel="Saving">Save password</SubmitButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ToggleActiveDialog({
  user,
  onOpenChange,
}: {
  user: PanelUser | null;
  onOpenChange: (user: PanelUser | null) => void;
}) {
  return (
    <AlertDialog open={Boolean(user)} onOpenChange={(open) => !open && onOpenChange(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {user?.active ? "Deactivate this account?" : "Reactivate this account?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user?.active
              ? `${user.email} will not be able to sign in again until reactivated.`
              : `${user?.email} will be able to sign in again.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={runAndToast.bind(null, toggleUserActiveAction)} className="contents">
            <input type="hidden" name="userId" value={user?.id ?? 0} />
            <AlertDialogAction type="submit" onClick={() => onOpenChange(null)}>
              {user?.active ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** One account as a card: who it is, its role, when it last signed in, and the
 *  row actions. Works the same on a phone and a wide screen. */
function UserCard({
  user,
  roles,
  isSelf,
  onReset,
  onToggle,
}: {
  user: PanelUser;
  roles: PanelRole[];
  isSelf: boolean;
  onReset: () => void;
  onToggle: () => void;
}) {
  const isAdmin = user.level === "ADMIN";
  return (
    <div
      className={
        user.active
          ? "flex flex-col gap-4 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-foreground/20"
          : "flex flex-col gap-4 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5 opacity-70 transition-colors hover:opacity-100"
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={
            isAdmin
              ? "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              : "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
          }
        >
          <UserRound className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-heading truncate text-sm font-semibold tracking-tight">
              {user.name ?? user.email.split("@")[0]}
            </h3>
            {isSelf && <Badge variant="outline">You</Badge>}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{user.email}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last signed in: {user.lastLoginAt ?? "Never"}
          </p>
        </div>
        <Badge variant={user.active ? "outline" : "destructive"} className="shrink-0">
          {user.active ? "Active" : "Off"}
        </Badge>
      </div>

      <RoleSelect user={user} roles={roles} />

      <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          <KeyRound className="size-3.5" />
          Reset password
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggle}
          disabled={isSelf}
          className="text-muted-foreground hover:text-foreground"
        >
          <Power className="size-3.5" />
          {user.active ? "Deactivate" : "Activate"}
        </Button>
      </div>
    </div>
  );
}

export function UsersPanel({
  users,
  roles,
  currentUserId,
}: {
  users: PanelUser[];
  roles: PanelRole[];
  currentUserId: number;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<PanelUser | null>(null);
  const [toggleTarget, setToggleTarget] = useState<PanelUser | null>(null);

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <UserRound className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight">People</h2>
            <p className="text-sm text-muted-foreground">
              Everyone who can sign in, and the role each one uses.
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} className="sm:shrink-0">
          <UserPlus className="size-4" />
          Add user
        </Button>
        <AddUserDialog open={addOpen} onOpenChange={setAddOpen} roles={roles} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            roles={roles}
            isSelf={user.id === currentUserId}
            onReset={() => setResetTarget(user)}
            onToggle={() => setToggleTarget(user)}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Pick a role to move someone between roles right away. A deactivated account keeps its
        history but cannot sign in.
      </p>

      <ResetPasswordDialog user={resetTarget} onOpenChange={setResetTarget} />
      <ToggleActiveDialog user={toggleTarget} onOpenChange={setToggleTarget} />
    </section>
  );
}
