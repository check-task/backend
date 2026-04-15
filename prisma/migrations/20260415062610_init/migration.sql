/*
  Warnings:

  - You are about to alter the column `folder_title` on the `Folder` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(10)`.
  - You are about to alter the column `title` on the `Task` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(10)`.

*/
-- AlterTable
ALTER TABLE "Folder" ALTER COLUMN "folder_title" SET DATA TYPE VARCHAR(10);

-- AlterTable
ALTER TABLE "Reference" ADD COLUMN     "file_name" VARCHAR(255);

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "title" SET DATA TYPE VARCHAR(10);
