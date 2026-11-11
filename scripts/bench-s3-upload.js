// S3 업로드 순차 vs 병렬(Promise.all) 소요 시간 측정
// 사용법: node scripts/bench-s3-upload.js [파일 개수=5] [파일 크기 MB=10] [반복 횟수=5]
// 실제 서비스 코드(uploadToS3)로 업로드하고, 측정이 끝나면 올린 파일은 모두 삭제한다.
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import s3 from '../src/config/s3.config.js';
import { uploadToS3 } from '../src/middlewares/upload.middleware.js';

const FILE_COUNT = Number(process.argv[2] ?? 5);
const FILE_SIZE_MB = Number(process.argv[3] ?? 10);
const ROUNDS = Number(process.argv[4] ?? 5);

// multer memoryStorage가 넘겨주는 file 객체와 같은 형태
const makeFiles = (round, mode) =>
  Array.from({ length: FILE_COUNT }, (_, i) => ({
    originalname: `bench-${mode}-r${round}-${i}.bin`,
    mimetype: 'application/octet-stream',
    buffer: Buffer.alloc(FILE_SIZE_MB * 1024 * 1024, i),
  }));

const uploadedKeys = [];
const keyFromUrl = (url) => new URL(url).pathname.slice(1);

const uploadSequential = async (files) => {
  for (const file of files) {
    uploadedKeys.push(keyFromUrl(await uploadToS3(file)));
  }
};

// task.controller.js 의 modifyTask 와 같은 방식
const uploadParallel = async (files) => {
  const urls = await Promise.all(files.map((file) => uploadToS3(file)));
  uploadedKeys.push(...urls.map(keyFromUrl));
};

const measure = async (fn, files) => {
  const start = performance.now();
  await fn(files);
  return performance.now() - start;
};

const median = (arr) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const cleanup = async () => {
  for (let i = 0; i < uploadedKeys.length; i += 1000) {
    await s3.send(new DeleteObjectsCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Delete: { Objects: uploadedKeys.slice(i, i + 1000).map((Key) => ({ Key })) },
    }));
  }
  console.log(`정리 완료: 업로드한 파일 ${uploadedKeys.length}개 삭제`);
};

const main = async () => {
  console.log(`조건: 파일 ${FILE_COUNT}개 x ${FILE_SIZE_MB}MB, ${ROUNDS}회 반복\n`);

  // 첫 연결(TLS 핸드셰이크 등) 비용이 측정에 섞이지 않도록 워밍업
  await uploadSequential(makeFiles(0, 'warmup').slice(0, 1));

  const sequential = [];
  const parallel = [];
  for (let round = 1; round <= ROUNDS; round++) {
    // 순서에 따른 편향을 줄이기 위해 회차마다 실행 순서를 바꾼다
    const order = round % 2 ? ['seq', 'par'] : ['par', 'seq'];
    for (const mode of order) {
      if (mode === 'seq') sequential.push(await measure(uploadSequential, makeFiles(round, mode)));
      else parallel.push(await measure(uploadParallel, makeFiles(round, mode)));
    }
    console.log(`[${round}회차] 순차 ${sequential.at(-1).toFixed(0)}ms / 병렬 ${parallel.at(-1).toFixed(0)}ms`);
  }

  const seqMedian = median(sequential);
  const parMedian = median(parallel);
  console.log(`\n중앙값: 순차 ${seqMedian.toFixed(0)}ms → 병렬 ${parMedian.toFixed(0)}ms`);
  console.log(`단축률: ${((1 - parMedian / seqMedian) * 100).toFixed(1)}% (약 ${(seqMedian / parMedian).toFixed(1)}배)`);
};

main()
  .catch((err) => {
    console.error('측정 실패:', err);
    process.exitCode = 1;
  })
  .finally(cleanup);
