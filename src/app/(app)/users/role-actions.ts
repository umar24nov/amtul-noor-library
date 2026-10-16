"use server";

import { revalidatePath } from "next/cache";
import { errorState, successState, type ActionState } from "@/lib/action-result";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRoleSchema, deleteRoleSchema, fieldErrors, updateRoleSchema } from "@/lib/validators";

function revalidateUsers() {
  revalidatePath("/users");
}

async function adminOnly(): Promise<ActionState | null> {
  const session = await getAdminSession();
  return session ? null : errorState("Only an admin can manage roles.");
}

/** A duplicate name is the one failure worth naming precisely, since the owner
 *  chose the text. Everything else falls back to the generic message. */
function roleError(error: unknown): ActionState {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Unique constraint")) {
    return errorState("A role with that name already exists.");
  }
  return errorState("Something went wrong while saving. Please try again.");
}

function isUniqueNameError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Unique constraint");
}

/** Active admins at the full-admin level, optionally excluding one role so a
 *  level change can be tested against the state it would produce. */
async function countActiveAdmins(excludeRoleId?: number): Promise<number> {
  return prisma.user.count({
    where: {
      active: true,
      role: { level: "ADMIN" },
      ...(excludeRoleId !== undefined ? { roleId: { not: excludeRoleId } } : {}),
    },
  });
}

export async function createRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await adminOnly();
  if (denied) return denied;

  const parsed = createRoleSchema.safeParse({
    name: formData.get("name"),
    level: formData.get("level"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    await prisma.role.create({ data: { name: parsed.data.name, level: parsed.data.level } });
    revalidateUsers();
    return successState(`Role "${parsed.data.name}" added.`);
  } catch (error) {
    if (isUniqueNameError(error)) {
      return errorState("Please check the highlighted fields.", {
        name: "A role with that name already exists",
      });
    }
    return roleError(error);
  }
}

export async function updateRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await adminOnly();
  if (denied) return denied;

  const parsed = updateRoleSchema.safeParse({
    roleId: formData.get("roleId"),
    name: formData.get("name"),
    level: formData.get("level"),
  });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    const role = await prisma.role.findUnique({
      where: { id: parsed.data.roleId },
      select: { id: true, level: true, builtIn: true },
    });
    if (!role) return errorState("That role no longer exists.");

    // The built-in admin role keeps the owner able to manage accounts, so its
    // level is fixed; it may still be renamed.
    if (role.builtIn && parsed.data.level !== "ADMIN") {
      return errorState("The built-in admin role must stay a full admin.");
    }

    if (role.level === "ADMIN" && parsed.data.level !== "ADMIN") {
      // After this change, every active admin in this role loses admin. There
      // must still be an admin outside it.
      const remaining = await countActiveAdmins(role.id);
      if (remaining < 1) {
        return errorState("This would leave no admin. Give someone else full admin first.");
      }
    }

    await prisma.role.update({
      where: { id: role.id },
      data: { name: parsed.data.name, level: parsed.data.level },
    });

    revalidateUsers();
    return successState(`Role updated.`);
  } catch (error) {
    if (isUniqueNameError(error)) {
      return errorState("Please check the highlighted fields.", {
        name: "A role with that name already exists",
      });
    }
    return roleError(error);
  }
}

export async function deleteRoleAction(formData: FormData): Promise<ActionState> {
  const denied = await adminOnly();
  if (denied) return denied;

  const parsed = deleteRoleSchema.safeParse({ roleId: formData.get("roleId") });
  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  try {
    const role = await prisma.role.findUnique({
      where: { id: parsed.data.roleId },
      select: { id: true, name: true, builtIn: true, _count: { select: { users: true } } },
    });
    if (!role) return errorState("That role no longer exists.");

    if (role.builtIn) {
      return errorState("The built-in admin role cannot be deleted.");
    }

    if (role._count.users > 0) {
      return errorState(
        `${role._count.users} ${role._count.users === 1 ? "person is" : "people are"} still on this role. Move them to another role first.`,
      );
    }

    await prisma.role.delete({ where: { id: role.id } });
    revalidateUsers();
    return successState(`Role "${role.name}" deleted.`);
  } catch (error) {
    return roleError(error);
  }
}
