"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import { Pencil, ShieldCheck, ShieldHalf, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import { IDLE_STATE, type ActionState } from "@/lib/action-result";
import {
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
} from "@/app/(app)/users/role-actions";
import { DAY_TO_DAY_DEFAULTS, PERMISSION_GROUPS, permissionLabel } from "@/lib/permission-defs";
import type { PermissionKey } from "@/lib/permission-defs";
import type { RoleLevel } from "@/generated/prisma/enums";

export type PanelRole = {
  id: number;
  name: string;
  level: RoleLevel;
  builtIn: boolean;
  userCount: number;
  /** The permissions the role has, in key order. A full admin lists all of them. */
  permissions: PermissionKey[];
  /** Every key, in order, so the editor renders the full set. */
  allPermissions: PermissionKey[];
};

const LEVEL_LABELS: Record<RoleLevel, string> = {
  ADMIN: "Full Access",
  DAY_TO_DAY: "Limited",
  VIEW_ONLY: "View only",
};

const TOTAL_AREAS = PERMISSION_GROUPS.reduce((n, g) => n + g.options.length, 0);

/**
 * The name and permission selector shared by the add and edit dialogs.
 *
 * The ticks are the access level: every area selected means Full Access, any
 * gap means Limited. Areas are grouped by job, and each group has an "All" box
 * that selects or clears the whole group. Only the built-in owner role is
 * locked, so it can be renamed without ever losing full access.
 */
function RoleFields({
  state,
  defaultName = "",
  defaultLevel = "DAY_TO_DAY",
  defaultPermissions = [],
  allPermissions = [],
  lockLevel = false,
  preserveLimited = false,
}: {
  state: ActionState;
  defaultName?: string;
  defaultLevel?: RoleLevel;
  defaultPermissions?: PermissionKey[];
  /** The complete list, used to show an older Admin role with every area on. */
  allPermissions?: PermissionKey[];
  lockLevel?: boolean;
  preserveLimited?: boolean;
}) {
  // A full-access role is full access by level, even when its stored tick list
  // predates a newly added area. Show every area so saving cannot downgrade it
  // by accident; removing a tick is how an ordinary Admin role becomes Limited.
  const [permissions, setPermissions] = useState<PermissionKey[]>(
    defaultLevel === "ADMIN" && allPermissions.length > 0
      ? [...allPermissions]
      : defaultPermissions,
  );

  const effective = permissions;
  const fullAccess = effective.length === TOTAL_AREAS;

  function toggle(key: PermissionKey) {
    setPermissions((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  }

  function toggleGroup(keys: PermissionKey[], allOn: boolean) {
    setPermissions((current) =>
      allOn
        ? current.filter((key) => !keys.includes(key))
        : Array.from(new Set([...current, ...keys])),
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-6">
      {/* Left rail: the role's identity and the one-line result of its ticks. */}
      <div className="grid content-start gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="role-name">
            Role name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role-name"
            name="name"
            maxLength={30}
            defaultValue={defaultName}
            aria-invalid={Boolean(state.fieldErrors?.name)}
          />
          {state.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>

        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {fullAccess
            ? lockLevel
              ? "The built-in admin role always has Full Access."
              : preserveLimited
                ? "Every area is selected. This existing Limited role stays Limited when saved."
                : "Every area is selected — this role will have Full Access."
            : "Select every area to give this role Full Access."}
        </p>
        {lockLevel && (
          <p className="text-xs text-muted-foreground">
            The built-in admin role always keeps Full Access. Its name can still be changed.
          </p>
        )}
      </div>

      {/* Right side: the areas this role can open. */}
      <div className="grid content-start gap-3">
        <div className="flex items-center justify-between gap-2">
          <Label>What this role can do</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {effective.length} of {TOTAL_AREAS} areas
          </span>
        </div>

        {fullAccess && (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            {lockLevel
              ? "The built-in admin role keeps every area on."
              : preserveLimited
                ? "This role was created as Limited, so saving it keeps Limited access."
                : "All areas are on. Untick any area to make this a Limited role."}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {PERMISSION_GROUPS.map((group) => {
            const keys = group.options.map((o) => o.key);
            const allOn = keys.every((key) => effective.includes(key));
            return (
              <div
                key={group.title}
                className="grid content-start gap-2 rounded-xl border border-border bg-muted/30 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{group.title}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted">
                    <Checkbox
                      checked={allOn}
                      disabled={lockLevel}
                      onCheckedChange={() => toggleGroup(keys, allOn)}
                    />
                    All
                  </label>
                </div>
                <div className="grid gap-0.5">
                  {group.options.map((option) => {
                    const on = effective.includes(option.key);
                    return (
                      <label
                        key={option.key}
                        className="flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-background"
                      >
                        {/* Only selected areas submit a value, which is exactly the
                            list the action saves. A full-access role sends them all. */}
                        {on && <input type="hidden" name="permissions" value={option.key} />}
                        <Checkbox
                          checked={on}
                          disabled={lockLevel}
                          onCheckedChange={() => toggle(option.key)}
                          className="mt-0.5"
                        />
                        <span className="grid">
                          <span className="text-sm">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.hint}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AddRoleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, formAction] = useActionState(createRoleAction, IDLE_STATE);

  useEffect(() => {
    if (state.done) {
      toast.success(state.message ?? "Role added.");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>
            Give the role a name and choose the areas it can open. You can assign it to people
            afterwards.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-5">
          {/* Starts from the usual library work so the owner only removes what a
              role should not do, rather than selecting everything from scratch. */}
          <RoleFields state={state} defaultPermissions={[...DAY_TO_DAY_DEFAULTS]} />
          {state.status === "error" && state.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Adding">Add role</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditRoleDialog({
  role,
  onOpenChange,
}: {
  role: PanelRole | null;
  onOpenChange: (role: PanelRole | null) => void;
}) {
  const [state, formAction] = useActionState(updateRoleAction, IDLE_STATE);

  useEffect(() => {
    if (state.done) {
      toast.success(state.message ?? "Role updated.");
      onOpenChange(null);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={Boolean(role)} onOpenChange={(open) => !open && onOpenChange(null)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit role</DialogTitle>
          <DialogDescription>
            {role ? `Rename “${role.name}” or change the areas it can open.` : ""}
          </DialogDescription>
        </DialogHeader>
        {role && (
          <form action={formAction} className="grid gap-5">
            <input type="hidden" name="roleId" value={role.id} />
            <RoleFields
              state={state}
              defaultName={role.name}
              defaultLevel={role.level}
              defaultPermissions={role.permissions}
              allPermissions={role.allPermissions}
              lockLevel={role.builtIn}
              preserveLimited={role.level !== "ADMIN"}
            />
            {state.status === "error" && state.message && (
              <p className="text-sm text-destructive">{state.message}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(null)}>
                Cancel
              </Button>
              <SubmitButton pendingLabel="Saving">Save role</SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteRoleDialog({
  role,
  onOpenChange,
}: {
  role: PanelRole | null;
  onOpenChange: (role: PanelRole | null) => void;
}) {
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!role) return;
    // Build the FormData from the role captured when the dialog opened. The
    // old version submitted a hidden input inside the alert dialog, but the
    // dialog unmounts on click before the form serialises, so the action saw
    // no roleId at all and reported "Please check the highlighted fields."
    const fd = new FormData();
    fd.set("roleId", String(role.id));
    startTransition(async () => {
      const state = await deleteRoleAction(fd);
      if (state.status === "error") {
        toast.error(state.message ?? "Could not delete the role.");
        return;
      }
      toast.success(state.message ?? "Role deleted.");
      onOpenChange(null);
    });
  };

  return (
    <AlertDialog open={Boolean(role)} onOpenChange={(open) => !open && onOpenChange(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`Delete the role “${role?.name}”?`}</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. A role can only be deleted when nobody is assigned to it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** One role as a card: its name, level, headcount and the areas it can open. */
function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: PanelRole;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isAdmin = role.level === "ADMIN";
  const LevelIcon = isAdmin ? ShieldCheck : ShieldHalf;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={
              isAdmin
                ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            }
          >
            <LevelIcon className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="font-heading truncate text-sm font-semibold tracking-tight">
                {role.name}
              </h3>
              {role.builtIn && <Badge variant="outline">Built-in</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {LEVEL_LABELS[role.level]} ·{" "}
              {role.userCount === 1 ? "1 person" : `${role.userCount} people`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {isAdmin ? (
          <Badge variant="default" className="gap-1">
            <ShieldCheck className="size-3" aria-hidden="true" />
            Everything
          </Badge>
        ) : role.permissions.length === 0 ? (
          <span className="text-xs text-muted-foreground">No areas selected yet</span>
        ) : (
          role.permissions.map((key) => (
            <Badge key={key} variant="secondary">
              {permissionLabel(key)}
            </Badge>
          ))
        )}
      </div>

      <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={role.builtIn}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function RolesPanel({ roles }: { roles: PanelRole[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PanelRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PanelRole | null>(null);

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <ShieldCheck className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight">Roles</h2>
            <p className="text-sm text-muted-foreground">
              Name your roles and choose the areas each one can open.
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} className="sm:shrink-0">
          <ShieldCheck className="size-4" />
          New role
        </Button>
        <AddRoleDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            onEdit={() => setEditTarget(role)}
            onDelete={() => setDeleteTarget(role)}
          />
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="size-3.5 shrink-0" aria-hidden="true" />
        A Limited role can only open the areas shown on its card; the rest are hidden from the
        sidebar and blocked at the address bar. Ticking every area makes a role Full Access.
      </p>

      <EditRoleDialog role={editTarget} onOpenChange={setEditTarget} />
      <DeleteRoleDialog role={deleteTarget} onOpenChange={setDeleteTarget} />
    </section>
  );
}
