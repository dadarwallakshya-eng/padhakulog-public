-- Placeholder campus for invited testers (TESTER_EMAILS secret). Inactive, so it never
-- shows up in the public registry or lets anyone sign in by domain.
INSERT OR IGNORE INTO "Institution" ("id", "name", "shortName", "institutionType", "primaryDomain", "approvedDomains", "isActive", "createdAt", "updatedAt") VALUES
('tester', 'Padhaku Log Tester', 'Tester', 'Guest', 'tester.padhakulog.invalid', '[]', 0, 1793140000000, 1793140000000);
