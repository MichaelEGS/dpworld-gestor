import { SessionOptions } from "iron-session";

export interface SessionData {
  userId: number;
  username: string;
  name: string;
  role: "admin" | "supervisor";
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "dpworld-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 8, // 8 horas
  },
};
