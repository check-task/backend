// prisma/seed.js
import { prisma } from "../src/db.config.js";
import dayjs from "dayjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

async function main() {
  console.log("🌱 시드 데이터 생성 시작...");

  // 기존 데이터 삭제 (순서 중요: 외래키 관계 고려)
  console.log("🗑️  기존 데이터 삭제 중...");
  await prisma.userAlarm.deleteMany();
  await prisma.taskPriority.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.subTask.deleteMany();
  await prisma.member.deleteMany();
  await prisma.task.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.user.deleteMany();

  // 1. User 생성
  console.log("👤 유저 생성 중...");
  const users = await Promise.all([
    prisma.user.create({
      data: {
        nickname: "홍길동",
        phoneNum: "010-1234-5678",
        email: "hong@example.com",
        deadlineAlarm: 24,
        taskAlarm: 24,
      },
    }),
    prisma.user.create({
      data: {
        nickname: "김철수",
        phoneNum: "010-2345-6789",
        email: "kim@example.com",
        deadlineAlarm: 12,
        taskAlarm: 12,
      },
    }),
    prisma.user.create({
      data: {
        nickname: "이영희",
        phoneNum: "010-3456-7890",
        email: "lee@example.com",
        deadlineAlarm: 48,
        taskAlarm: 48,
      },
    }),
  ]);

  console.log(`✅ ${users.length}명의 유저 생성 완료`);

  // 2. Folder 생성
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

  // 3. Task 생성 (개인 과제 + 팀 과제)
  console.log("📝 과제 생성 중...");
  const now = dayjs();

  // 개인 과제들
  const personalTasks = await Promise.all([
    prisma.task.create({
      data: {
        folderId: folders[0].id,
        title: "포트폴리오 웹사이트 제작",
        deadline: now.add(7, "day").toDate(),
        type: "PERSONAL",
        status: "PROGRESS",
        isAlarm: true,
      },
    }),
    prisma.task.create({
      data: {
        folderId: folders[0].id,
        title: "독서 목표 달성",
        deadline: now.add(14, "day").toDate(),
        type: "PERSONAL",
        status: "PENDING",
        isAlarm: true,
      },
    }),
    prisma.task.create({
      data: {
        folderId: folders[1].id,
        title: "회의 자료 준비",
        deadline: now.add(2, "day").toDate(),
        type: "PERSONAL",
        status: "PENDING",
        isAlarm: false,
      },
    }),
  ]);

  // 팀 과제
  const teamTask = await prisma.task.create({
    data: {
      folderId: folders[2].id,
      title: "팀 프로젝트 개발",
      deadline: now.add(30, "day").toDate(),
      type: "TEAM",
      status: "PROGRESS",
      isAlarm: true,
      inviteCode: "TEAM123",
      inviteExpiredAt: now.add(7, "day").toDate(),
    },
  });

  console.log(`✅ ${personalTasks.length + 1}개의 과제 생성 완료`);

  // 4. Member 생성 (팀 과제 멤버)
  console.log("👥 멤버 생성 중...");
  await Promise.all([
    // 개인 과제는 본인이 멤버
    prisma.member.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[0].id,
        role: false, // owner
      },
    }),
    prisma.member.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[1].id,
        role: false,
      },
    }),
    prisma.member.create({
      data: {
        userId: users[1].id,
        taskId: personalTasks[2].id,
        role: false,
      },
    }),
    // 팀 과제 멤버들
    prisma.member.create({
      data: {
        userId: users[1].id,
        taskId: teamTask.id,
        role: false, // owner
      },
    }),
    prisma.member.create({
      data: {
        userId: users[0].id,
        taskId: teamTask.id,
        role: true, // member
      },
    }),
    prisma.member.create({
      data: {
        userId: users[2].id,
        taskId: teamTask.id,
        role: true, // member
      },
    }),
  ]);

  console.log("✅ 멤버 생성 완료");

  // 5. SubTask 생성
  console.log("📋 세부과제 생성 중...");
  const subTasks = [];

  // 첫 번째 개인 과제의 세부과제들
  subTasks.push(
    await prisma.subTask.create({
      data: {
        taskId: personalTasks[0].id,
        assigneeId: users[0].id,
        title: "디자인 완료",
        endDate: now.add(3, "day").toDate(),
        status: "PROGRESS",
        isAlarm: true,
      },
    }),
    await prisma.subTask.create({
      data: {
        taskId: personalTasks[0].id,
        assigneeId: users[0].id,
        title: "프론트엔드 개발",
        endDate: now.add(5, "day").toDate(),
        status: "PENDING",
        isAlarm: true,
      },
    }),
    await prisma.subTask.create({
      data: {
        taskId: personalTasks[0].id,
        title: "백엔드 API 개발",
        endDate: now.add(7, "day").toDate(),
        status: "PENDING",
        isAlarm: false,
      },
    })
  );

  // 두 번째 개인 과제의 세부과제
  subTasks.push(
    await prisma.subTask.create({
      data: {
        taskId: personalTasks[1].id,
        assigneeId: users[0].id,
        title: "책 3권 읽기",
        endDate: now.add(10, "day").toDate(),
        status: "PENDING",
        isAlarm: true,
      },
    })
  );

  // 팀 과제의 세부과제들
  subTasks.push(
    await prisma.subTask.create({
      data: {
        taskId: teamTask.id,
        assigneeId: users[0].id,
        title: "기획서 작성",
        endDate: now.add(5, "day").toDate(),
        status: "COMPLETED",
        isAlarm: true,
      },
    }),
    await prisma.subTask.create({
      data: {
        taskId: teamTask.id,
        assigneeId: users[1].id,
        title: "데이터베이스 설계",
        endDate: now.add(10, "day").toDate(),
        status: "PROGRESS",
        isAlarm: true,
      },
    }),
    await prisma.subTask.create({
      data: {
        taskId: teamTask.id,
        assigneeId: users[2].id,
        title: "API 개발",
        endDate: now.add(15, "day").toDate(),
        status: "PENDING",
        isAlarm: true,
      },
    })
  );

  console.log(`✅ ${subTasks.length}개의 세부과제 생성 완료`);

  // 6. TaskPriority 생성 (과제 우선순위)
  console.log("⭐ 우선순위 생성 중...");
  await Promise.all([
    prisma.taskPriority.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[0].id,
        rank: 1,
      },
    }),
    prisma.taskPriority.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[1].id,
        rank: 2,
      },
    }),
    prisma.taskPriority.create({
      data: {
        userId: users[1].id,
        taskId: personalTasks[2].id,
        rank: 1,
      },
    }),
    prisma.taskPriority.create({
      data: {
        userId: users[1].id,
        taskId: teamTask.id,
        rank: 1,
      },
    }),
    prisma.taskPriority.create({
      data: {
        userId: users[0].id,
        taskId: teamTask.id,
        rank: 3,
      },
    }),
    prisma.taskPriority.create({
      data: {
        userId: users[2].id,
        taskId: teamTask.id,
        rank: 1,
      },
    }),
  ]);

  console.log("✅ 우선순위 생성 완료");

  // 7. UserAlarm 생성 (다양한 알림 상태)
  console.log("🔔 알림 생성 중...");
  const alarms = [];

  // 과거 알림 (읽음/안읽음)
  alarms.push(
    await prisma.userAlarm.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[0].id,
        title: "과제 마감 임박",
        alarmContent: "포트폴리오 웹사이트 제작 마감이 3일 남았습니다",
        isRead: true,
        alarmDate: now.subtract(1, "day").toDate(),
      },
    }),
    await prisma.userAlarm.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[0].id,
        subTaskId: subTasks[0].id,
        title: "세부과제 마감 알림",
        alarmContent: "디자인 완료 마감이 임박했습니다",
        isRead: false,
        alarmDate: now.subtract(2, "hours").toDate(),
      },
    })
  );

  // 현재/미래 알림
  alarms.push(
    await prisma.userAlarm.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[1].id,
        title: "과제 생성 알림",
        alarmContent: "독서 목표 달성 과제가 생성되었습니다",
        isRead: false,
        alarmDate: now.add(1, "hour").toDate(),
      },
    }),
    await prisma.userAlarm.create({
      data: {
        userId: users[1].id,
        taskId: teamTask.id,
        subTaskId: subTasks[4].id,
        title: "세부과제 할당",
        alarmContent: "데이터베이스 설계가 할당되었습니다",
        isRead: false,
        alarmDate: now.add(2, "hours").toDate(),
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
        alarmDate: now.add(3, "hours").toDate(),
      },
    }),
    await prisma.userAlarm.create({
      data: {
        userId: users[0].id,
        taskId: personalTasks[0].id,
        subTaskId: subTasks[1].id,
        title: "세부과제 마감 알림",
        alarmContent: "프론트엔드 개발 마감이 임박했습니다",
        isRead: false,
        alarmDate: now.add(1, "day").toDate(),
      },
    }),
    await prisma.userAlarm.create({
      data: {
        userId: users[1].id,
        taskId: personalTasks[2].id,
        title: "과제 마감 알림",
        alarmContent: "회의 자료 준비 마감이 임박했습니다",
        isRead: false,
        alarmDate: now.add(1, "day").toDate(),
      },
    })
  );

  console.log(`✅ ${alarms.length}개의 알림 생성 완료`);

  console.log("\n✨ 시드 데이터 생성 완료!");
  console.log("\n📊 생성된 데이터:");
  console.log(`  - 유저: ${users.length}명`);
  console.log(`  - 폴더: ${folders.length}개`);
  console.log(
    `  - 과제: ${personalTasks.length + 1}개 (개인 ${
      personalTasks.length
    }개, 팀 1개)`
  );
  console.log(`  - 세부과제: ${subTasks.length}개`);
  console.log(`  - 알림: ${alarms.length}개`);
  console.log("\n🔑 테스트용 유저 정보:");
  users.forEach((user, index) => {
    console.log(
      `  ${index + 1}. ${user.nickname} (ID: ${user.id}, Email: ${user.email})`
    );
  });
  // 🔑 테스트용 JWT 토큰 생성
  const jwtSecret = process.env.JWT_SECRET || "dev-secret";

  console.log("\n🔑 테스트용 JWT 토큰 (Authorization 헤더에 사용):");
  users.forEach((user, index) => {
    const token = jwt.sign(
      { id: user.id },
      jwtSecret,
      { expiresIn: "7d" } // 필요에 따라 수정
    );

    console.log(
      `  ${index + 1}. ${user.nickname} (ID: ${user.id}, Email: ${user.email})`
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
