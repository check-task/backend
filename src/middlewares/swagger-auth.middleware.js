import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value) => createHash("sha256").update(value).digest();

export const swaggerBasicAuth = (req, res, next) => {
  const username = process.env.SWAGGER_USERNAME;
  const password = process.env.SWAGGER_PASSWORD;

  res.set("Cache-Control", "no-store");

  if (!username?.trim() || !password?.trim() || username.includes(":")) {
    return res.status(503).send("Swagger 접속 계정이 설정되지 않았습니다.");
  }

  const challenge = () => {
    res.set("WWW-Authenticate", 'Basic realm="Check-Task Swagger", charset="UTF-8"');
    return res.status(401).send("Swagger 접속 아이디와 비밀번호를 입력해 주세요.");
  };

  const match = /^Basic\s+([A-Za-z0-9+/]+={0,2})$/i.exec(req.get("authorization") ?? "");
  if (!match) return challenge();

  const credentials = Buffer.from(match[1], "base64").toString("utf8");
  const separator = credentials.indexOf(":");
  if (separator < 0) return challenge();

  const usernameMatches = timingSafeEqual(digest(credentials.slice(0, separator)), digest(username));
  const passwordMatches = timingSafeEqual(digest(credentials.slice(separator + 1)), digest(password));
  if (!usernameMatches || !passwordMatches) return challenge();

  return next();
};
