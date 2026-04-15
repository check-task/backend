// prisma/seed.js
import { prisma } from "../src/db.config.js";
import dayjs from "dayjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { AlarmType } from "../src/constants/alarmType.js";

dotenv.config();

const args = process.argv.slice(2);
const tokensOnly = args.includes("--tokens-only");

async function main() {
  if (tokensOnly) {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, nickname: true, email: true },
      orderBy: { id: "asc" },
    });

    const jwtSecret = process.env.JWT_SECRET || "dev-secret";
    console.log("\n🔑 테스트용 JWT 토큰 (Authorization 헤더에 사용):");
    users.forEach((user, index) => {
      const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: "7d" });
      console.log(
        `  ${index + 1}. ${user.nickname} (ID: ${user.id}, Email: ${user.email})`,
      );
      console.log(`     Authorization: Bearer ${token}\n`);
    });
    return;
  }
  console.log("🌱 시드 데이터 생성 시작...");

  console.log("🗑️  기존 데이터 삭제 중...");
  await prisma.userAlarm.deleteMany();
  await prisma.taskPriority.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.subTask.deleteMany();
  await prisma.member.deleteMany();
  await prisma.task.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.userAgreement.deleteMany();
  await prisma.userAlarmSetting.deleteMany();
  await prisma.user.deleteMany();

  // 1. User + UserAlarmSetting
  console.log("👤 유저 생성 중...");
  const users = await Promise.all([
    prisma.user.create({
      data: {
        nickname: "홍길동",
        phoneNum: "010-1234-5678",
        email: "hong@example.com",
        alarmSetting: {
          create: { deadlineAlarm: 24, taskAlarm: 24 },
        },
      },
    }),
    prisma.user.create({
      data: {
        nickname: "김철수",
        phoneNum: "010-2345-6789",
        email: "kim@example.com",
        alarmSetting: {
          create: { deadlineAlarm: 12, taskAlarm: 12 },
        },
      },
    }),
    prisma.user.create({
      data: {
        nickname: "이영희",
        phoneNum: "010-3456-7890",
        email: "lee@example.com",
        alarmSetting: {
          create: { deadlineAlarm: 48, taskAlarm: 48 },
        },
      },
    }),
  ]);

  console.log(`✅ ${users.length}명의 유저 생성 완료`);

  // 2. Folder
  console.log("📁 폴더 생성 중...");
  const folders = await Promise.all([
    prisma.folder.create({
      data: {
        userId: users[0].id,
        folderTitle: "개인 프로젝트",
        color: "#FF5733",
      },
    }),
    prisma.folder.create({
      data: {
        userId: users[0].id,
        folderTitle: "업무",
        color: "#33C3F0",
      },
    }),
    prisma.folder.create({
      data: {
        userId: users[1].id,
        folderTitle: "학습",
        color: "#28A745",
      },
    }),
    prisma.folder.create({
      data: {
        userId: users[2].id,
        folderTitle: "개인",
        color: "#FFC107",
      },
    }),
  ]);

  console.log(`✅ ${folders.length}개의 폴더 생성 완료`);

  // 시드 기준 시각(과제·세부과제 생성 시각 통일, 알림 조회는 alarmDate <= 현재 시각)
  const seedNow = new Date();
  const now = dayjs(seedNow);

  // 3. Task (폴더는 Member.folderId로 연결 — Task에는 folderId 없음)
  console.log("📝 과제 생성 중...");
  const taskTime = { createdAt: seedNow, updatedAt: seedNow };

  const personalTasks = await Promise.all([
    prisma.task.create({
      data: {
        title: "포트폴리오",
        deadline: now.add(7, "day").toDate(),
        type: "PERSONAL",
        status: "PROGRESS",
        isAlarm: true,
        ...taskTime,
      },
    }),
    prisma.task.create({
      data: {
        title: "독서 목표 달성",
        deadline: now.add(14, "day").toDate(),
        type: "PERSONAL",
        status: "PENDING",
        isAlarm: true,
        ...taskTime,
      },
    }),
    prisma.task.create({
      data: {
        title: "회의 자료 준비",
        deadline: now.add(2, "day").toDate(),
        type: "PERSONAL",
        status: "PENDING",
        isAlarm: false,
        ...taskTime,
      },
    }),
  ]);

  const teamTask = await prisma.task.create({
    data: {
      title: "팀 프로젝트 개발",
      deadline: now.add(30, "day").toDate(),
      type: "TEAM",
      status: "PROGRESS",
      isAlarm: true,
      inviteCode: "TEAM123",
      inviteExpiredAt: now.add(7, "day").toDate(),
      ...taskTime,
    },
  });

  console.log(`✅ ${personalTasks.length + 1}개의 과제 생성 완료`);

  // 4. Member (assigneeId = Member.id 이므로 멤버를 먼저 만들고 참조)
  console.log("👥 멤버 생성 중...");
  const memTime = { createdAt: seedNow };
  const memP0u0 = await prisma.member.create({
    data: {
      userId: users[0].id,
      taskId: personalTasks[0].id,
      role: false,
      folderId: folders[0].id,
      ...memTime,
    },
  });
  const memP1u0 = await prisma.member.create({
    data: {
      userId: users[0].id,
      taskId: personalTasks[1].id,
      role: false,
      folderId: folders[0].id,
      ...memTime,
    },
  });
  const memP2u1 = await prisma.member.create({
    data: {
      userId: users[1].id,
      taskId: personalTasks[2].id,
      role: false,
      folderId: folders[2].id,
      ...memTime,
    },
  });
  const memTeamOwner = await prisma.member.create({
    data: {
      userId: users[1].id,
      taskId: teamTask.id,
      role: false,
      folderId: folders[2].id,
      ...memTime,
    },
  });
  const memTeamU0 = await prisma.member.create({
    data: {
      userId: users[0].id,
      taskId: teamTask.id,
      role: true,
      folderId: folders[0].id,
      ...memTime,
    },
  });
  const memTeamU2 = await prisma.member.create({
    data: {
      userId: users[2].id,
      taskId: teamTask.id,
      role: true,
      folderId: folders[3].id,
      ...memTime,
    },
  });

  console.log("✅ 멤버 생성 완료");

  // 5. SubTask (assigneeId → Member.id, 생성 시각 과제와 동일)
  console.log("📋 세부과제 생성 중...");
  const subTasks = [];
  const subTaskTime = { createdAt: seedNow, updatedAt: seedNow };

  subTasks.push(
    await prisma.subTask.create({
      data: {
        taskId: personalTasks[0].id,
        assigneeId: memP0u0.id,
        title: "디자인 완료",
        endDate: now.add(3, "day").toDate(),
        status: "PROGRESS",
        isAlarm: true,
        ...subTaskTime,
      },
    }),
    await prisma.subTask.create({
      data: {
        taskId: personalTasks[0].id,
        assigneeId: memP0u0.id,
        title: "프론트엔드 개발",
        endDate: now.add(5, "day").toDate(),
        status: "PENDING",
        isAlarm: true,
        ...subTaskTime,
      },
    }),
    await prisma.subTask.create({
      data: {
        taskId: personalTasks[0].id,
        title: "백엔드 API 개발",
        endDate: now.add(7, "day").toDate(),
        status: "PENDING",
        isAlarm: false,
        ...subTaskTime,
      },
    }),
  );

  subTasks.push(
    await prisma.subTask.create({
      data: {
        taskId: personalTasks[1].id,
        assigneeId: memP1u0.id,
        title: "책 3권 읽기",
        endDate: now.add(10, "day").toDate(),
        status: "PENDING",
        isAlarm: true,
        ...subTaskTime,
      },
    }),
  );

  subTasks.push(
    await prisma.subTask.create({
      data: {
        taskId: teamTask.id,
        assigneeId: memTeamU0.id,
        title: "기획서 작성",
        endDate: now.add(5, "day").toDate(),
        status: "COMPLETED",
        isAlarm: true,
        ...subTaskTime,
      },
    }),
    await prisma.subTask.create({
      data: {
        taskId: teamTask.id,
        assigneeId: memTeamOwner.id,
        title: "데이터베이스 설계",
        endDate: now.add(10, "day").toDate(),
        status: "PROGRESS",
        isAlarm: true,
        ...subTaskTime,
      },
    }),
    await prisma.subTask.create({
      data: {
        taskId: teamTask.id,
        assigneeId: memTeamU2.id,
        title: "API 개발",
        endDate: now.add(15, "day").toDate(),
        status: "PENDING",
        isAlarm: true,
        ...subTaskTime,
      },
    }),
  );

  console.log(`✅ ${subTasks.length}개의 세부과제 생성 완료`);

  // 6. TaskPriority (생성 시각 동일)
  console.log("⭐ 우선순위 생성 중...");
  const priorityTime = { createdAt: seedNow, updatedAt: seedNow };
  await Promise.all([
    prisma.taskPriority.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[0].id,
        rank: 1,
        ...priorityTime,
      },
    }),
    prisma.taskPriority.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[1].id,
        rank: 2,
        ...priorityTime,
      },
    }),
    prisma.taskPriority.create({
      data: {
        userId: users[1].id,
        taskId: personalTasks[2].id,
        rank: 1,
        ...priorityTime,
      },
    }),
    prisma.taskPriority.create({
      data: {
        userId: users[1].id,
        taskId: teamTask.id,
        rank: 1,
        ...priorityTime,
      },
    }),
    prisma.taskPriority.create({
      data: {
        userId: users[0].id,
        taskId: teamTask.id,
        rank: 3,
        ...priorityTime,
      },
    }),
    prisma.taskPriority.create({
      data: {
        userId: users[2].id,
        taskId: teamTask.id,
        rank: 1,
        ...priorityTime,
      },
    }),
  ]);

  console.log("✅ 우선순위 생성 완료");

  // 7. UserAlarm — alarmDate <= seedNow 여야 조회 API에서 노출됨
  console.log("🔔 알림 생성 중...");
  const alarms = [];
  const alarmCreated = { createdAt: seedNow };

  alarms.push(
    await prisma.userAlarm.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[0].id,
        title: "과제 마감 임박",
        alarmContent: "포트폴리오 과제 D-3입니다",
        isRead: true,
        alarmDate: now.subtract(1, "day").toDate(),
        ...alarmCreated,
      },
    }),
    await prisma.userAlarm.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[0].id,
        subTaskId: subTasks[0].id,
        title: "세부과제 마감 알림",
        alarmContent: "디자인 완료 마감 임박",
        isRead: false,
        alarmDate: now.subtract(2, "hour").toDate(),
        ...alarmCreated,
      },
    }),
  );

  alarms.push(
    await prisma.userAlarm.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[1].id,
        title: "과제 생성 알림",
        alarmContent: "독서 과제가 생성되었습니다",
        isRead: false,
        alarmDate: now.subtract(30, "minute").toDate(),
        ...alarmCreated,
      },
    }),
    await prisma.userAlarm.create({
      data: {
        userId: users[1].id,
        taskId: teamTask.id,
        subTaskId: subTasks[4].id,
        title: "세부과제 할당",
        alarmContent: "DB 설계가 할당되었습니다",
        isRead: false,
        alarmDate: now.subtract(20, "minute").toDate(),
        ...alarmCreated,
      },
    }),
    await prisma.userAlarm.create({
      data: {
        userId: users[2].id,
        taskId: teamTask.id,
        subTaskId: subTasks[5].id,
        title: "세부과제 할당",
        alarmContent: "API 개발이 할당되었습니다",
        isRead: false,
        alarmDate: now.subtract(10, "minute").toDate(),
        ...alarmCreated,
      },
    }),
    await prisma.userAlarm.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[0].id,
        subTaskId: subTasks[1].id,
        title: "세부과제 마감 알림",
        alarmContent: "프론트 개발 마감 임박",
        isRead: false,
        alarmDate: seedNow,
        ...alarmCreated,
      },
    }),
    await prisma.userAlarm.create({
      data: {
        userId: users[1].id,
        taskId: personalTasks[2].id,
        title: "과제 마감 알림",
        alarmContent: "회의 자료 준비 마감 임박",
        isRead: false,
        alarmDate: now.subtract(5, "minute").toDate(),
        ...alarmCreated,
      },
    }),
  );

  console.log(`✅ ${alarms.length}개의 알림 생성 완료`);

  console.log("\n✨ 시드 데이터 생성 완료!");
  console.log("\n📊 생성된 데이터:");
  console.log(`  - 유저: ${users.length}명`);
  console.log(`  - 폴더: ${folders.length}개`);
  console.log(
    `  - 과제: ${personalTasks.length + 1}개 (개인 ${personalTasks.length}개, 팀 1개)`,
  );
  console.log(`  - 세부과제: ${subTasks.length}개`);
  console.log(`  - 알림: ${alarms.length}개`);
  console.log("\n🔑 테스트용 유저 정보:");
  users.forEach((user, index) => {
    console.log(
      `  ${index + 1}. ${user.nickname} (ID: ${user.id}, Email: ${user.email})`,
    );
  });

  const jwtSecret = process.env.JWT_SECRET || "dev-secret";
  console.log("\n🔑 테스트용 JWT 토큰 (Authorization 헤더에 사용):");
  users.forEach((user, index) => {
    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: "7d" });
    console.log(
      `  ${index + 1}. ${user.nickname} (ID: ${user.id}, Email: ${user.email})`,
    );
    console.log(`     Authorization: Bearer ${token}\n`);
  });
}

main()
  .catch((e) => {
    console.error("❌ 시드 데이터 생성 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
