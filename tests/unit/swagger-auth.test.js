import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import swaggerUi from "swagger-ui-express";
import { swaggerBasicAuth } from "../../src/middlewares/swagger-auth.middleware.js";

const app = express();
app.use(["/docs", "/openapi.json"], swaggerBasicAuth);
app.use("/docs", swaggerUi.serve, swaggerUi.setup({
  openapi: "3.0.0",
  info: { title: "Test", version: "1.0.0" },
  paths: {},
}));
app.get("/openapi.json", (req, res) => res.json({ openapi: "3.0.0" }));
app.get("/api/v1/health", (req, res) => res.sendStatus(200));

const basic = (value) => `Basic ${Buffer.from(value).toString("base64")}`;

describe("Swagger 접속 인증", () => {
  beforeEach(() => {
    vi.stubEnv("SWAGGER_USERNAME", "docs-user");
    vi.stubEnv("SWAGGER_PASSWORD", "long:test-password");
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each(["/docs", "/docs/", "/docs/swagger-ui.css", "/docs/swagger-ui-init.js", "/openapi.json"])(
    "%s는 인증 없이 열리지 않는다",
    async (url) => {
      const response = await request(app).get(url);
      expect(response.status).toBe(401);
      expect(response.headers["www-authenticate"]).toContain('Basic realm="Check-Task Swagger"');
      expect(response.headers["cache-control"]).toBe("no-store");
    },
  );

  it.each(["/docs/", "/docs/swagger-ui.css", "/docs/swagger-ui-init.js", "/openapi.json"])(
    "%s는 올바른 계정으로 접근할 수 있다",
    async (url) => {
      const response = await request(app).get(url).set("Authorization", basic("docs-user:long:test-password"));
      expect(response.status).toBe(200);
    },
  );

  it.each([
    basic("wrong-user:long:test-password"),
    basic("docs-user:wrong-password"),
    basic("docs-user:"),
    basic("no-separator"),
    "Basic !!!",
    "Bearer token",
  ])("잘못된 인증 %s를 거부한다", async (authorization) => {
    const response = await request(app).get("/openapi.json").set("Authorization", authorization);
    expect(response.status).toBe(401);
    expect(response.text).not.toContain("long:test-password");
  });

  it.each([
    ["SWAGGER_USERNAME", undefined],
    ["SWAGGER_PASSWORD", undefined],
    ["SWAGGER_PASSWORD", ""],
    ["SWAGGER_PASSWORD", "   "],
    ["SWAGGER_USERNAME", "invalid:user"],
  ])("계정 설정 오류 시 문서를 공개하지 않는다: %s=%s", async (name, value) => {
    vi.stubEnv(name, value);
    const response = await request(app).get("/docs/");
    expect(response.status).toBe(503);
  });

  it("일반 API 경로에는 Swagger 인증을 요구하지 않는다", async () => {
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.headers["www-authenticate"]).toBeUndefined();
  });
});
