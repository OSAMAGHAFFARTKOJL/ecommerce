import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const { itemId, quantity } = await request.json()

    if (quantity < 1) {
      return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 })
    }

    // Update the cart item quantity
    await sql`
      UPDATE cart_items 
      SET quantity = ${quantity}
      WHERE id = ${itemId} AND user_id = ${decoded.userId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating cart item:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
