/*
  Warnings:

  - You are about to drop the column `folder_id` on the `Task` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[folder_id]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "SubTask" DROP CONSTRAINT "SubTask_assignee_id_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_folder_id_fkey";

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "folder_id" INTEGER;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "folder_id";

-- CreateIndex
CREATE UNIQUE INDEX "Member_folder_id_key" ON "Member"("folder_id");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "Folder"("folder_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "Member"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;
