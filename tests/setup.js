// tests/setup.js (setupFiles로 등록)
import { vi } from "vitest";

vi.mock("../src/config/redis.config.js", () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));
