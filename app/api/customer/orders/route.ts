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

    const orders = await sql`
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'product_name', p.name,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ${decoded.userId}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `

    return NextResponse.json(
      orders.map((order) => ({
        id: order.id,
        total: Number.parseFloat(order.total_amount),
        status: order.status,
        date: new Date(order.created_at).toLocaleDateString(),
        items: order.items || [],
      })),
    )
  } catch (error) {
    console.error("Error fetching customer orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
