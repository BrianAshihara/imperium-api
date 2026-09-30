import jwt, { JwtPayload } from "jsonwebtoken";

import { env } from "../config/env";

export type AccessTokenPayload = JwtPayload & { sub: string };

export const signAccessToken = (userId: string): string => {
  return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: "1d" });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    throw new Error("Invalid token payload");
  }

  return decoded as AccessTokenPayload;
};
