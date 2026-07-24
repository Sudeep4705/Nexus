import dotenv from "dotenv";
dotenv.config();
import { QdrantVectorStore } from "@langchain/qdrant";
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
import { fileToDocuments } from "./fileloader.js";

const embeddings = new VoyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY,
  model: "voyage-3-lite",
  inputType: "document"
});

export async function indexFile(filepath,buffer) {
  const documents = await fileToDocuments(filepath,buffer);
  console.log(`Converted ${filepath} to ${documents.length} documents`);
  await QdrantVectorStore.fromDocuments(documents, embeddings,{
  url: process.env.QDRANT_URL,        
  apiKey: process.env.QDRANT_API_KEY,
  collectionName: "file_collection",
  });
  console.log(`Stored vectors for ${filepath}`); 
}