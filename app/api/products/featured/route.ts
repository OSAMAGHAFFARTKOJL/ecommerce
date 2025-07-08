import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const products = await sql`
      SELECT p.*, u.name as vendor_name, 
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(oi.id) as order_count
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN reviews r ON p.id = r.product_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      WHERE p.status = 'active'
      GROUP BY p.id, u.name
      ORDER BY order_count DESC, avg_rating DESC
      LIMIT 12
    `

    return NextResponse.json(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        price: Number.parseFloat(product.price),
        image_url: product.image_url,
        category: product.category,
        rating: Number.parseFloat(product.avg_rating),
        vendor_name: product.vendor_name,
      })),
    )
  } catch (error) {
    console.error("Error fetching featured products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
