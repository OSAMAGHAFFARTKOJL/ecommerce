import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { generateEmbedding } from "@/lib/embeddings"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim()

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 })
    }

    console.log(`🔍 Searching for: "${query}"`)

    // Always try multiple search strategies and combine results
    const [vectorResults, textResults, fuzzyResults] = await Promise.all([
      performVectorSearch(query),
      performEnhancedTextSearch(query),
      performFuzzySearch(query),
    ])

    // Combine and deduplicate results
    const allResults = new Map()

    // Add vector results with high priority
    vectorResults.forEach((product) => {
      allResults.set(product.id, {
        ...product,
        search_score: (product.search_score || 0) * 100,
        search_type: "vector",
      })
    })

    // Add text results, merging scores if product already exists
    textResults.forEach((product) => {
      const existing = allResults.get(product.id)
      if (existing) {
        existing.search_score = Math.max(existing.search_score, product.search_score || 0)
        existing.search_type = "combined"
      } else {
        allResults.set(product.id, {
          ...product,
          search_type: "text",
        })
      }
    })

    // Add fuzzy results as fallback
    fuzzyResults.forEach((product) => {
      if (!allResults.has(product.id)) {
        allResults.set(product.id, {
          ...product,
          search_type: "fuzzy",
        })
      }
    })

    // Convert to array and sort by score
    const products = Array.from(allResults.values())
      .sort((a, b) => (b.search_score || 0) - (a.search_score || 0))
      .slice(0, 50)

    console.log(
      `📊 Found ${products.length} products (Vector: ${vectorResults.length}, Text: ${textResults.length}, Fuzzy: ${fuzzyResults.length})`,
    )

    return NextResponse.json(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        price: Number.parseFloat(product.price),
        image_url: product.image_url,
        category: product.category,
        rating: Number.parseFloat(product.avg_rating || 0),
        vendor_name: product.vendor_name,
        description: product.description,
        tags: product.tags ? product.tags.split(",") : [],
        search_score: product.search_score || 0,
        search_type: product.search_type,
      })),
    )
  } catch (error) {
    console.error("Error in product search:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function performVectorSearch(query: string) {
  try {
    // Check if embeddings exist
    const hasEmbedding = await sql`
      SELECT COUNT(*) as count FROM products WHERE embedding IS NOT NULL LIMIT 1
    `

    if (hasEmbedding[0].count === 0) {
      console.log("⚠️ No embeddings found, skipping vector search")
      return []
    }

    // Generate embedding for search query
    const queryEmbedding = await generateEmbedding(query)

    const products = await sql`
      SELECT p.*, u.name as vendor_name, 
             COALESCE(AVG(r.rating), 0) as avg_rating,
             (1 - (p.embedding <=> ${JSON.stringify(queryEmbedding)})) as search_score
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.status = 'active' 
        AND p.embedding IS NOT NULL
        AND (p.embedding <=> ${JSON.stringify(queryEmbedding)}) < 0.8
      GROUP BY p.id, u.name, p.embedding
      LIMIT 30
    `

    console.log(`🎯 Vector search found ${products.length} products`)
    return products
  } catch (error) {
    console.error("Vector search error:", error)
    return []
  }
}

async function performEnhancedTextSearch(query: string) {
  try {
    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 1)

    const products = await sql`
      SELECT p.*, u.name as vendor_name, 
             COALESCE(AVG(r.rating), 0) as avg_rating,
             (
               CASE 
                 -- Exact name match
                 WHEN LOWER(p.name) = LOWER(${query}) THEN 100
                 -- Name starts with query
                 WHEN LOWER(p.name) LIKE LOWER(${query + "%"}) THEN 95
                 -- Name contains query
                 WHEN LOWER(p.name) LIKE LOWER(${"%" + query + "%"}) THEN 85
                 -- Category exact match
                 WHEN LOWER(p.category) = LOWER(${query}) THEN 80
                 -- Category contains query
                 WHEN LOWER(p.category) LIKE LOWER(${"%" + query + "%"}) THEN 75
                 -- Description contains query
                 WHEN LOWER(p.description) LIKE LOWER(${"%" + query + "%"}) THEN 70
                 -- Tags contain query
                 WHEN LOWER(COALESCE(p.tags, '')) LIKE LOWER(${"%" + query + "%"}) THEN 65
                 -- Vendor name contains query
                 WHEN LOWER(u.name) LIKE LOWER(${"%" + query + "%"}) THEN 60
                 -- Word matches
                 WHEN ${searchTerms.map((term) => `(LOWER(p.name) LIKE LOWER('%${term}%') OR LOWER(p.description) LIKE LOWER('%${term}%') OR LOWER(p.category) LIKE LOWER('%${term}%'))`).join(" OR ")} THEN 50
                 ELSE 0
               END
             ) as search_score
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.status = 'active'
        AND (
          LOWER(p.name) LIKE LOWER(${"%" + query + "%"})
          OR LOWER(p.description) LIKE LOWER(${"%" + query + "%"})
          OR LOWER(p.category) LIKE LOWER(${"%" + query + "%"})
          OR LOWER(COALESCE(p.tags, '')) LIKE LOWER(${"%" + query + "%"})
          OR LOWER(u.name) LIKE LOWER(${"%" + query + "%"})
          OR ${searchTerms.map((term) => `(LOWER(p.name) LIKE LOWER('%${term}%') OR LOWER(p.description) LIKE LOWER('%${term}%'))`).join(" OR ")}
        )
      GROUP BY p.id, u.name
      HAVING search_score > 0
      ORDER BY search_score DESC, avg_rating DESC
      LIMIT 30
    `

    console.log(`📝 Text search found ${products.length} products`)
    return products
  } catch (error) {
    console.error("Enhanced text search error:", error)
    return []
  }
}

async function performFuzzySearch(query: string) {
  try {
    // Simple fallback search
    const products = await sql`
      SELECT p.*, u.name as vendor_name, 
             COALESCE(AVG(r.rating), 0) as avg_rating,
             40 as search_score
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.status = 'active'
        AND (
          p.name ILIKE ${"%" + query + "%"}
          OR p.category ILIKE ${"%" + query + "%"}
          OR p.description ILIKE ${"%" + query + "%"}
        )
      GROUP BY p.id, u.name
      ORDER BY avg_rating DESC
      LIMIT 20
    `

    console.log(`🔤 Fuzzy search found ${products.length} products`)
    return products
  } catch (error) {
    console.error("Fuzzy search error:", error)
    return []
  }
}
