-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK', 'SUBTASK', 'MEMBER', 'NOTIFICATION', 'OTHER');

-- AlterTable
ALTER TABLE "UserAlarm" ADD COLUMN     "type" "NotificationType";
