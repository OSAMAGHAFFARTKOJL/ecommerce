import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

// Enhanced local embeddings functions
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function generateEnhancedEmbedding(text: string, dimensions = 384): number[] {
  const cleanText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const words = cleanText.split(" ").filter((word) => word.length > 1)

  if (words.length === 0) {
    return new Array(dimensions).fill(0)
  }

  const vector = new Array(dimensions).fill(0)

  words.forEach((word, index) => {
    const hash1 = simpleHash(word) % dimensions
    const hash2 = simpleHash(word + "_semantic") % dimensions
    const hash3 = simpleHash(word + "_context") % dimensions
    const hash4 = simpleHash(word.substring(0, 3)) % dimensions

    const positionWeight = 1.0 / Math.sqrt(index + 1)

    vector[hash1] += positionWeight * 2.0
    vector[hash2] += positionWeight * 1.5
    vector[hash3] += positionWeight * 1.0
    vector[hash4] += positionWeight * 0.5

    const lengthHash = simpleHash(word + "_len_" + word.length) % dimensions
    vector[lengthHash] += 0.3
  })

  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + "_" + words[i + 1]
    const bigramHash = simpleHash(bigram) % dimensions
    vector[bigramHash] += 0.8
  }

  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / magnitude
    }
  }

  return vector
}

function generateEnhancedSearchTerms(name: string, category: string, description = ""): string {
  const terms = new Set<string>()
  const nameLower = name.toLowerCase()
  const categoryLower = category.toLowerCase()
  const descLower = description.toLowerCase()

  terms.add(name.toLowerCase())
  terms.add(category.toLowerCase())

  const brands = {
    apple: ["apple", "iphone", "ipad", "macbook", "mac", "ios"],
    samsung: ["samsung", "galaxy", "note"],
    nike: ["nike", "air", "jordan", "swoosh"],
    sony: ["sony", "playstation", "bravia"],
    google: ["google", "pixel", "android"],
    microsoft: ["microsoft", "xbox", "surface", "windows"],
  }

  Object.entries(brands).forEach(([brand, variations]) => {
    if (nameLower.includes(brand) || descLower.includes(brand)) {
      variations.forEach((v) => terms.add(v))
    }
  })

  const categoryTerms = {
    electronics: ["electronics", "electronic", "gadget", "device", "tech", "technology", "smart", "digital", "wireless"],
    computers: ["computer", "computers", "pc", "laptop", "notebook", "desktop", "tech", "technology", "portable"],
    fashion: ["fashion", "clothing", "clothes", "apparel", "wear", "style", "designer", "trendy", "outfit"],
    "home & garden": ["home", "house", "garden", "furniture", "kitchen", "appliance", "household", "domestic"],
    books: ["book", "books", "read", "reading", "literature", "novel", "text"],
    gaming: ["gaming", "game", "games", "play", "console", "video", "entertainment"],
  }

  Object.entries(categoryTerms).forEach(([cat, searchTerms]) => {
    if (categoryLower.includes(cat.toLowerCase())) {
      searchTerms.forEach((term) => terms.add(term))
    }
  })

  const productPatterns = [
    {
      patterns: ["phone", "iphone", "smartphone"],
      terms: ["phone", "mobile", "smartphone", "cell", "cellular", "communication", "call", "device"],
    },
    {
      patterns: ["laptop", "macbook", "notebook"],
      terms: ["laptop", "computer", "notebook", "portable", "work", "productivity", "business"],
    },
    {
      patterns: ["chair", "seat", "stool"],
      terms: ["chair", "seat", "seating", "furniture", "office", "desk", "ergonomic", "comfort"],
    },
  ]

  productPatterns.forEach(({ patterns, terms: productTerms }) => {
    if (patterns.some((pattern) => nameLower.includes(pattern) || descLower.includes(pattern))) {
      productTerms.forEach((term) => terms.add(term))
    }
  })

  return Array.from(terms).join(" ")
}

async function generateProductEmbedding(product: {
  name: string
  description: string
  category: string
  tags?: string[]
}): Promise<number[]> {
  const searchTerms = generateEnhancedSearchTerms(product.name, product.category, product.description)
  const text = [product.name, product.description, product.category, ...(product.tags || []), searchTerms]
    .filter(Boolean)
    .join(" ")
  return generateEnhancedEmbedding(text)
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const products = await sql`
      SELECT p.*, COUNT(oi.id) as total_sales
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      WHERE p.vendor_id = ${decoded.userId}
      GROUP BY p.id
    `

    return NextResponse.json(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number.parseFloat(product.price),
        category: product.category,
        status: product.status,
        stock_quantity: product.stock_quantity,
        image_url: product.image_url,
        tags: product.tags,
        created_at: product.created_at,
        total_sales: Number.parseInt(product.total_sales || 0),
      })),
    )
  } catch (error) {
    console.error("Error fetching vendor products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Starting product creation...")
    
    const token = request.cookies.get("token")?.value
    if (!token) {
      console.log("❌ No authentication token found")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      console.log("✅ Token verified for user:", decoded.userId)
    } catch (error) {
      console.log("❌ Invalid token:", error)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    console.log("📝 Request body:", body)
    
    const { name, description, price, category, tags, image_url, stock_quantity } = body

    // Validate required fields
    if (!name || !description || !category || price === undefined || stock_quantity === undefined) {
      console.log("❌ Missing required fields")
      return NextResponse.json({ 
        error: "Missing required fields: name, description, category, price, stock_quantity" 
      }, { status: 400 })
    }

    // Validate data types
    const numPrice = parseFloat(price)
    const numStock = parseInt(stock_quantity)
    
    if (isNaN(numPrice) || numPrice < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 })
    }
    
    if (isNaN(numStock) || numStock < 0) {
      return NextResponse.json({ error: "Invalid stock quantity" }, { status: 400 })
    }

    // Generate embedding for the new product
    let embedding = null
    try {
      console.log("🔄 Generating embedding...")
      const tagsArray = tags ? tags.split(",").map((t: string) => t.trim()).filter(Boolean) : []
      embedding = await generateProductEmbedding({
        name,
        description,
        category,
        tags: tagsArray,
      })
      console.log(`✅ Generated embedding for new product: ${name} (${embedding.length} dimensions)`)
    } catch (error) {
      console.error("⚠️ Error generating embedding for new product:", error)
      // Continue without embedding - it can be generated later
    }

    try {
      console.log("💾 Inserting product into database...")
      
      // Use 'pending' status which should be valid according to our constraint
      const newProduct = await sql`
        INSERT INTO products (
          name, description, price, category, tags, image_url, 
          vendor_id, stock_quantity, status, embedding
        )
        VALUES (
          ${name}, 
          ${description}, 
          ${numPrice}, 
          ${category}, 
          ${tags || ''}, 
          ${image_url || '/placeholder.svg?height=400&width=400'}, 
          ${decoded.userId}, 
          ${numStock}, 
          'inactive', 
          ${embedding ? JSON.stringify(embedding) : null} 
          
        )
        RETURNING *
      `

      console.log("✅ Product created successfully:", newProduct[0].id)
      
      return NextResponse.json({
        success: true,
        product: {
          id: newProduct[0].id,
          name: newProduct[0].name,
          status: newProduct[0].status,
          embedding_generated: !!embedding
        }
      })
    } catch (dbError) {
      console.error("❌ Database error:", dbError)
      
      // Check if it's a constraint violation
      if (dbError.code === '23514') {
        return NextResponse.json({ 
          error: "Invalid product status. Please contact support." 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: "Database error: " + (dbError as Error).message 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ Error creating product:", error)
    return NextResponse.json({ 
      error: "Internal server error: " + (error as Error).message 
    }, { status: 500 })
  }
}
