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
import { SubmitButton } from "@/components/submit-button";
import { IDLE_STATE, type ActionState } from "@/lib/action-result";
import {
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
} from "@/app/(app)/users/role-actions";
import type { RoleLevel } from "@/generated/prisma/enums";

export type PanelRole = {
  id: number;
  name: string;
  level: RoleLevel;
  builtIn: boolean;
  userCount: number;
};

const LEVEL_LABELS: Record<RoleLevel, string> = {
  ADMIN: "Full admin",
  DAY_TO_DAY: "Day-to-day",
};

const LEVEL_DESCRIPTIONS: Record<RoleLevel, string> = {
  ADMIN: "Everything, including users and the monthly fee",
  DAY_TO_DAY: "Members, applications, payments, reminders and seats",
};

/** Runs a form action and reports the outcome as a toast. */
async function runAndToast(action: (formData: FormData) => Promise<ActionState>, fd: FormData) {
  const state = await action(fd);
  if (state.status === "error") toast.error(state.message ?? "Something went wrong.");
  else if (state.status === "success") toast.success(state.message ?? "Saved.");
}

/** The name + level fields shared by the add and edit dialogs. */
function RoleFields({
  state,
  defaultName = "",
  defaultLevel = "DAY_TO_DAY",
  lockLevel = false,
}: {
  state: ActionState;
  defaultName?: string;
  defaultLevel?: RoleLevel;
  lockLevel?: boolean;
}) {
  const [level, setLevel] = useState<RoleLevel>(defaultLevel);

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
        <Label>
          Can do <span className="text-destructive">*</span>
        </Label>
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
          <RoleFields state={state} />
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
                  <Badge variant={role.level === "ADMIN" ? "default" : "secondary"}>
                    {LEVEL_LABELS[role.level]}
                  </Badge>
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
        Day-to-day roles can see and record everything in the library except this page and the
        monthly fee. Full admins can do everything.
      </p>

      <EditRoleDialog role={editTarget} onOpenChange={setEditTarget} />
      <DeleteRoleDialog role={deleteTarget} onOpenChange={setDeleteTarget} />
    </section>
  );
}
