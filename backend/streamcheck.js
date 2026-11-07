import dotenv from "dotenv";
dotenv.config();
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testStream() {
  console.log("--- Starting AI Stream ---");
  const stream = await groq.chat.completions.create({
    messages: [
      { role: "user", content: "Tell me a brief story about messi." }
    ],
    model: "openai/gpt-oss-20b", 
    stream: true, 
  });

 for await (const chunk of stream) {
    const textPiece = chunk.choices[0]?.delta?.content || ""; 
    process.stdout.write(textPiece); 
  }
  console.log("\n--- Stream Finished ---");
}

testStream();