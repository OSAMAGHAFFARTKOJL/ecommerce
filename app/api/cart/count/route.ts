import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/cart/count
 * Returns the number of items in the authenticated user’s cart.
 * If the user is not logged in, returns { count: 0 }.
 */
export async function GET(request: NextRequest) {
  try {
    // Try to read the JWT from the cookie.
    const token = request.cookies.get("token")?.value

    // If there’s no token, the user is not logged in → cart is empty.
    if (!token) {
      return NextResponse.json({ count: 0 })
    }

    // Verify the token.
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

    // Query the DB for the total quantity in the cart.
    const result = await sql`
      SELECT COALESCE(SUM(quantity), 0)::INT AS item_count
      FROM cart_items
      WHERE user_id = ${decoded.userId}
    `

    const count = Number(result[0]?.item_count ?? 0)

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Error counting cart items:", error)
    // On any failure, fall back to 0 so the header never breaks.
    return NextResponse.json({ count: 0 })
  }
}
