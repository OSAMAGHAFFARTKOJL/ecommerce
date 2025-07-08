// lib/groqSearch.ts
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

export async function generateGroqEmbedding(query: string): Promise<number[]> {
  const response = await groq.embeddings.create({
    model: "llama3-8b-8192",
    input: query,
  })

  return response.data[0].embedding
}
