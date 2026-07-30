-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "attendees" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Output" ADD COLUMN     "datePrepared" TEXT,
ADD COLUMN     "minutesPreparedBy" TEXT;
