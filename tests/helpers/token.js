import jwt from "jsonwebtoken";

export const generateToken = (userId = 1) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET ?? "test-secret", {
    expiresIn: "1h",
  });
