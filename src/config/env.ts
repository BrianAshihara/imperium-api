import dotenv from "dotenv";

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const NODE_ENV = process.env.NODE_ENV ?? "development";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret";

// A default secret in production would let anyone forge a valid token
if (NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set when NODE_ENV=production");
}

export const env = {
  NODE_ENV,
  PORT: parseNumber(process.env.PORT, 3333),
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
  JWT_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000"
};
