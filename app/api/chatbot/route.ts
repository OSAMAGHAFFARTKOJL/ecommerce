import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: `You are a helpful e-commerce shopping assistant. You help customers find products, answer questions about orders, shipping, returns, and provide general shopping advice. Keep responses concise and helpful. If asked about specific products, suggest they browse the product catalog or use the search feature.`,
      prompt: message,
    })

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("Chatbot error:", error)
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
