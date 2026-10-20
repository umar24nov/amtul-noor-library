"use client";

import { useEffect, useState, useActionState } from "react";
import { toast } from "sonner";
import { Pencil, ShieldCheck, Trash2 } from "lucide-react";
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
  ADMIN: "Full admin",
  DAY_TO_DAY: "Limited",
};

const LEVEL_DESCRIPTIONS: Record<RoleLevel, string> = {
  ADMIN: "Everything, always — the tick list below does not apply",
  DAY_TO_DAY: "Only the areas ticked below",
};

/** Runs a form action and reports the outcome as a toast. */
async function runAndToast(action: (formData: FormData) => Promise<ActionState>, fd: FormData) {
  const state = await action(fd);
  if (state.status === "error") toast.error(state.message ?? "Something went wrong.");
  else if (state.status === "success") toast.success(state.message ?? "Saved.");
}

/**
 * The name, level and permission tick list shared by the add and edit dialogs.
 *
 * A full admin is shown with every box ticked and the boxes disabled: the level
 * alone grants everything, so the ticks are a picture of that rather than a
 * choice. On a limited role the boxes are the choice, grouped by job, and each
 * group has a "full access" box that ticks or clears the whole group.
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
    <>
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
            The built-in admin role always stays a full admin. Its name can be changed.
          </p>
        )}
        {state.fieldErrors?.level && (
          <p className="text-xs text-destructive">{state.fieldErrors.level}</p>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <Label>What this role can do</Label>
          <span className="text-xs text-muted-foreground">
            {effective.length} of {PERMISSION_GROUPS.reduce((n, g) => n + g.options.length, 0)} areas
          </span>
        </div>

        {isAdmin && (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            A full admin can do everything, so every area is on and cannot be turned off. Choose
            &ldquo;{LEVEL_LABELS.DAY_TO_DAY}&rdquo; to tick areas one by one.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {PERMISSION_GROUPS.map((group) => {
            const keys = group.options.map((o) => o.key);
            const allOn = keys.every((key) => effective.includes(key));
            return (
              <div key={group.title} className="grid content-start gap-2 rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{group.title}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox
                      checked={allOn}
                      disabled={isAdmin}
                      onCheckedChange={() => toggleGroup(keys, allOn)}
                    />
                    All
                  </label>
                </div>
                <div className="grid gap-1.5">
                  {group.options.map((option) => {
                    const on = effective.includes(option.key);
                    return (
                      <label
                        key={option.key}
                        className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 hover:bg-muted/60"
                      >
                        {/* Only ticked areas submit a value, which is exactly the
                            list the action saves. A full admin sends them all. */}
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
    </>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a role</DialogTitle>
          <DialogDescription>
            Name it yourself and choose what it can do. You then assign it to people.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          {/* Starts from the usual library work so the owner only removes what a
              role should not do, rather than ticking everything from scratch. */}
          <RoleFields state={state} defaultPermissions={[...DAY_TO_DAY_DEFAULTS]} />
          {state.status === "error" && state.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Adding">Add role</SubmitButton>
          </div>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit role</DialogTitle>
          <DialogDescription>{role ? `Rename "${role.name}" or change what it can do.` : ""}</DialogDescription>
        </DialogHeader>
        {role && (
          <form action={formAction} className="grid gap-4">
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(null)}>
                Cancel
              </Button>
              <SubmitButton pendingLabel="Saving">Save role</SubmitButton>
            </div>
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
          <AlertDialogTitle>{`Delete the role "${role?.name}"?`}</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. It is only allowed when nobody is on the role.
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

export function RolesPanel({ roles }: { roles: PanelRole[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PanelRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PanelRole | null>(null);

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">Roles</h2>
          <p className="text-sm text-muted-foreground">
            Name the roles yourself and choose what each can do.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <ShieldCheck className="size-4" />
          Add role
        </Button>
        <AddRoleDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-background">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left">
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium">Can do</th>
              <th className="px-3 py-2.5 font-medium">People</th>
              <th className="px-3 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="px-3 py-2.5 font-medium">
                  {role.name}
                  {role.builtIn && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(built-in)</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {role.level === "ADMIN" ? (
                    <Badge variant="default">Everything</Badge>
                  ) : role.permissions.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Nothing yet</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((key) => (
                        <Badge key={key} variant="secondary">
                          {permissionLabel(key)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{role.userCount}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTarget(role)}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    {role.builtIn ? (
                      <Button type="button" variant="outline" size="sm" disabled>
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(role)}
                      >
                        <Trash2 className="size-4" />
                        Delete
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
        A limited role can only open the areas ticked above; anything left unticked is hidden from
        the sidebar and blocked by URL. Full admins can do everything.
      </p>

      <EditRoleDialog role={editTarget} onOpenChange={setEditTarget} />
      <DeleteRoleDialog role={deleteTarget} onOpenChange={setDeleteTarget} />
    </section>
  );
}
