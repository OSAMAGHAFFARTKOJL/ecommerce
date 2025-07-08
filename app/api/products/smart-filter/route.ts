import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { categories, tags, priceRange, minRating } = await request.json()

    let query = `
      SELECT p.*, u.name as vendor_name, 
             COALESCE(AVG(r.rating), 0) as avg_rating
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.status = 'active'
    `

    const params: any[] = []
    let paramIndex = 1

    // Category filter
    if (categories && categories.length > 0) {
      query += ` AND p.category = ANY($${paramIndex})`
      params.push(categories)
      paramIndex++
    }

    // Price range filter
    if (priceRange && priceRange.length === 2) {
      query += ` AND p.price >= $${paramIndex} AND p.price <= $${paramIndex + 1}`
      params.push(priceRange[0], priceRange[1])
      paramIndex += 2
    }

    // Tags filter
    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => {
        const condition = `p.tags ILIKE $${paramIndex}`
        params.push(`%${tags[params.length - paramIndex + 1]}%`)
        paramIndex++
        return condition
      })
      query += ` AND (${tagConditions.join(" OR ")})`
    }

    query += ` GROUP BY p.id, u.name`

    // Rating filter
    if (minRating > 0) {
      query += ` HAVING COALESCE(AVG(r.rating), 0) >= $${paramIndex}`
      params.push(minRating)
    }

    query += ` ORDER BY avg_rating DESC, p.created_at DESC`

    const products = await sql(query, params)

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
      })),
    )
  } catch (error) {
    console.error("Error applying smart filters:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
