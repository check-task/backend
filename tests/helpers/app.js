import express from "express";
import { errorHandler } from "../../src/middlewares/error.middleware.js";
import { stateHandler } from "../../src/middlewares/state.middleware.js";
import apiRouter from "../../src/routes/index.js";

export function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(stateHandler);
  app.use("/api/v1", apiRouter);
  app.use(errorHandler);
  return app;
}
