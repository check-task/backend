import jwt from "jsonwebtoken";
import crypto from "crypto";
import { redis } from "../config/redis.config.js";

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = "1h";
const REFRESH_TOKEN_EXPIRES_IN = "14d";
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;

export function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      provider: user.provider ?? null,
      providerId: user.providerId ?? null,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
  );
}

export function generateRefreshToken(user) {
  const tokenId = crypto.randomUUID();
  const refreshToken = jwt.sign(
    { id: user.id, tokenId },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
  );
  return { refreshToken, tokenId };
}

export async function saveRefreshToken(tokenId, userId) {
  await redis.set(
    `refresh_token:${tokenId}`,
    userId,
    "EX",
    REFRESH_TOKEN_TTL_SECONDS,
  );
}
