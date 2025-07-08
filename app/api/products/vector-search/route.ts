import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Simple local embedding function (same as in the script)
function generateSimpleEmbedding(text: string, dimensions = 384): number[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)

  const vector = new Array(dimensions).fill(0)

  words.forEach((word, index) => {
    const hash1 = simpleHash(word) % dimensions
    const hash2 = simpleHash(word + "_pos") % dimensions
    const hash3 = simpleHash(word + "_freq") % dimensions

    vector[hash1] += 1.0 / (index + 1)
    vector[hash2] += 1.0
    vector[hash3] += Math.log(words.length + 1)
  })

  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / magnitude
    }
  }

  return vector
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    console.log(`🔍 Vector search for: "${query}"`)

    // Generate embedding for the search query using our simple method
    const queryEmbedding = generateSimpleEmbedding(query)

    // Perform vector similarity search
    const products = await sql`
      SELECT p.*, u.name as vendor_name, 
             COALESCE(AVG(r.rating), 0) as avg_rating,
             (p.embedding <=> ${JSON.stringify(queryEmbedding)}) as similarity_distance,
             calculate_search_score(p.name, p.category, p.tags, ${query}) as text_score
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.status = 'active' AND p.embedding IS NOT NULL
      GROUP BY p.id, u.name, p.embedding
      ORDER BY 
        -- Combine vector similarity and text score
        ((1 - (p.embedding <=> ${JSON.stringify(queryEmbedding)})) * 0.7 + 
         (calculate_search_score(p.name, p.category, p.tags, ${query}) / 10) * 0.3) DESC
      LIMIT 10
    `;

    console.log(`📊 Found ${products.length} products`)

    return NextResponse.json(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        price: Number.parseFloat(product.price),
        image_url: product.image_url,
        category: product.category,
        rating: Number.parseFloat(product.avg_rating),
        vendor: product.vendor_name,
        description: product.description,
        tags: product.tags ? product.tags.split(",") : [],
        similarity_score: 1 - product.similarity_distance,
        text_score: product.text_score,
        combined_score: (1 - product.similarity_distance) * 0.7 + (product.text_score / 100) * 0.3,
      })),
    )
  } catch (error) {
    console.error("Error in vector search:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
