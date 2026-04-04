/*
  Warnings:

  - You are about to drop the column `marketing_agreed_at` on the `UserAgreement` table. All the data in the column will be lost.
  - You are about to drop the column `push_enabled_at` on the `UserAgreement` table. All the data in the column will be lost.
  - You are about to drop the column `third_party_agreed_at` on the `UserAgreement` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('WEB_CHROME', 'WEB_SAFARI', 'WEB_FIREFOX', 'APP_IOS', 'APP_ANDROID');

-- AlterTable
ALTER TABLE "UserAgreement" DROP COLUMN "marketing_agreed_at",
DROP COLUMN "push_enabled_at",
DROP COLUMN "third_party_agreed_at",
ADD COLUMN     "is_marketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_push" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_third_party" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketing_updated_at" DATE,
ADD COLUMN     "push_updated_at" DATE,
ADD COLUMN     "third_party_updated_at" DATE;

-- CreateTable
CREATE TABLE "UserDevice" (
    "device_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "fcm_token" VARCHAR(255) NOT NULL,
    "device_type" "DeviceType" NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("device_id")
);

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
