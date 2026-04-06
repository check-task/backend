-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('KAKAO');

-- CreateEnum
CREATE TYPE "SubTaskStatus" AS ENUM ('PENDING', 'PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('PERSONAL', 'TEAM');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('WEB_CHROME', 'WEB_SAFARI', 'WEB_FIREFOX', 'APP_IOS', 'APP_ANDROID');

-- CreateTable
CREATE TABLE "TaskPriority" (
    "priority_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "task_id" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP,

    CONSTRAINT "TaskPriority_pkey" PRIMARY KEY ("priority_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "nickname" VARCHAR(30) NOT NULL,
    "phone_num" VARCHAR(20) NOT NULL,
    "email" VARCHAR(50) NOT NULL,
    "profile_image" VARCHAR(200),
    "password" VARCHAR(50),
    "role" "Role" NOT NULL DEFAULT 'USER',
    "provider" "Provider",
    "provider_id" VARCHAR(100),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "UserAgreement" (
    "agreement_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "terms_agreed_at" DATE NOT NULL,
    "push_updated_at" DATE,
    "is_push" BOOLEAN NOT NULL DEFAULT false,
    "third_party_updated_at" DATE,
    "is_third_party" BOOLEAN NOT NULL DEFAULT false,
    "marketing_updated_at" DATE,
    "is_marketing" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserAgreement_pkey" PRIMARY KEY ("agreement_id")
);

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

-- CreateTable
CREATE TABLE "UserAlarmSetting" (
    "user_alarm_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "deadline_alarm" INTEGER NOT NULL DEFAULT 24,
    "task_alarm" INTEGER NOT NULL DEFAULT 24,

    CONSTRAINT "UserAlarmSetting_pkey" PRIMARY KEY ("user_alarm_id")
);

-- CreateTable
CREATE TABLE "UserAlarm" (
    "alarm_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "task_id" INTEGER,
    "sub_task_id" INTEGER,
    "title" VARCHAR(50) NOT NULL,
    "alarm_content" VARCHAR(50) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "alarm_date" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAlarm_pkey" PRIMARY KEY ("alarm_id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "folder_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "folder_title" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("folder_id")
);

-- CreateTable
CREATE TABLE "Task" (
    "task_id" SERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "deadline" TIMESTAMP NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "is_alarm" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP,
    "invite_code" VARCHAR(50),
    "invite_expired" TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("task_id")
);

-- CreateTable
CREATE TABLE "Member" (
    "member_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "task_id" INTEGER NOT NULL,
    "folder_id" INTEGER,
    "role" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "SubTask" (
    "sub_task_id" SERIAL NOT NULL,
    "assignee_id" INTEGER,
    "task_id" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "end_date" TIMESTAMP NOT NULL,
    "status" "SubTaskStatus" NOT NULL DEFAULT 'PENDING',
    "is_alarm" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP,

    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("sub_task_id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "comment_id" SERIAL NOT NULL,
    "sub_task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "Reference" (
    "data_id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "url" VARCHAR(255),
    "file_url" VARCHAR(255),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("data_id")
);

-- CreateTable
CREATE TABLE "Log" (
    "log_id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "agenda" TEXT,
    "conclusion" TEXT,
    "discussion" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "comu_id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("comu_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskPriority_user_id_task_id_key" ON "TaskPriority"("user_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_user_id_key" ON "User"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deleted_at_idx" ON "User"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "User_provider_provider_id_key" ON "User"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserAgreement_user_id_key" ON "UserAgreement"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_user_id_device_type_key" ON "UserDevice"("user_id", "device_type");

-- CreateIndex
CREATE UNIQUE INDEX "UserAlarmSetting_user_id_key" ON "UserAlarmSetting"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Member_user_id_task_id_key" ON "Member"("user_id", "task_id");

-- AddForeignKey
ALTER TABLE "TaskPriority" ADD CONSTRAINT "TaskPriority_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPriority" ADD CONSTRAINT "TaskPriority_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAgreement" ADD CONSTRAINT "UserAgreement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlarmSetting" ADD CONSTRAINT "UserAlarmSetting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlarm" ADD CONSTRAINT "UserAlarm_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlarm" ADD CONSTRAINT "UserAlarm_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlarm" ADD CONSTRAINT "UserAlarm_sub_task_id_fkey" FOREIGN KEY ("sub_task_id") REFERENCES "SubTask"("sub_task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "Folder"("folder_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "Member"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_sub_task_id_fkey" FOREIGN KEY ("sub_task_id") REFERENCES "SubTask"("sub_task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;
