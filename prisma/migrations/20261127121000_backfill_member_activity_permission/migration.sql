-- Keep today's access unchanged: every role that could manage users could also
-- open Member Activity. The owner can untick the new permission afterwards.
UPDATE "Role"
SET "permissions" = array_append("permissions", 'MEMBER_ACTIVITY'::"Permission")
WHERE 'USERS' = ANY("permissions")
  AND NOT ('MEMBER_ACTIVITY'::"Permission" = ANY("permissions"));
