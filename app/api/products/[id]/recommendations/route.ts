import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Helper to shape product rows → JSON the UI expects
function shape(rows: any[]) {
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    image_url: p.image_url,
    category: p.category,
    rating: Number(p.avg_rating),
    vendor: p.vendor_name,
    tags: p.tags ? p.tags.split(",") : [],
  }))
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = Number(params.id)

    // ───────────────────────────────────────────────────────────
    // 1. Does the `embedding` column exist?
    // ───────────────────────────────────────────────────────────
    const hasEmbedding =
      (
        await sql`
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'embedding'
          LIMIT 1
        `
      ).length > 0

    // ───────────────────────────────────────────────────────────
    // 2. Load the current product
    // ───────────────────────────────────────────────────────────
    const currentRows = hasEmbedding
      ? await sql`
          SELECT category, tags, embedding
          FROM products
          WHERE id = ${productId}
          LIMIT 1
        `
      : await sql`
          SELECT category, tags
          FROM products
          WHERE id = ${productId}
          LIMIT 1
        `

    if (currentRows.length === 0) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    const current = currentRows[0]

    // ───────────────────────────────────────────────────────────
    // 3. If we have embeddings → vector similarity; else fallback
    // ───────────────────────────────────────────────────────────
    if (hasEmbedding && current.embedding) {
      const recs = await sql`
        SELECT p.*, u.name AS vendor_name,
               COALESCE(AVG(r.rating), 0) AS avg_rating,
               (p.embedding <=> ${current.embedding}) AS sim_dist
        FROM products p
        JOIN users   u ON p.vendor_id = u.id
        LEFT JOIN reviews r ON r.product_id = p.id
        WHERE p.status = 'active'
          AND p.id <> ${productId}
          AND p.embedding IS NOT NULL
        GROUP BY p.id, u.name, p.embedding
        ORDER BY sim_dist ASC
        LIMIT 8
      `

      return NextResponse.json(
        shape(recs).map((row: any) => ({
          ...row,
          similarity_score: 1 - row.sim_dist,
        })),
      )
    }

    // ───────────────────────────────────────────────────────────
    // 4. Category-based fallback
    // ───────────────────────────────────────────────────────────
    const fallback = await sql`
      SELECT p.*, u.name AS vendor_name,
             COALESCE(AVG(r.rating), 0) AS avg_rating
      FROM products p
      JOIN users   u ON p.vendor_id = u.id
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE p.status = 'active'
        AND p.category = ${current.category}
        AND p.id <> ${productId}
      GROUP BY p.id, u.name
      ORDER BY avg_rating DESC
      LIMIT 8
    `

    return NextResponse.json(shape(fallback))
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
