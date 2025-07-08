import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/products/:id
 * Returns a single product with vendor name, rating, stock, and tags.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id
    // Ensure the id is a positive integer; otherwise early-return 400
    const idNumber = Number(productId)
    if (!Number.isInteger(idNumber) || idNumber <= 0) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 })
    }

    // Fetch product, vendor name, avg rating, and stock quantity.
    const rows = await sql`
      SELECT
        p.*,
        u.name          AS vendor_name,
        COALESCE(AVG(r.rating), 0) AS avg_rating
      FROM products p
      JOIN users   u ON p.vendor_id = u.id
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE p.id = ${idNumber} AND p.status = 'active'
      GROUP BY p.id, u.name
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const p = rows[0]

    return NextResponse.json({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number.parseFloat(p.price),
      image: p.image_url,
      category: p.category,
      rating: Number.parseFloat(p.avg_rating),
      vendor: p.vendor_name,
      tags: p.tags ? p.tags.split(",") : [],
      stock_quantity: p.stock_quantity,
    })
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
