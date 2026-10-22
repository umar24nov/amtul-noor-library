"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Mail, Pencil, Power, UserPlus, UserRound } from "lucide-react";
import { cn } from "cn";
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { IDLE_STATE } from "@/lib/action-result";
import type { PanelRole } from "@/components/roles-panel";
import {
  createUserAction,
  resetUserPasswordAction,
  revealUserPasswordAction,
  toggleUserActiveAction,
  updateUserAction,
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
  /** Whether the last password set on this account can be read back. */
  hasStoredPassword: boolean;
};

/** The roles this person may hand out. Full access is only on offer to a full
 *  admin, so a day-to-day manager never sees the admin role in the list. */
function assignableRoles(roles: PanelRole[], fullAccess: boolean): PanelRole[] {
  if (fullAccess) return roles;
  return roles.filter((role) => role.level !== "ADMIN");
}

function RoleOptions({ roles, fullAccess }: { roles: PanelRole[]; fullAccess: boolean }) {
  return (
    <>
      {assignableRoles(roles, fullAccess).map((role) => (
        <SelectItem key={role.id} value={String(role.id)}>
          {role.name} — {role.level === "ADMIN" ? "Full Access" : "Limited"}
        </SelectItem>
      ))}
    </>
  );
}

function AddUserDialog({
  open,
  onOpenChange,
  roles,
  fullAccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: PanelRole[];
  fullAccess: boolean;
}) {
  const [state, formAction] = useActionState(createUserAction, IDLE_STATE);
  const offered = assignableRoles(roles, fullAccess);
  const initialRole = offered.find((role) => role.level === "DAY_TO_DAY") ?? offered[0];
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
            <Input id="user-name" name="name" maxLength={60} />
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
                <RoleOptions roles={roles} fullAccess={fullAccess} />
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
            <PasswordInput
              id="user-password"
              name="password"
              autoComplete="new-password"
              aria-invalid={Boolean(state.fieldErrors?.password)}
            />
            {state.fieldErrors?.password && (
              <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
            )}
            <p className="text-xs text-muted-foreground">
              At least 8 characters. Use the eye button to check it before saving.
            </p>
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
function RoleSelect({ user, roles, fullAccess }: { user: PanelUser; roles: PanelRole[]; fullAccess: boolean }) {
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
        <RoleOptions roles={roles} fullAccess={fullAccess} />
      </SelectContent>
    </Select>
  );
}

function EditUserDialog({
  user,
  roles,
  currentUserId,
  fullAccess,
  onOpenChange,
}: {
  user: PanelUser | null;
  roles: PanelRole[];
  currentUserId: number;
  fullAccess: boolean;
  onOpenChange: (user: PanelUser | null) => void;
}) {
  const [state, formAction] = useActionState(updateUserAction, IDLE_STATE);
  const [roleId, setRoleId] = useState(String(user?.roleId ?? ""));
  const [active, setActive] = useState(user?.active ?? true);

  useEffect(() => {
    if (state.done) {
      toast.success(state.message ?? "Changes saved.");
      onOpenChange(null);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onOpenChange(null)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            {user ? `Change every detail for ${user.email}.` : ""}
          </DialogDescription>
        </DialogHeader>
        {user && (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="userId" value={user.id} />

            <div className="grid gap-1.5">
              <Label htmlFor="edit-user-name">Name (optional)</Label>
              <Input
                id="edit-user-name"
                name="name"
                defaultValue={user.name ?? ""}
                maxLength={60}
              />
              {state.fieldErrors?.name && (
                <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-user-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-user-email"
                name="email"
                type="email"
                defaultValue={user.email}
                autoComplete="off"
                aria-invalid={Boolean(state.fieldErrors?.email)}
              />
              {state.fieldErrors?.email && (
                <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label>Role</Label>
              <input type="hidden" name="roleId" value={roleId} />
              {user.level === "ADMIN" && !fullAccess ? (
                <p className="text-xs text-muted-foreground">
                  {user.roleName} — full access. Only a full-access admin can change this account.
                </p>
              ) : (
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <RoleOptions roles={roles} fullAccess={fullAccess} />
                  </SelectContent>
                </Select>
              )}
              {state.fieldErrors?.roleId && (
                <p className="text-xs text-destructive">{state.fieldErrors.roleId}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-user-password">New password (optional)</Label>
              <PasswordInput
                id="edit-user-password"
                name="password"
                autoComplete="new-password"
                aria-invalid={Boolean(state.fieldErrors?.password)}
              />
              {state.fieldErrors?.password && (
                <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave this blank to keep the current password. At least 8 characters otherwise.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Checkbox
                id="edit-user-active"
                name="active"
                checked={active}
                disabled={user.id === currentUserId}
                onCheckedChange={(checked) => setActive(checked === true)}
                className="mt-0.5"
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">Can sign in</span>
                <span className="text-xs text-muted-foreground">
                  {user.id === currentUserId
                    ? "You cannot turn off your own account."
                    : "Turn this off to keep the record but block sign-in."}
                </span>
              </span>
            </label>

            {state.status === "error" && state.message && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(null)}>
                Cancel
              </Button>
              <SubmitButton pendingLabel="Saving">Save changes</SubmitButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * The password for one account: the last one the owner set, readable back so
 * they do not have to hand out a new one every time they forget it, and a form
 * to set a new one. Reading the password is written to the activity log, so
 * the owner can see afterwards that it was read.
 *
 * Only a full-access admin can read it back, so the read block is not drawn
 * for anybody else. Setting a new one still needs the Users permission.
 */
function PasswordDialog({
  user,
  onOpenChange,
  fullAccess,
}: {
  user: PanelUser | null;
  onOpenChange: (user: PanelUser | null) => void;
  fullAccess: boolean;
}) {
  const [state, formAction] = useActionState(resetUserPasswordAction, IDLE_STATE);
  const [reveal, setReveal] = useState<{
    status: "idle" | "shown";
    password?: string;
    message?: string;
  }>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (state.done) {
      toast.success(state.message ?? "Password updated.");
      onOpenChange(null);
    }
  }, [state, onOpenChange]);

  const showPassword = () => {
    if (!user) return;
    startTransition(async () => {
      const result = await revealUserPasswordAction(user.id);
      if (result.status === "error") {
        setReveal({ status: "idle", message: result.message });
        return;
      }
      setReveal({ status: "shown", password: result.password });
    });
  };

  const copyPassword = async () => {
    if (!reveal.password) return;
    try {
      await navigator.clipboard.writeText(reveal.password);
      toast.success("Password copied.");
    } catch {
      toast.error("Could not copy the password.");
    }
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onOpenChange(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password for {user?.email}</DialogTitle>
          <DialogDescription>
            {fullAccess
              ? "Read back the last password you set, or set a new one."
              : "Set a new password for this account."}
          </DialogDescription>
        </DialogHeader>
        {user && (
          <div className="grid gap-4">
            {fullAccess ? (
              <div className="grid gap-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Last password you set</span>
                  {reveal.status === "shown" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReveal({ status: "idle" })}
                    >
                      Hide
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={showPassword}
                      disabled={pending}
                    >
                      {pending ? "Reading…" : "Show password"}
                    </Button>
                  )}
                </div>
                {reveal.status === "shown" && reveal.password ? (
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={reveal.password}
                      aria-label="The password you last set"
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={copyPassword}
                      aria-label="Copy the password"
                      title="Copy the password"
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Hidden. Only a full-access admin can read it, and every read is written to the
                    activity log.
                  </p>
                )}
                {reveal.message && <p className="text-xs text-destructive">{reveal.message}</p>}
                {!user.hasStoredPassword && !reveal.message && (
                  <p className="text-xs text-muted-foreground">
                    No password has been saved for this account yet. Set one now and you will be able
                    to read it back next time.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Only a full-access admin can read a password back. You can still set a new one.
              </p>
            )}

            <form action={formAction} className="grid gap-4">
              <input type="hidden" name="userId" value={user.id} />
              <div className="grid gap-1.5">
                <Label htmlFor="reset-password">
                  Set a new password <span className="text-destructive">*</span>
                </Label>
                <PasswordInput
                  id="reset-password"
                  name="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(state.fieldErrors?.password)}
                />
                {state.fieldErrors?.password && (
                  <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  At least 8 characters. Use the eye button to check it before saving.
                </p>
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
          </div>
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
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    if (!user) return;
    const fd = new FormData();
    fd.set("userId", String(user.id));
    startTransition(async () => {
      const state = await toggleUserActiveAction(fd);
      if (state.status === "error") {
        toast.error(state.message ?? "Something went wrong.");
        return;
      }
      toast.success(state.message ?? "Saved.");
      onOpenChange(null);
    });
  };

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
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button type="button" onClick={toggle} disabled={pending}>
            {pending ? "Saving…" : user?.active ? "Deactivate" : "Reactivate"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** One account as a card: who it is, its role, when it last signed in, and the
 *  row actions. Works the same on a phone and a wide screen. Clicking the card
 *  opens the full editor; the controls inside stop the click so they still do
 *  their own job. */
function UserCard({
  user,
  roles,
  isSelf,
  fullAccess,
  onEdit,
  onPassword,
  onToggle,
}: {
  user: PanelUser;
  roles: PanelRole[];
  isSelf: boolean;
  fullAccess: boolean;
  onEdit: () => void;
  onPassword: () => void;
  onToggle: () => void;
}) {
  const isAdmin = user.level === "ADMIN";
  // An admin account is a full admin's to change. Somebody who only holds the
  // Users permission can see it, but cannot edit it, move it, or reset it.
  const locked = isAdmin && !fullAccess;

  return (
    <div
      onClick={locked ? undefined : onEdit}
      className={cn(
        "flex cursor-pointer flex-col gap-4 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-foreground/20",
        !user.active && "opacity-70 hover:opacity-100",
        locked && "cursor-default",
      )}
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

      <div onClick={(event) => event.stopPropagation()}>
        {locked ? (
          <p className="text-xs text-muted-foreground">
            {user.roleName} — full access. Only a full-access admin can change this account.
          </p>
        ) : (
          <RoleSelect user={user} roles={roles} fullAccess={fullAccess} />
        )}
      </div>

      <div
        onClick={(event) => event.stopPropagation()}
        className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-border pt-3"
      >
        <Button type="button" variant="secondary" size="sm" onClick={onEdit} disabled={locked}>
          <Pencil className="size-3.5" />
          Edit details
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onPassword} disabled={locked}>
          <KeyRound className="size-3.5" />
          Password
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggle}
          disabled={isSelf || locked}
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
  fullAccess,
}: {
  users: PanelUser[];
  roles: PanelRole[];
  currentUserId: number;
  fullAccess: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PanelUser | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<PanelUser | null>(null);
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
              Everyone who can sign in, and the role each one uses. Click a card to edit every
              detail.
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} className="sm:shrink-0">
          <UserPlus className="size-4" />
          Add user
        </Button>
        <AddUserDialog
          key={addOpen ? "add-open" : "add-closed"}
          open={addOpen}
          onOpenChange={setAddOpen}
          roles={roles}
          fullAccess={fullAccess}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            roles={roles}
            isSelf={user.id === currentUserId}
            fullAccess={fullAccess}
            onEdit={() => setEditTarget(user)}
            onPassword={() => setPasswordTarget(user)}
            onToggle={() => setToggleTarget(user)}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Click a card to change the name, email, role, password, or whether the account can sign in.
        The Password button sets a new password and, for a full-access admin, shows the last one
        you set. A deactivated account keeps its history but cannot sign in.
      </p>

      <EditUserDialog
        key={`edit-${editTarget?.id ?? "none"}`}
        user={editTarget}
        roles={roles}
        currentUserId={currentUserId}
        fullAccess={fullAccess}
        onOpenChange={setEditTarget}
      />
      <PasswordDialog
        key={`password-${passwordTarget?.id ?? "none"}`}
        user={passwordTarget}
        onOpenChange={setPasswordTarget}
        fullAccess={fullAccess}
      />
      <ToggleActiveDialog user={toggleTarget} onOpenChange={setToggleTarget} />
    </section>
  );
}
