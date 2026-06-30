import dotenv from "dotenv";
dotenv.config();
import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import { evaluate, log } from "mathjs";
import wiki from 'wikipedia';
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
  const sysPrompt = `
SYSTEM OVERRIDE: You are a helpful assistant with access to tools and a knowledge base.

## DECISION PROCESS (Follow this order)
1. **Check the context** (provided with every question). If it contains the answer → use it silently.
2. **If the user asks for YouTube videos, tutorials, or video content** → ALWAYS use the YouTubeSearch tool.
3. **If the user asks for general knowledge, historical figures, definitions, or concepts** → use the WikipediaSearch tool.
4. **If the user asks for real‑time or up‑to‑date information** (news, weather, current events, people, facts) → use the WebSearch tool.
5. **If the user asks a math question** → use the Calculator tool.
6. **If none of the above** → use your general knowledge.
7. **If the user asks for jobs, remote work, or companies hiring** → use the RemoteJobs tool.

## TOOL RULES
- **YouTubeSearch** – For ANY question that asks for videos, tutorials, or content on YouTube. Return actual video links.
- **WikipediaSearch** – For general knowledge, definitions, historical figures, and concepts. Use this instead of WebSearch for factual, non‑time‑sensitive questions.
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

## SPECIAL INSTRUCTIONS FOR WIKIPEDIA QUERIES
- When the user asks for a definition, biography, or explanation of a concept, use the WikipediaSearch tool.
- Example:
  User: "Who is Alan Turing?"
  Assistant: "Alan Turing was a British mathematician and computer scientist, widely considered the father of theoretical computer science and artificial intelligence."

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
        // wikipedia
        {
  type: "function",
  function: {
    name: "WikipediaSearch",
    description: "Search Wikipedia for a topic and return a summary. Use this for historical figures, definitions, concepts, and general knowledge.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The topic to search for on Wikipedia" }
      },
      required: ["query"]
    }
  }
}
,
// remote job 
{
  type: "function",
  function: {
    name: "RemoteJobs",
    description: "Search for remote jobs worldwide. Use this for job search, remote work, or finding companies hiring.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Job role or keyword e.g., 'React Developer', 'Data Analyst'" },
        country: { type: "string", description: "Country code e.g., 'IN', 'US', 'GB' (optional)" }
      },
      required: ["query"]
    }
  }
}
      ],
      tool_choice: "auto",
      model:"openai/gpt-oss-20b",
      temperature: 0,
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
      // wikipedia
      else if (functionName === "WikipediaSearch") {
  const args = JSON.parse(functionArguments);
  const result = await WikipediaSearch(args);
  messages.push({
    tool_call_id: tool.id,
    role: "tool",
    name: functionName,
    content: result,
  });
}else if (functionName === "RemoteJobs") {
  const args = JSON.parse(functionArguments);
  const result = await RemoteJobs(args);
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
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}&type=video&order=relevance&videoDuration=long`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return "No YouTube videos found for that query.";
    }
    // Format the results nicely
    let results = `Here are the top 5 YouTube videos for "${query}":\n\n`;
    data.items.forEach((item, index) => {
      const title = item.snippet.title;
      const videoId = item.id.videoId;
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      results += `${index + 1}. **${title}**\n   Link: ${url}\n\n`;
    });
    return results;
  } catch (error) {
    console.error("YouTube API error:", error);
    return "Sorry, I couldn't fetch YouTube videos at the moment.";
  }
}


async function WikipediaSearch({query}) {
  console.log("searching wikipedia");
  try{
    const page = await wiki.page(query)
    console.log(page);
    const summary = await page.summary();
    console.log(summary);
    return `**${summary.title}**\n\n${summary.extract}`;
  }catch (error) {
    return `Sorry, I couldn't find anything on Wikipedia for "${query}".`;
  }
}


async function RemoteJobs({ query, country }) {
  try {
    const url = `https://himalayas.app/api/jobs?search=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.jobs || data.jobs.length === 0) {
      return `No remote jobs found for "${query}".`;
    }

    let result = `Here are some remote jobs for "${query}":\n\n`;
    data.jobs.slice(0, 5).forEach((job, i) => {
      result += `${i + 1}. **${job.title}**\n`;
      result += `   Company: ${job.company}\n`;
      if (job.salary) result += `   Salary: ${job.salary}\n`;
      result += `   Apply: ${job.url}\n\n`;
    });
    return result;
  } catch (error) {
    console.error('RemoteJobs error:', error);
    return 'Sorry, I could not fetch job listings.';
  }
}