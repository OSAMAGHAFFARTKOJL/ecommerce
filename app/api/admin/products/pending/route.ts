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

    // 🔥 Show both pending + inactive
    const products = await sql`
      SELECT p.*, u.name as vendor_name
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      WHERE p.status = 'inactive'
    `

    return NextResponse.json(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        price: Number.parseFloat(product.price),
        image_url: product.image_url,
        vendor_name: product.vendor_name,
      }))
    )
  } catch (error) {
    console.error("Error fetching pending products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
