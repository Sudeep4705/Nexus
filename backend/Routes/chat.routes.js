import express from "express";
import multer from "multer";
import path from "path";
import { indexFile } from "../embeddFiledata.js";
import { PrismaClient } from "@prisma/client";
import { generateMain } from "../llmserver.js";
import { validate } from "../middlewares/verifyLogin.js";
import { asyncWrapper } from "../middlewares/asyncWrapper.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import rateLimit from "express-rate-limit";
const router = express.Router();
const storage = multer.memoryStorage();
const prisma = new PrismaClient();

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (in milliseconds)
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: "Too many requests from this IP, please try again after 15 minutes.",
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to ONLY 15 AI requests per 15 minutes
  message: "You've sent too many AI requests. Please wait 15 minutes before asking again.",
});
router.use(globalLimiter);

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

//this function for accept pdf and excel only
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".pdf", ".xlsx", ".xls"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and Excel files are allowed"));
  }
};

const uploads = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
});

router.post(
  "/add",
  aiLimiter,
  validate,
  asyncWrapper(async (req, res) => {
    const msg = req.body.content;
    const threadId = req.body.threadId;
    if (!msg) {
      return res.status(400).json({ message: "All fields required" });
    }
    let chat = await prisma.chat.findUnique({
      where: {
        threadId,
      },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          threadId,
          userId: req.user.id,
        },
      });
    }
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: msg,
      },
    });

        // 2. SET UP THE SSE HEADERS (The Pipe)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Force headers to send immediately

    let fullAssistantReply = ""
       try {
      // 3. CATCH THE YIELDED WORDS AND SEND THEM
      // generateMain is now a conveyor belt. We catch each piece as it arrives.
      for await (const chunk of generateMain(msg, threadId)) {

          // Add this chunk to our bucket
        fullAssistantReply += chunk; 

        // Format the chunk for SSE (must have "data: " and "\n\n")
        res.write(`data: ${chunk}\n\n`);
      }
    // Save the final AI response to Prisma here once the stream is done.
      // await prisma.message.create({ ... })
        await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "assistant",
        content: fullAssistantReply,
      },
    });
      // 5. CLOSE THE CONNECTION
      res.end(); 
      
    } catch (error) {
      console.error("Streaming Error:", error);
      res.write(`data: [Error] Failed to generate response.\n\n`);
      res.end();
    }
  
  }),
);

router.post(
  "/fileupload",
  validate,
  uploads.single("file"),
  asyncWrapper(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "'No file uploaded'" });
    }
    const { originalname, buffer } = req.file;
    const { threadId } = req.body;
    await indexFile(originalname, buffer, threadId);
    res.status(200).json({
      success: true,
      message: `File "${originalname}" indexed successfully.`,
    });
  }),
);

router.get(
  "/:threadId",
  validate,
  asyncWrapper(async (req, res) => {
    const { threadId } = req.params;
    let chathistory = await prisma.chat.findUnique({
      where: {
        threadId,
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!chathistory) {
      return res.json({ messages: [] });
    }

    if (chathistory.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const messages = chathistory.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    res.json({ messages });
  }),
);

router.get(
  "/",
  validate,
  asyncWrapper(async (req, res) => {
    const chats = await prisma.chat.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        threadId: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true },
        },
      },
    });
    res.json({ chats });
  }),
);

router.delete(
  "/:threadId",
  validate,
  asyncWrapper(async (req, res) => {
    const { threadId } = req.params;
    const chat = await prisma.chat.findUnique({ where: { threadId } });
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (chat.userId !== req.user.id)
      return res.status(403).json({ error: "Unauthorized" });
    await prisma.chat.delete({ where: { threadId } });
    await qdrantClient.delete("file_collection", {
      filter: {
        must: [
          {
            key: "metadata.threadId",
            match: { value: threadId },
          },
        ],
      },
    });
    res.json({ message: "Chat deleted" });
  }),
);

// router.post("/test-stream",async(req,res)=>{
//   // 1. Tell the browser we are sending an SSE stream
//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Connection", "keep-alive");

//   res.write("data: Hello... \n\n");
//    setTimeout(() => {
//     res.write("data: World!\n\n");
    
//     // 4. NOW we close the connection
//     res.end(); 
//   }, 1000);
// })

export default router;
