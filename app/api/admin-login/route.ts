import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN)
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_auth", process.env.ADMIN_PIN, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
