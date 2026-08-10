-- CreateTable
CREATE TABLE "SubTaskAssignee" (
    "sub_task_assignee_id" SERIAL NOT NULL,
    "sub_task_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubTaskAssignee_pkey" PRIMARY KEY ("sub_task_assignee_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubTaskAssignee_sub_task_id_member_id_key" ON "SubTaskAssignee"("sub_task_id", "member_id");

-- AddForeignKey
ALTER TABLE "SubTaskAssignee" ADD CONSTRAINT "SubTaskAssignee_sub_task_id_fkey" FOREIGN KEY ("sub_task_id") REFERENCES "SubTask"("sub_task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubTaskAssignee" ADD CONSTRAINT "SubTaskAssignee_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: 기존 SubTask.assignee_id 값을 SubTaskAssignee 조인 테이블로 이관
INSERT INTO "SubTaskAssignee" ("sub_task_id", "member_id")
SELECT "sub_task_id", "assignee_id"
FROM "SubTask"
WHERE "assignee_id" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "SubTask" DROP CONSTRAINT "SubTask_assignee_id_fkey";

-- AlterTable
ALTER TABLE "SubTask" DROP COLUMN "assignee_id";
