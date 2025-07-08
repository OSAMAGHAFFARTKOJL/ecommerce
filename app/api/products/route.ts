import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const products = await sql`
  SELECT 
    p.*,
    u.name                                AS vendor_name,
    COALESCE(AVG(r.rating), 0)            AS avg_rating
  FROM products         p
  JOIN users            u ON p.vendor_id = u.id
  LEFT JOIN reviews     r ON p.id = r.product_id
  WHERE p.status = 'active'
  GROUP BY p.id, u.name           -- group only by non-aggregated columns
  ORDER BY p.id DESC              -- newest first
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
        description: product.description,
        tags: product.tags ? product.tags.split(",") : [],
      })),
    )
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
