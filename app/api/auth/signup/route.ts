import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json()

    // Validate Gmail
    if (!email.endsWith("@gmail.com")) {
      return NextResponse.json({ error: "Please use a Gmail address" }, { status: 400 })
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email}
    `

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const newUser = await sql`
      INSERT INTO users (name, email, password, role, created_at)
      VALUES (${name}, ${email}, ${hashedPassword}, ${role}, NOW())
      RETURNING id, name, email, role
    `

    return NextResponse.json({
      user: newUser[0],
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
