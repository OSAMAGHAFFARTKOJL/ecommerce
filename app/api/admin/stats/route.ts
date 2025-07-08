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

    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM products WHERE status = 'active') as total_products,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders) as total_revenue,
        (SELECT COUNT(*) FROM products WHERE status = 'pending') as pending_products,
        (SELECT COUNT(*) FROM users WHERE role = 'vendor') as active_vendors
    `

    return NextResponse.json({
      totalUsers: Number.parseInt(stats[0].total_users),
      totalProducts: Number.parseInt(stats[0].total_products),
      totalOrders: Number.parseInt(stats[0].total_orders),
      totalRevenue: Number.parseFloat(stats[0].total_revenue),
      pendingProducts: Number.parseInt(stats[0].pending_products),
      activeVendors: Number.parseInt(stats[0].active_vendors),
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
