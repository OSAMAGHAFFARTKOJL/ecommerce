import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import Groq from "groq-sdk"

const groq = new Groq()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audio = formData.get("audio") as File

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    const fileName = `voice-${uuidv4()}.webm`
    const filePath = path.join(process.cwd(), "public", "uploads", fileName)

    // Ensure directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true })

    // Convert File to Buffer and save
    const buffer = Buffer.from(await audio.arrayBuffer())
    fs.writeFileSync(filePath, buffer)
    console.log(`✅ Audio file saved: ${filePath}`)

    // Call Groq Whisper for transcription
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3-turbo",
      language: "en",
    })

    console.log("📝 Transcription:", transcription.text)

    // Use Groq's language model to extract a single relevant keyword
    const prompt = `
      You are a keyword extraction system for a product search engine. Given a user query, extract a single, relevant keyword that best represents the product or category the user is searching for. Ignore words like "search", "for", "find", or other non-product-related terms. The keyword should be a single word or a short compound word (e.g., "laptop", "smartphone", "headphones").

      User query: "${transcription.text}"
      Output only the keyword.
    `

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      max_tokens: 10,
      temperature: 0.5,
    })

    const keyword = completion.choices[0]?.message?.content?.trim() || ""

    // Clean up the file
    fs.unlinkSync(filePath)

    if (!keyword) {
      return NextResponse.json({ error: "No valid keyword extracted" }, { status: 400 })
    }

    return NextResponse.json({ keyword })
  } catch (err) {
    console.error("Voice search API error:", err)
    return NextResponse.json({ error: "Failed voice search" }, { status: 500 })
  }
}