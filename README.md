# :sparkles: Check Task Back-End :sparkles: (임시)
## Team
|<img src="https://github.com/user-attachments/assets/c947e8be-abd6-43c4-a499-fcf6865019b0" height="150" />|<img width="220" height="220" alt="image" src="https://github.com/user-attachments/assets/38c7fdaa-2ca7-4421-a34c-7bbc93ce0ba1" />|<img width="220" height="220" alt="image" src="https://github.com/user-attachments/assets/5a245a4d-3e5b-4c24-95d8-b74fdacb6ef4" />|<img width="180" height="180" alt="image" src="https://github.com/user-attachments/assets/fd09a935-a8ee-40eb-87ea-c2170c753e14" />|<img width="200" height="200" alt="image" src="https://github.com/user-attachments/assets/a31dffc4-7508-45ee-8842-e15b6e9ed317" />|
|:-:|:-:|:-:|:-:|:-:|
|김정민<br/>[@JungMINI-developer](https://github.com/JungMINI-developer)|오소윤<br/>[@soyun0318](https://github.com/soyun0318)|정규은<br/>[@jeongkyueun](https://github.com/jeongkyueun)|양우영<br/>[@yangwooyoung123](https://github.com/yangwooyoung123)|선준우<br/>[@junu999](https://github.com/junu999)|
|Back-End <br>(팀장)|Back-End|Back-End|Back-End|Back-End
<br>

## ⚙️ 시스템 구성도 (수정 중..)
<img width="1639" height="621" alt="Group 2" src="https://github.com/user-attachments/assets/aba05ba5-61bb-43d6-b36a-ec6d44c2bf59" />
<br>

## 📁 시스템 디렉토리 구조
```bash
BACKEND
├── .github/                # GitHub Actions (CI/CD)
│   └── workflows/
│       ├── ci-develop.yaml
│       └── cd-develop.yml
│
├── prisma/                 # Prisma ORM 설정
│   ├── schema.prisma
│   └── seed.js
│
├── src/
│   ├── config/             # 인증, CORS, JWT, Redis, S3 등 환경 설정
│   ├── controllers/        # 요청/응답 처리 (입력값 검증)
│   ├── services/           # 비즈니스 로직 (에러 처리 포함)
│   ├── repositories/       # DB 접근 계층
│   ├── dtos/               # 요청/응답 데이터 구조 정의
│   ├── middlewares/        # 인증, 에러 핸들링 등
│   ├── routes/             # API 라우팅 정의
│   ├── socket/             # Socket.IO 이벤트 처리
│   ├── swagger/            # Swagger 문서 설정
│   ├── utils/              # 공통 유틸 함수
│   ├── errors/             # 커스텀 에러 정의
│   ├── docs/               # Swagger YAML 문서
│   ├── server.js           # Express + Socket 서버 설정
│   ├── index.js            # 서버 실행 진입점
│   └── db.config.js        # Prisma DB 설정
│
├── .env                    # 환경 변수
├── package.json
└── README.md
```
<br>


## 프로젝트 실행 방법
### 1️⃣ 의존성 설치
```bash
npm install
```
### 2️⃣ 환경 변수 설정 (.env)
```env
# Database (MySQL)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=your_db_name

# Prisma에서 사용하는 DB URL
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB_NAME"

# Server
PORT=8000
NODE_ENV=development
# JWT
JWT_SECRET=your_jwt_secret_key
# Kakao OAuth
PASSPORT_KAKAO_CLIENT_ID=your_kakao_client_id
PASSPORT_KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_CALLBACK_URL=http://localhost:8000/api/v1/auth/kakao/callback

# AWS S3
AWS_REGION=aws_region_name
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

# Frontend Redirect URL
FRONTEND_LOCAL=...
FRONTEND_VERCEL=...

# Session
SESSION_SECRET=your_session_secret
# Redis
REDIS_URL=redis://localhost:....
```
### 3️⃣ Prisma 마이그레이션
```bash
npm run migrate:dev
```
### 4️⃣ seed 데이터 삽입
```bash
npm run seed || npx prisma db seed
```
### 5️⃣ 개발 서버 실행
```bash
npm run dev
```
### 6️⃣ 프로덕션 실행
```bash
npm start
```
<br>

## 📍 Back-End GitHub 협업
### ▷ Branch 전략
| 브랜치명 | 설명 | 명명 규칙 예시 |
| --- | --- | --- |
| main | 실제 배포되어 운영되는 서버의 코드 | main |
| develop | 다음 배포를 위해 개발된 기능들이 통합되는 브랜치 | develop |
| feature | 단위 기능 개발을 위한 브랜치 develop에서 분기 | eature/issue-번호 |
- 브랜치명: ```커밋유형/이슈번호```

### ▷ 이슈 유형
| 브랜치명 | 설명 |
| --- | --- |
| Feat | 새로운 기능 추가 |
| Fix | 오류/버그 수정 |
| Refactor | 내부 구조 개선 | 

### ▷ push 방식
1. issue 생성
   - 작업 전, GitHub Issue 탭에서 할 일을 등록
   - 작업할 내용 작성 후 Assignees(담당자) 지정
2. Branch 생성
   - `develop`으로 병합되는 작업 `Branch` 생성
3. 작업 및 Push
   - 기능 구현 후 약속된 컨벤션에 맞춰 커밋 진행
   - 작업 브랜치를 원격 저장소에 올림
4. Pull Request(PR)
   - GitHub에서 작업 `Branch` -> `develop` 브랜치로 PR을 생성
   - PR 템플릿에 맞춰 작업 내용, 변경 사항, 결과 등을 작성
   - Reviewer(팀원)을 지정하여 코드 리뷰 요청
5. Review & Merge
<br>

## API 설계
### 성공/에러 시 공통으로 쓰는 JSON
