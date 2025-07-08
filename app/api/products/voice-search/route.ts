import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import os from "os";

const groq = new Groq();
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File;

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (audio.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Audio file too large (max 4MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());

    // Always use /tmp in serverless
    const fileName = `voice-${uuidv4()}.webm`;
    const filePath = path.join(os.tmpdir(), fileName);
    console.log("Temp dir:", os.tmpdir(), "Full path:", filePath);

    fs.writeFileSync(filePath, buffer);
    console.log("✅ Audio file saved to:", filePath);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3-turbo",
      language: "en",
    });

    fs.unlinkSync(filePath); // Clean up
    console.log("📝 Transcription:", transcription.text);

    const prompt = `
      You are a keyword extraction system for a product search engine.
      Given a user query, extract a single, relevant keyword.
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
