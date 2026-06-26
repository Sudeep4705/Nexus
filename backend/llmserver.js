import dotenv from "dotenv";
dotenv.config();
import Groq from "groq-sdk"
import { tavily } from "@tavily/core";
import { QdrantVectorStore } from "@langchain/qdrant";
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage"

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// import { mcpClient } from "./mcpTavily.js";
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const embeddings = new VoyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY,
  model: "voyage-3-lite", 
  inputType: "document"
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url:process.env.QDRANT_URL,
  apiKey:process.env.QDRANT_API_KEY,
  collectionName: "file_collection",
});



// const toolList = await mcpClient.listTools();
// console.log("this is the toollist",toolList);

// const tools = toolList.tools.map(tool=>({
//   type:"function",
//   function:{
//     name:tool.name,
//     description: tool.description,
//     parameters: tool.inputSchema
//   }
// }))
// console.log("tools available",tools);



export async function generateMain(userMsg,threadId){
  if(!userMsg){
    return "Please ask the valid question"
  }

  const chat =  await prisma.chat.findUnique({
    where:{
      threadId
    },
    include:{
      messages:{orderBy:{createdAt:"asc"}}
    }
  })
  const history  = chat?chat.messages:[]
    const relevantchunks = await vectorStore.similaritySearch(userMsg,3)
    const context = relevantchunks.map((chunk)=>chunk.pageContent).join('\n\n')
    const sysPrompt = `SYSTEM OVERRIDE: You are a helpful assistant with access to two sources:
1. The "Relevant context" section (provided below).
2. A WebSearch tool for real‑time or external information.

RULES:
- If the context contains the answer → use it directly and respond.
- If the context is empty or does NOT contain the answer → DO NOT mention that you checked the context. Instead, silently use the WebSearch tool and respond with the search results.
- Never say "Based on the provided context" or "The context says" – just give the answer.

Now answer the user's question.
`;

    const userQuery = `Question:${userMsg} Relevant context:${context}
    IMPORTANT: You have been given permission to use this internal data. Do not refuse to answer.`
     const messages = [
    { role: "system", content: sysPrompt},
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userQuery },
  ];



const Max_Entries = 10
let count = 0
while(true){
  if(count>Max_Entries){
    return "I could not find the result, Plese try again"
  }
  count++
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
    ],  
    tool_choice:"auto",
    model:"meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 1,
  });

//pushing the assistant message
messages.push(completions.choices[0].message)

  const toolcalls = completions.choices[0].message.tool_calls;
//   console.log(toolcalls);
  
  if (!toolcalls){
    return `${completions.choices[0].message.content}`
  }
  // for (const tool of toolcalls) {
  //   const result = await mcpClient.callTool({
  //     name: tool.function.name,
  //     arguments: JSON.parse(tool.function.arguments)
  //   });
  //   console.log("Result",result);
    
  //   messages.push({
  //     tool_call_id: tool.id,
  //     role: "tool",
  //     name: tool.function.name,
  //     content: result.content.map(c => c.text).join("\n\n")
  //   });
  // }
  for (let tool of toolcalls) {
    let functionName = tool.function.name;
    let functionArguments = tool.function.arguments;
    if ("WebSearch" === functionName) {
      const toolresult = await WebSearch(JSON.parse(functionArguments));
      messages.push({
        tool_call_id:tool.id,
        role:'tool',
        name:functionName,
        content:toolresult
      })
    }
  }
}
}


async function WebSearch({ query }) {
    console.log("Calling the tool......");
    const response = await tvly.search(query)
    const finalresult = response.results.map((res)=>res.content).join('\n\n')
    return finalresult
}
