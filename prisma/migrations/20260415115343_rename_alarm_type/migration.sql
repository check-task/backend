/*
  Warnings:

  - The `type` column on the `UserAlarm` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AlarmType" AS ENUM ('TASK', 'SUBTASK', 'MEMBER', 'NOTIFICATION', 'OTHER');

-- AlterTable
ALTER TABLE "UserAlarm" DROP COLUMN "type",
ADD COLUMN     "type" "AlarmType";

-- DropEnum
DROP TYPE "NotificationType";
