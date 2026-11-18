-- An account can now be deleted outright, not only deactivated, so the
-- activity log needs an action to record it. The entry keeps a copy of the
-- email and its user link is set to null by the existing foreign key, so the
-- history of who worked here survives the account.
ALTER TYPE "ActivityAction" ADD VALUE 'DELETED';
