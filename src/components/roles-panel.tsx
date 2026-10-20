"use client";

import { useEffect, useState, useActionState } from "react";
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
  ADMIN: "Full access",
  DAY_TO_DAY: "Standard",
};

const LEVEL_DESCRIPTIONS: Record<RoleLevel, string> = {
  ADMIN: "Everything, always — the areas below are all included",
  DAY_TO_DAY: "Only the areas selected below",
};

const TOTAL_AREAS = PERMISSION_GROUPS.reduce((n, g) => n + g.options.length, 0);

/** Runs a form action and reports the outcome as a toast. */
async function runAndToast(action: (formData: FormData) => Promise<ActionState>, fd: FormData) {
  const state = await action(fd);
  if (state.status === "error") toast.error(state.message ?? "Something went wrong.");
  else if (state.status === "success") toast.success(state.message ?? "Saved.");
}

/**
 * The name, level and permission selector shared by the add and edit dialogs.
 *
 * A full-access role is shown with every area selected and the boxes locked: the
 * level alone grants everything, so the ticks are a picture of that rather than a
 * choice. On a standard role the boxes are the choice, grouped by job, and each
 * group has an "All" box that selects or clears the whole group.
 */
function RoleFields({
  state,
  defaultName = "",
  defaultLevel = "DAY_TO_DAY",
  defaultPermissions = [],
  lockLevel = false,
}: {
  state: ActionState;
  defaultName?: string;
  defaultLevel?: RoleLevel;
  defaultPermissions?: PermissionKey[];
  lockLevel?: boolean;
}) {
  const [level, setLevel] = useState<RoleLevel>(defaultLevel);
  const [permissions, setPermissions] = useState<PermissionKey[]>(defaultPermissions);

  const isAdmin = level === "ADMIN";
  const effective = isAdmin ? PERMISSION_GROUPS.flatMap((g) => g.options.map((o) => o.key)) : permissions;

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
      {/* Left rail: the role's identity — its name and the access level that
          decides whether the area list even applies. */}
      <div className="grid content-start gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="role-name">
            Role name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role-name"
            name="name"
            placeholder="e.g. Front desk"
            maxLength={30}
            defaultValue={defaultName}
            aria-invalid={Boolean(state.fieldErrors?.name)}
          />
          {state.fieldErrors?.name && (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label>Access level</Label>
          <input type="hidden" name="level" value={level} />
          <Select
            value={level}
            onValueChange={(value) => setLevel(value as RoleLevel)}
            disabled={lockLevel}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAY_TO_DAY">{LEVEL_LABELS.DAY_TO_DAY}</SelectItem>
              <SelectItem value="ADMIN">{LEVEL_LABELS.ADMIN}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{LEVEL_DESCRIPTIONS[level]}</p>
          {lockLevel && (
            <p className="text-xs text-muted-foreground">
              The built-in admin role always keeps full access. Its name can still be changed.
            </p>
          )}
          {state.fieldErrors?.level && (
            <p className="text-xs text-destructive">{state.fieldErrors.level}</p>
          )}
        </div>
      </div>

      {/* Right side: the areas this role can open. */}
      <div className="grid content-start gap-3">
        <div className="flex items-center justify-between gap-2">
          <Label>What this role can do</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {effective.length} of {TOTAL_AREAS} areas
          </span>
        </div>

        {isAdmin && (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            A full-access role can do everything, so every area is on and cannot be turned off.
            Choose &ldquo;{LEVEL_LABELS.DAY_TO_DAY}&rdquo; to select areas one by one.
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
                      disabled={isAdmin}
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
                          disabled={isAdmin}
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
              lockLevel={role.builtIn}
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
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={runAndToast.bind(null, deleteRoleAction)} className="contents">
            <input type="hidden" name="roleId" value={role?.id ?? 0} />
            <AlertDialogAction type="submit" onClick={() => onOpenChange(null)}>
              Delete
            </AlertDialogAction>
          </form>
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
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/15 transition-colors hover:border-foreground/30">
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
        A standard role can only open the areas shown on its card; the rest are hidden from the
        sidebar and blocked at the address bar. Full-access roles can do everything.
      </p>

      <EditRoleDialog role={editTarget} onOpenChange={setEditTarget} />
      <DeleteRoleDialog role={deleteTarget} onOpenChange={setDeleteTarget} />
    </section>
  );
}
