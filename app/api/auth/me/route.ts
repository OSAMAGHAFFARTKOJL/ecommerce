import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import jwt from "jsonwebtoken";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    console.log("All cookies:", request.cookies.getAll());
    const token = request.cookies.get("token")?.value; // Use "token" cookie for custom JWT
    console.log("Received token:", token);

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      console.log("Decoded token:", decoded);
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError.message);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.sub || decoded.userId; // Use sub or userId
    if (!userId) {
      console.error("Token missing userId or sub");
      return NextResponse.json({ error: "Invalid token structure" }, { status: 401 });
    }

    const users = await sql`
      SELECT id, name, email, role FROM users WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(users[0]);
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
