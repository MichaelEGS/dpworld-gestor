"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sessionOptions, SessionData } from "@/lib/session";

export async function login(
  prevState: { error?: string } | null,
  formData: FormData
) {
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Usuario y contraseña son requeridos" };
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.active) {
    return { error: "Credenciales inválidas" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Credenciales inválidas" };
  }

  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  session.userId = user.id;
  session.username = user.username;
  session.name = user.name;
  session.role = user.role as "admin" | "supervisor";
  session.isLoggedIn = true;
  await session.save();

  redirect("/");
}

export async function logout() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  session.destroy();
  redirect("/login");
}

export async function getSession() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  return session;
}
