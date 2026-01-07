/*
  Warnings:

  - You are about to alter the column `created_at` on the `Comment` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `Communication` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `Communication` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `Folder` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `Log` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `Log` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `Member` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `Reference` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `Reference` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `SubTask` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `SubTask` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `Task` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `Task` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `User` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `updated_at` on the `User` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `deleted_at` on the `User` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - The primary key for the `UserAlarm` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `notice_id` on the `UserAlarm` table. All the data in the column will be lost.
  - You are about to alter the column `alarm_date` on the `UserAlarm` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to alter the column `created_at` on the `UserAlarm` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - Added the required column `alarm_id` to the `UserAlarm` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Comment` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `Communication` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `Folder` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `Log` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `Member` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE `Reference` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `SubTask` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `Task` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MODIFY `updated_at` DATETIME NULL,
    MODIFY `deleted_at` DATETIME NULL;

-- AlterTable
ALTER TABLE `UserAlarm` DROP PRIMARY KEY,
    DROP COLUMN `notice_id`,
    ADD COLUMN `alarm_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `is_read` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `set_time` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `sub_task_id` INTEGER NULL,
    ADD COLUMN `task_id` INTEGER NULL,
    MODIFY `alarm_date` DATETIME NOT NULL,
    MODIFY `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD PRIMARY KEY (`alarm_id`);

-- AddForeignKey
ALTER TABLE `UserAlarm` ADD CONSTRAINT `UserAlarm_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `Task`(`task_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAlarm` ADD CONSTRAINT `UserAlarm_sub_task_id_fkey` FOREIGN KEY (`sub_task_id`) REFERENCES `SubTask`(`sub_task_id`) ON DELETE CASCADE ON UPDATE CASCADE;
