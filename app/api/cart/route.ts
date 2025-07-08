import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json([], { status: 200 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    const items = await sql`
      SELECT 
        ci.id,
        ci.product_id,
        p.name,
        p.price,
        ci.quantity,
        p.image_url AS image
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ${decoded.userId}
    `

    const cartItems = items.map((row) => ({
      id: row.id,
      productId: row.product_id,
      name: row.name,
      price: Number(row.price),
      quantity: row.quantity,
      image: row.image || "/placeholder.svg?height=80&width=80"
    }))

    return NextResponse.json(cartItems)
  } catch (error) {
    console.error("Error fetching cart items:", error)
    return NextResponse.json([], { status: 500 })
  }
}
