import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import os from "os"; // Import os module for tmpdir

const groq = new Groq();

// Define a safe size limit (e.g., 4MB)
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes

export async function POST(req: NextRequest) {
  try {
    console.log("Received headers:", req.headers.get("Authorization"));
    const formData = await req.formData();
    const audio = formData.get("audio") as File;

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Validate file size
    if (audio.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Audio file too large (max 4MB)" }, { status: 400 });
    }

    // Convert File to Buffer in memory
    const buffer = Buffer.from(await audio.arrayBuffer());

    // Use system temporary directory
    const fileName = `voice-${uuidv4()}.webm`;
    const filePath = path.join(os.tmpdir(), fileName);
    console.log(`Attempting to save to: ${filePath}`); // Debug log

    // Ensure directory exists (though os.tmpdir() should already be valid)
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Save to /tmp and use stream
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Audio file saved to /tmp: ${filePath}`);

    // Call Groq Whisper for transcription
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3-turbo",
      language: "en",
    });

    console.log("📝 Transcription:", transcription.text);

    // Clean up the file
    fs.unlinkSync(filePath);

    // Use Groq's language model to extract a single relevant keyword
    const prompt = `
      You are a keyword extraction system for a product search engine. Given a user query, extract a single, relevant keyword that best represents the product or category the user is searching for. Ignore words like "search", "for", "find", or other non-product-related terms. The keyword should be a single word or a short compound word (e.g., "laptop", "smartphone", "headphones").

      User query: "${transcription.text}"
      Output only the keyword.
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      max_tokens: 10,
      temperature: 0.5,
    });

    const keyword = completion.choices[0]?.message?.content?.trim() || "";

    if (!keyword) {
      return NextResponse.json({ error: "No valid keyword extracted" }, { status: 400 });
    }

    return NextResponse.json({ keyword });
  } catch (err) {
    console.error("Voice search API error:", err);
    return NextResponse.json({ error: "Failed voice search" }, { status: 500 });
  }
}
