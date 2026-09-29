import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: number; // requests can have userId
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ["HS256"],
    });
    if (typeof payload === "string" || !payload.sub) {
      throw new Error("Bad token payload");
    }
    req.userId = Number(payload.sub);
    next();
  } catch {
    res.status(401).json({ error: "Not authenticated" });
  }
}