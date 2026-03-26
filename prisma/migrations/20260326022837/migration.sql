/*
  Warnings:

  - You are about to drop the column `deadline_alarm` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `task_alarm` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `nickname` on the `User` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(30)`.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "deadline_alarm",
DROP COLUMN "task_alarm",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
ALTER COLUMN "nickname" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "phone_num" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "provider_id" SET DATA TYPE VARCHAR(100);

-- CreateTable
CREATE TABLE "UserAgreement" (
    "agreement_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "terms_agreed_at" DATE NOT NULL,
    "push_enabled_at" DATE,
    "third_party_agreed_at" DATE,
    "marketing_agreed_at" DATE,

    CONSTRAINT "UserAgreement_pkey" PRIMARY KEY ("agreement_id")
);

-- CreateTable
CREATE TABLE "UserAlarmSetting" (
    "user_alarm_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "deadline_alarm" INTEGER NOT NULL DEFAULT 24,
    "task_alarm" INTEGER NOT NULL DEFAULT 24,

    CONSTRAINT "UserAlarmSetting_pkey" PRIMARY KEY ("user_alarm_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAgreement_user_id_key" ON "UserAgreement"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserAlarmSetting_user_id_key" ON "UserAlarmSetting"("user_id");

-- AddForeignKey
ALTER TABLE "UserAgreement" ADD CONSTRAINT "UserAgreement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlarmSetting" ADD CONSTRAINT "UserAlarmSetting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
