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
        COUNT(DISTINCT p.id) as total_products,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(DISTINCT oi.order_id) as total_orders
      FROM users u
      LEFT JOIN products p ON u.id = p.vendor_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE u.id = ${decoded.userId}
      GROUP BY u.id
    `

    return NextResponse.json({
      totalProducts: Number.parseInt(stats[0]?.total_products || 0),
      totalRevenue: Number.parseFloat(stats[0]?.total_revenue || 0),
      averageRating: Number.parseFloat(stats[0]?.average_rating || 0),
      totalOrders: Number.parseInt(stats[0]?.total_orders || 0),
    })
  } catch (error) {
    console.error("Error fetching vendor stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
