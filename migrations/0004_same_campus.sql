-- Off by default: people from your own campus are never matched with you
-- unless both of you switch this on.
ALTER TABLE "User" ADD COLUMN "meetSameCampus" BOOLEAN NOT NULL DEFAULT false;
