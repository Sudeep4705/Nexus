import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import chatRouter from './Routes/chat.routes.js'
import authRouter from './Routes/auth.routes.js'
import cookieParser from "cookie-parser";
import { QdrantClient } from '@qdrant/js-client-rest';
const app = express()
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});


// middlewares 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "https://nexus-gules-rho.vercel.app", credentials: true }));
app.use(cookieParser())

// routes
app.use("/chats",chatRouter);
app.use("/auth",authRouter)

// gloabal error handler
app.use((err, req, res, next) => {
  console.error("Global Error Handler caught:", err);

  // 1. Catch Multer file size errors specifically
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File is too large. Maximum size is 50MB." });
  }

  // 2. Catch any other errors (like database errors, etc.)
  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";

  // 3. Send a clean JSON response back to the frontend
  res.status(statusCode).json({ message });
});

// making the payload index
async function setupDatabase() {
  try {
    await qdrantClient.createPayloadIndex("file_collection", {
      field_name: "metadata.threadId",
      field_schema: "keyword",
    });
    console.log("Qdrant index for threadId is ready!");
  } catch (error) {
    console.log("Index already exists, skipping setup.");
  }
}

setupDatabase();

app.listen(8333, () => {
  console.log("SERVER IS LISTENING ON THE PORT 8333");
});
