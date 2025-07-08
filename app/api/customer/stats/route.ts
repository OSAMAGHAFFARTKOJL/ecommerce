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

    const stats = await sql`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COALESCE(AVG(r.rating), 0) as average_rating
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      LEFT JOIN reviews r ON u.id = r.user_id
      WHERE u.id = ${decoded.userId}
      GROUP BY u.id
    `

    return NextResponse.json({
      totalOrders: Number.parseInt(stats[0]?.total_orders || 0),
      totalSpent: Number.parseFloat(stats[0]?.total_spent || 0),
      averageRating: Number.parseFloat(stats[0]?.average_rating || 0),
    })
  } catch (error) {
    console.error("Error fetching customer stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
