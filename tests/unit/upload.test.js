import { describe, it, expect, vi } from 'vitest';
import multer from 'multer';
vi.mock('../../src/config/s3.config.js', () => ({ default: { send: vi.fn() } }));
import s3 from '../../src/config/s3.config.js';
import upload, { validateFileExtension, uploadToS3 } from '../../src/middlewares/upload.middleware.js';
import { errorHandler } from '../../src/middlewares/error.middleware.js';

const response = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

describe('파일 확장자 검증', () => {
  it.each(['report.PDF', '보고서.hwpx', 'archive.zip', 'photo.JpG'])('%s 첨부 허용', (originalname) => {
    expect(() => validateFileExtension({ originalname, fieldname: 'files' })).not.toThrow();
  });
  it.each(['run.exe', 'photo.jpg.exe', 'script.svg', 'no-extension', '.pdf', 'file.pdf '])('%s 거부', (originalname) => {
    expect(() => validateFileExtension({ originalname, fieldname: 'files' })).toThrow();
  });
  it.each(['image', 'profileImage'])('프로필 %s에 PDF 거부', (fieldname) => {
    expect(() => validateFileExtension({ originalname: 'report.pdf', fieldname })).toThrow();
    expect(() => validateFileExtension({ originalname: 'photo.PNG', fieldname })).not.toThrow();
  });
  it('Multer 필터에서 거부하고 오류 응답에 허용 목록 제공', () => {
    const callback = vi.fn();
    upload.fileFilter({}, { originalname: 'run.exe', fieldname: 'file_url' }, callback);
    const error = callback.mock.calls[0][0];
    const res = response();
    errorHandler(error, {}, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      errorCode: 'UNSUPPORTED_FILE_EXTENSION', data: { allowedExtensions: expect.arrayContaining(['pdf', 'hwp']) },
    }));
  });
  it('직접 S3 호출도 확장자 검증 후 차단', async () => {
    await expect(uploadToS3({ originalname: 'run.exe', buffer: Buffer.from('test') })).rejects.toMatchObject({ errorCode: 'UNSUPPORTED_FILE_EXTENSION' });
    expect(s3.send).not.toHaveBeenCalled();
  });
});

describe('Multer 오류 응답', () => {
  it.each([
    ['LIMIT_FILE_SIZE', 413, 'FILE_TOO_LARGE'],
    ['LIMIT_FILE_COUNT', 400, 'TOO_MANY_FILES'],
    ['LIMIT_UNEXPECTED_FILE', 400, 'UNEXPECTED_FILE'],
    ['LIMIT_PART_COUNT', 400, 'INVALID_UPLOAD'],
  ])('%s를 클라이언트 오류로 반환', (code, status, errorCode) => {
    const res = response();
    errorHandler(new multer.MulterError(code, 'files'), {}, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode, data: { field: 'files' } }));
  });
});

describe('multipart 요청 검증', async () => {
  const { default: express } = await import('express');
  const { default: request } = await import('supertest');
  const app = express();
  app.post('/profile', upload.single('image'), (req, res) => res.json({ name: req.file.originalname }));
  app.post('/files', upload.array('files'), (req, res) => res.json({ count: req.files.length }));
  app.use(errorHandler);

  it('금지된 확장자에 400 응답', async () => {
    const res = await request(app).post('/files').attach('files', Buffer.from('test'), 'run.exe');
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('UNSUPPORTED_FILE_EXTENSION');
  });
  it('이미지 필드에 PDF 업로드 차단', async () => {
    const res = await request(app).post('/profile').attach('image', Buffer.from('test'), 'report.pdf');
    expect(res.status).toBe(400);
    expect(res.body.data.allowedExtensions).not.toContain('pdf');
  });
  it('허용된 문서 여러 개 수신', async () => {
    const res = await request(app).post('/files')
      .attach('files', Buffer.from('test'), 'report.PDF')
      .attach('files', Buffer.from('test'), 'report.hwpx');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
  it('잘못된 파일 필드에 400 응답', async () => {
    const res = await request(app).post('/profile').attach('other', Buffer.from('test'), 'photo.png');
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('UNEXPECTED_FILE');
  });
});
