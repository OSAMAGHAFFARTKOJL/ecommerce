import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Get unique categories
    const categories = await sql`
      SELECT DISTINCT category FROM products WHERE status = 'active'
      ORDER BY category
    `

    // Get popular tags
    const tagResults = await sql`
      SELECT tags FROM products WHERE status = 'active' AND tags IS NOT NULL
    `

    const allTags = new Set<string>()
    tagResults.forEach((row) => {
      if (row.tags) {
        row.tags.split(",").forEach((tag: string) => {
          allTags.add(tag.trim())
        })
      }
    })

    // Get price range
    const priceRange = await sql`
      SELECT MIN(price) as min_price, MAX(price) as max_price 
      FROM products WHERE status = 'active'
    `

    return NextResponse.json({
      categories: categories.map((c) => c.category),
      tags: Array.from(allTags).slice(0, 30), // Limit to top 30 tags
      priceRange: {
        min: Math.floor(priceRange[0].min_price),
        max: Math.ceil(priceRange[0].max_price),
      },
    })
  } catch (error) {
    console.error("Error fetching filter options:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
