"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
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
          {role.name} — {role.level === "ADMIN" ? "full admin" : "day-to-day"}
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
            They sign in with this email and password. You can change either later.
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
      <SelectTrigger size="sm" className="w-40" aria-label={`Role for ${user.email}`}>
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
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="size-4" />
          Add user
        </Button>
        <AddUserDialog open={addOpen} onOpenChange={setAddOpen} roles={roles} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-background">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left">
              <th className="px-3 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Email</th>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Last signed in</th>
              <th className="px-3 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className={user.active ? undefined : "opacity-60"}>
                <td className="px-3 py-2.5 font-medium">
                  {user.name ?? "—"}
                  {user.id === currentUserId && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                  )}
                </td>
                <td className="px-3 py-2.5">{user.email}</td>
                <td className="px-3 py-2.5">
                  <RoleSelect user={user} roles={roles} />
                </td>
                <td className="px-3 py-2.5">
                  {user.active ? (
                    <Badge variant="outline">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Deactivated</Badge>
                  )}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{user.lastLoginAt ?? "Never"}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setResetTarget(user)}
                    >
                      Reset password
                    </Button>
                    {user.id === currentUserId ? (
                      <Button type="button" variant="outline" size="sm" disabled>
                        {user.active ? "Deactivate" : "Activate"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setToggleTarget(user)}
                      >
                        {user.active ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Pick a role from the list to move someone between roles. A deactivated account keeps its
        history but cannot sign in.
      </p>

      <ResetPasswordDialog user={resetTarget} onOpenChange={setResetTarget} />
      <ToggleActiveDialog user={toggleTarget} onOpenChange={setToggleTarget} />
    </section>
  );
}
