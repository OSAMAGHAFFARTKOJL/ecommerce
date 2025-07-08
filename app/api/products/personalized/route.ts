import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateEmbedding } from "@/lib/embeddings"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    let userId = null

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any
        userId = decoded.userId
      } catch (error) {
        // Continue without user ID for anonymous users
      }
    }

    if (!userId) {
      // Return trending products for anonymous users
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
        })),
      )
    }

    // Get user preferences and behavior
    const userProfile = await getUserProfile(userId)

    if (!userProfile.preferences.length) {
      // New user - return popular products
      const products = await sql`
        SELECT p.*, u.name as vendor_name, 
               COALESCE(AVG(r.rating), 0) as avg_rating
        FROM products p
        JOIN users u ON p.vendor_id = u.id
        LEFT JOIN reviews r ON p.id = r.product_id
        WHERE p.status = 'active'
        GROUP BY p.id, u.name
        ORDER BY avg_rating DESC
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
        })),
      )
    }

    // Generate user preference embedding using our simple method
    const userPreferenceText = userProfile.preferences.join(" ")
    const userEmbedding = await generateEmbedding(userPreferenceText)

    // Find similar products using vector similarity
    const products = await sql`
      SELECT p.*, u.name as vendor_name, 
             COALESCE(AVG(r.rating), 0) as avg_rating,
             (p.embedding <=> ${JSON.stringify(userEmbedding)}) as similarity_distance
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.status = 'active' AND p.embedding IS NOT NULL
      GROUP BY p.id, u.name, p.embedding
      ORDER BY similarity_distance ASC
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
        recommendation_score: 1 - product.similarity_distance, // Convert distance to similarity score
      })),
    )
  } catch (error) {
    console.error("Error fetching personalized products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function getUserProfile(userId: string) {
  // Get user's interaction history
  const interactions = await sql`
    SELECT event, data, created_at
    FROM user_interactions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 100
  `

  // Extract preferences from interactions
  const preferences = new Set<string>()
  const categories = new Set<string>()

  for (const interaction of interactions) {
    const data = typeof interaction.data === "string" ? JSON.parse(interaction.data) : interaction.data

    if (data.category) categories.add(data.category)
    if (data.product_name) preferences.add(data.product_name)
    if (data.query) preferences.add(data.query)
  }

  return {
    preferences: Array.from(preferences),
    categories: Array.from(categories),
    interactionCount: interactions.length,
  }
}
