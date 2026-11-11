import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3 from '../config/s3.config.js';
import multer from "multer";
import dotenv from 'dotenv';
import { extname } from 'node:path';
import { BadRequestError } from '../errors/custom.error.js';

dotenv.config();

const storage = multer.memoryStorage();

export const IMAGE_EXTENSIONS = Object.freeze(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif']);
export const FILE_EXTENSIONS = Object.freeze([
  ...IMAGE_EXTENSIONS, 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'hwp', 'hwpx', 'zip',
]);

export const validateFileExtension = (file) => {
  const allowedExtensions = ['image', 'profileImage'].includes(file.fieldname)
    ? IMAGE_EXTENSIONS : FILE_EXTENSIONS;
  const extension = extname(file.originalname ?? '').slice(1).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    throw new BadRequestError(
      'UNSUPPORTED_FILE_EXTENSION',
      '지원하지 않는 파일 형식입니다. 허용된 확장자의 파일을 선택해 주세요.',
      { allowedExtensions },
    );
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    try {
      validateFileExtension(file);
      callback(null, true);
    } catch (error) {
      callback(error);
    }
  },
});

export const uploadToS3 = async (file) => {
  validateFileExtension(file);
  const key = `profile/${Date.now()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export default upload;
