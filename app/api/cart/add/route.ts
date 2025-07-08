import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Please login to add items to cart" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const { productId, quantity } = await request.json()

    // Check if item already exists in cart
    const existingItem = await sql`
      SELECT * FROM cart_items 
      WHERE user_id = ${decoded.userId} AND product_id = ${productId}
    `

    if (existingItem.length > 0) {
      // Update quantity
      await sql`
        UPDATE cart_items 
        SET quantity = quantity + ${quantity}
        WHERE user_id = ${decoded.userId} AND product_id = ${productId}
      `
    } else {
      // Add new item
      await sql`
        INSERT INTO cart_items (user_id, product_id, quantity, created_at)
        VALUES (${decoded.userId}, ${productId}, ${quantity}, NOW())
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding to cart:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
