import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Calculate trending score based on recent interactions, orders, and views
    const products = await sql`
      SELECT p.*, u.name as vendor_name, 
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(DISTINCT oi.id) as recent_orders,
             COUNT(DISTINCT ui.id) as recent_views,
             (COUNT(DISTINCT oi.id) * 3 + COUNT(DISTINCT ui.id)) as trend_score
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN reviews r ON p.id = r.product_id
      LEFT JOIN order_items oi ON p.id = oi.product_id 
        AND oi.created_at > NOW() - INTERVAL '7 days'
      LEFT JOIN user_interactions ui ON ui.data->>'product_id' = p.id::text 
        AND ui.event = 'product_view' 
        AND ui.created_at > NOW() - INTERVAL '7 days'
      WHERE p.status = 'active'
      GROUP BY p.id, u.name
      HAVING COUNT(DISTINCT oi.id) > 0 OR COUNT(DISTINCT ui.id) > 0
      ORDER BY trend_score DESC, avg_rating DESC
      LIMIT 20
    `

    return NextResponse.json(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url,
        category: product.category,
        rating: Number.parseFloat(product.avg_rating),
        vendor: product.vendor_name,
        description: product.description,
        tags: product.tags ? product.tags.split(",") : [],
        trend_score: Number.parseInt(product.trend_score),
      })),
    )
  } catch (error) {
    console.error("Error fetching trending products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
