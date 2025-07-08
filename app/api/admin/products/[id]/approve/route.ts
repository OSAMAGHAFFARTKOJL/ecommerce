import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Check admin
    const user = await sql`SELECT role FROM users WHERE id = ${decoded.userId}`
    if (user[0]?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Approve the product (set status to active)
    await sql`UPDATE products SET status = 'active' WHERE id = ${params.id}`

    return NextResponse.json({ success: true, message: "Product approved" })
  } catch (err) {
    console.error("Error approving product:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
