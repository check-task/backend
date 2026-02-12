# :sparkles: Check Task Back-End :sparkles:
|<img src="https://github.com/user-attachments/assets/c947e8be-abd6-43c4-a499-fcf6865019b0" height="150" />|<img width="220" height="220" alt="image" src="https://github.com/user-attachments/assets/38c7fdaa-2ca7-4421-a34c-7bbc93ce0ba1" />|<img width="220" height="220" alt="image" src="https://github.com/user-attachments/assets/5a245a4d-3e5b-4c24-95d8-b74fdacb6ef4" />|<img width="200" height="200" alt="image" src="https://github.com/user-attachments/assets/fd09a935-a8ee-40eb-87ea-c2170c753e14" />|<img width="480" height="480" alt="image" src="https://github.com/user-attachments/assets/a31dffc4-7508-45ee-8842-e15b6e9ed317" />|
|:-:|:-:|:-:|:-:|:-:|
|김정민<br/>[@JungMINI-developer](https://github.com/JungMINI-developer)|오소윤<br/>[@soyun0318](https://github.com/soyun0318)|정규은<br/>[@jeongkyueun](https://github.com/jeongkyueun)|양우영<br/>[@yangwooyoung123](https://github.com/yangwooyoung123)|선준우<br/>[@junu999](https://github.com/junu999)|
|Back-End <br>(팀장)|Back-End|Back-End|Back-End|Back-End
### <추가할거: 프로젝트 실행 방법, 환경 변수 설정 등등> 수정 해야합니다 ㅜㅜ 아직 임시입니다 ㅜㅜ
<br>

## ⚙️ 시스템 구성도 (수정 중입니다 ㅜㅜ)
<img width="1551" height="700" alt="Group 1" src="https://github.com/user-attachments/assets/c7c87dd7-d52e-45ba-bf49-51525b1b7b5c" />
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


## 주요 기능 API
<br>


## REST API 설계 규칙
<br>

## 응답 포맷 통일
<br>




## 📍 Branch 전략 📍<예시로 가져온거였습니다 이것도 수정해야 할것 같아요>
- develop: 기능 개발을 위한 브랜치
- 작업에 따라 브랜치 생성 후 리뷰 후 develop에 merge
  - 브랜치명: ```커밋유형/이슈번호```
<br>
  




## 👥 Team 👥

