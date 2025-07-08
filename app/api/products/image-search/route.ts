import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import Groq from "groq-sdk";

const groq = new Groq();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Convert image to base64 directly from the File object
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64Image = buffer.toString("base64");
    const mimeType = image.type;
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Analyze image with Groq model
    const prompt = `
      You are a keyword extraction system for a product search engine. Analyze the provided image and identify the primary product or object in it. Extract a single, relevant keyword that best represents the product or category for a search query. The keyword should be a single word or a short compound word (e.g., "laptop", "smartphone", "headphones"). Avoid generic or non-product-related terms.

      Output only the keyword.
    `;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 10,
      temperature: 0.5,
    });

    const keyword = completion.choices[0]?.message?.content?.trim() || "";

    if (!keyword) {
      return NextResponse.json({ error: "No valid keyword extracted" }, { status: 400 });
    }

    return NextResponse.json({ keyword });
  } catch (err) {
    console.error("Image search API error:", err);
    return NextResponse.json({ error: "Failed image search" }, { status: 500 });
  }
}