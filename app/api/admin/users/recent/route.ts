import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Check if user is admin
    const user = await sql`SELECT role FROM users WHERE id = ${decoded.userId}`
    if (user[0]?.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const users = await sql`
      SELECT id, name, email, role, created_at
      FROM users
      WHERE role != 'admin'
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching recent users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
