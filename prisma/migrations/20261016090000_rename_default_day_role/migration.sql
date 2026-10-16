-- The seeded day-to-day role was called "Staff". Roles are now named by the
-- owner, and the untouched default should read as its level ("Day-to-day")
-- rather than a fixed staff label.
--
-- Only the original default is renamed: if the owner has already given the role
-- their own name, it is left alone. The NOT EXISTS guard avoids colliding with
-- the unique name if a "Day-to-day" role already exists.
UPDATE "Role"
SET "name" = 'Day-to-day', "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'Staff'
  AND "builtIn" = false
  AND NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'Day-to-day');
