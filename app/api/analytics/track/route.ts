import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import jwt from "jsonwebtoken"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any
    const { event, data, timestamp } = await request.json()

    // Store user interaction
    await sql`
      INSERT INTO user_interactions (user_id, event, data, created_at)
      VALUES (${decoded.userId}, ${event}, ${JSON.stringify(data)}, ${timestamp})
    `

    // Update user preferences based on the interaction
    await updateUserPreferences(decoded.userId, event, data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error tracking event:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function updateUserPreferences(userId: string, event: string, data: any) {
  try {
    // Get or create user preferences
    const existingPrefs = await sql`
      SELECT * FROM user_preferences WHERE user_id = ${userId}
    `

    let preferences = {}
    if (existingPrefs.length > 0) {
      preferences =
        typeof existingPrefs[0].preferences === "string"
          ? JSON.parse(existingPrefs[0].preferences)
          : existingPrefs[0].preferences
    }

    // Update preferences based on event type
    switch (event) {
      case "product_view":
        if (data.category) {
          preferences.categories = preferences.categories || {}
          preferences.categories[data.category] = (preferences.categories[data.category] || 0) + 1
        }
        break

      case "add_to_cart":
      case "purchase":
        if (data.category) {
          preferences.categories = preferences.categories || {}
          preferences.categories[data.category] = (preferences.categories[data.category] || 0) + 3
        }
        if (data.price) {
          preferences.price_ranges = preferences.price_ranges || {}
          const priceRange = getPriceRange(data.price)
          preferences.price_ranges[priceRange] = (preferences.price_ranges[priceRange] || 0) + 1
        }
        break

      case "search":
        if (data.query) {
          preferences.search_terms = preferences.search_terms || {}
          preferences.search_terms[data.query] = (preferences.search_terms[data.query] || 0) + 1
        }
        break
    }

    // Upsert user preferences
    if (existingPrefs.length > 0) {
      await sql`
        UPDATE user_preferences 
        SET preferences = ${JSON.stringify(preferences)}, updated_at = NOW()
        WHERE user_id = ${userId}
      `
    } else {
      await sql`
        INSERT INTO user_preferences (user_id, preferences, created_at, updated_at)
        VALUES (${userId}, ${JSON.stringify(preferences)}, NOW(), NOW())
      `
    }
  } catch (error) {
    console.error("Error updating user preferences:", error)
  }
}

function getPriceRange(price: number): string {
  if (price < 50) return "0-50"
  if (price < 100) return "50-100"
  if (price < 200) return "100-200"
  if (price < 500) return "200-500"
  return "500+"
}
