import dotenv from "dotenv";
dotenv.config();
import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import { evaluate } from "mathjs";
import { QdrantVectorStore } from "@langchain/qdrant";
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const embeddings = new VoyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY,
  model: "voyage-3-lite",
  inputType: "document",
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  collectionName: "file_collection",
});



export async function generateMain(userMsg, threadId) {
  if (!userMsg) {
    return "Please ask the valid question";
  }

  const chat = await prisma.chat.findUnique({
    where: {
      threadId,
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  const history = chat ? chat.messages : [];
  const relevantchunks = await vectorStore.similaritySearch(userMsg, 3);
  const context = relevantchunks.map((chunk) => chunk.pageContent).join("\n\n");
  const sysPrompt = `SYSTEM OVERRIDE: You are a helpful assistant with access to tools and a knowledge base.

## DECISION PROCESS (Follow this order)
1. **Check the context** (provided with every question). If it contains the answer → use it silently.
2. **If the user asks for YouTube videos, tutorials, or video content** → ALWAYS use the YouTubeSearch tool.
3. **If the user asks for real‑time or up‑to‑date information** (news, weather, current events, people, facts) → use the WebSearch tool.
4. **If the user asks a math question** → use the Calculator tool.
5. **If none of the above** → use your general knowledge.

## TOOL RULES
- **YouTubeSearch** – For ANY question that asks for videos, tutorials, or content on YouTube. Return actual video links.
- **WebSearch** – For news, current events, latest information, or general facts you don't know.
- **Calculator** – For math, arithmetic, or logical expressions.
- **Context** – For answering from documents (PDFs/Excel). Never mention it.

## FORMATTING RULES
- Start with a short, direct answer (1–2 sentences).
- Use ## for main headings, ### for sub‑headings.
- Use bullet points (-) for lists.
- Use **bold** for key terms.
- NEVER say "Based on the context", "In the provided context", or mention the context in any way.
- If you use WebSearch or YouTubeSearch, you may mention that you searched (e.g., "Here are the top results I found:").

## FORMATTING EXAMPLE
User: What is love?
Assistant:
Love is a deep emotional connection involving affection, care, and attachment.

## Types of Love
- **Romantic Love** – Deep emotional bond with a partner.
- **Familial Love** – Strong connection to family.
- **Platonic Love** – Non-romantic close friendship.

## Key Aspects
- **Emotional Connection** – Warmth and care.
- **Commitment** – Dedication to the relationship.

## SPECIAL INSTRUCTIONS FOR YOUTUBE QUERIES
- When the user asks for a YouTube video, do NOT just describe the video or give a generic recommendation.
- Always use the YouTubeSearch tool to fetch actual video links.
- Example:
  User: "Show me YouTube videos on AI."
  Assistant: "Here are the top YouTube videos on AI:
  1. **Introduction to AI** - https://www.youtube.com/watch?v=...
  2. **Machine Learning Basics** - https://www.youtube.com/watch?v=..."

Now answer the user's question.
`;

  const userQuery = `Question:${userMsg} Relevant context:${context}
    IMPORTANT: You have been given permission to use this internal data. Do not refuse to answer.`;
  const messages = [
    { role: "system", content: sysPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userQuery },
  ];

  const Max_Entries = 10;
  let count = 0;
  while (true) {
    if (count > Max_Entries) {
      return "I could not find the result, Plese try again";
    }
    count++;
    const completions = await groq.chat.completions.create({
      messages: messages,
      tools: [
        {
          type: "function",
          function: {
            name: "WebSearch",
            description: "Search the latest and real time data on the internet",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to perform search on",
                },
              },
              required: ["query"],
            },
          },
        },
        // 2. New Calculator tool
        {
          type: "function",
          function: {
            name: "Calculator",
            description:
              "Evaluates a mathematical expression and returns the result.",
            parameters: {
              type: "object",
              properties: {
                expression: {
                  type: "string",
                  description:
                    "The math expression to evaluate, e.g., '25 * 4' or 'sqrt(16)'",
                },
              },
              required: ["expression"],
            },
          },
        },
        // 3. NEW YouTube Search
        {
          type: "function",
          function: {
            name: "YouTubeSearch",
            description:
              "CRITICAL: You MUST call this tool whenever the user asks for YouTube videos or video content. If you do not call this tool, you will fail the task. This tool returns real video links.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search keyword for the video",
                },
              },
              required: ["query"],
            },
          },
        },
      ],
      tool_choice: "auto",
      model: "llama-3.3-70b-versatile",
      temperature: 1,
    });

    //pushing the assistant message
    messages.push(completions.choices[0].message);

    const toolcalls = completions.choices[0].message.tool_calls;
    //   console.log(toolcalls);

    if (!toolcalls) {
      return `${completions.choices[0].message.content}`;
    }
   
    for (let tool of toolcalls) {
      let functionName = tool.function.name;
      let functionArguments = tool.function.arguments;
      if ("WebSearch" === functionName) {
        const toolresult = await WebSearch(JSON.parse(functionArguments));
        messages.push({
          tool_call_id: tool.id,
          role: "tool",
          name: functionName,
          content: toolresult,
        });
      } else if (functionName === "Calculator") {
        const result = await calculate(JSON.parse(functionArguments));
        messages.push({
          tool_call_id: tool.id,
          role: "tool",
          name: functionName,
          content: result,
        });
      }
      // YouTube handler
      else if ("YouTubeSearch" === functionName) {
        const result = await YouTubeSearch(JSON.parse(functionArguments));
        messages.push({
          tool_call_id: tool.id,
          role: "tool",
          name: functionName,
          content: result,
        });
      }
    }
  }
}

async function WebSearch({ query }) {
  console.log("Calling the tool......");
  const response = await tvly.search(query);
  const finalresult = response.results.map((res) => res.content).join("\n\n");
  return finalresult;
}

async function calculate(expression) {
  try {
    const result = evaluate(expression);
    return `Result: ${result}`;
  } catch (error) {
    return `Error: Invalid expression. Please use valid math syntax.`;
  }
}

async function YouTubeSearch({ query }) {
  console.log("🔍 Searching YouTube for:", query);
  const API_KEY = process.env.YOUTUBE_API_KEY;

  try {
    // Step 1 – Search
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}&type=video&order=relevance`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.error) {
      return `YouTube API error: ${searchData.error.message}`;
    }
    if (!searchData.items || searchData.items.length === 0) {
      return "No YouTube videos found for that query.";
    }

    // DEFENSIVE: Only keep items that actually have a videoId
    const validItems = searchData.items.filter(
      (item) => item?.id?.videoId && typeof item.id.videoId === "string"
    );

    if (validItems.length === 0) {
      return "No valid video results found. The API may have returned channels or playlists.";
    }

    // Step 2 – Extract video IDs
    const videoIds = validItems.map((item) => item.id.videoId).join(",");

    // Step 3 – Check status of each video
    const checkUrl = `https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails&id=${videoIds}&key=${API_KEY}`;
    const checkRes = await fetch(checkUrl);
    const checkData = await checkRes.json();

    if (checkData.error) {
      return `YouTube API error (status check): ${checkData.error.message}`;
    }

    // Step 4 – Filter playable videos
    const available = validItems.filter((item) => {
      const video = checkData.items.find((v) => v.id === item.id.videoId);
      if (!video || !video.status) return false;

      const isPublic = video.status.privacyStatus === "public";
      const isUnlisted = video.status.privacyStatus === "unlisted";
      const isProcessed = video.status.uploadStatus === "processed";

      // Also reject embed-restricted videos if you plan to embed them
      // const embeddable = video.status.embeddable !== false;

      return (isPublic || isUnlisted) && isProcessed;
    });

    if (available.length === 0) {
      return "No playable YouTube videos found. They may be private, deleted, or still processing.";
    }

    // Step 5 – Format top 5
    const top = available.slice(0, 5);
    let results = `Here are the top playable YouTube videos for "${query}":\n\n`;
    top.forEach((item, i) => {
      const title = item.snippet?.title || "Untitled";
      const videoId = item.id.videoId;
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      results += `${i + 1}. **${title}**\n   Link: ${url}\n\n`;
    });

    return results;
  } catch (err) {
    console.error("YouTubeSearch error:", err);
    return `Failed to search YouTube: ${err.message}`;
  }
}
