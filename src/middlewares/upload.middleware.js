import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3 from '../config/s3.config.js';

const uploadToS3 = async (file) => {
  const key = `reference/${Date.now()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export default uploadToS3;