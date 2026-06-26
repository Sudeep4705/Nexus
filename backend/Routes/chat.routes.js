import express from "express";
import multer from "multer";
import path from "path";
import { indexFile } from "../embeddFiledata.js";
import { PrismaClient } from "@prisma/client";
import { generateMain } from "../llmserver.js";
import {validate} from "../middlewares/verifyLogin.js"
const router =  express.Router()
const storage = multer.memoryStorage();
const prisma = new PrismaClient();


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

router.post("/add",validate,async (req, res) => {
  const msg = req.body.content;
  const threadId = req.body.threadId;
  console.log("this my thread id",threadId);
  
  if (!msg) {
    return res.status(400).json({ message: "All fields required" });
  }
  try {
    let chat = await prisma.chat.findUnique({
      where: {
        threadId,
      },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          threadId,
          userId:req.user.id
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

    const assistantReply = await generateMain(msg, threadId);
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "assistant",
        content: assistantReply,
      },
    });
    res.status(200).json({ message: assistantReply });
  } catch (error) {
    console.error("Error in /data:", error);
    res
      .status(500)
      .json({ message: "Sorry, something went wrong on the server." });
  }
})

router.post("/fileupload",validate,uploads.single("file"), async (req, res) => {
  console.log("file upload hitttt");
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: "'No file uploaded'" });
    }
    const { originalname, buffer } = req.file;
    await indexFile(originalname, buffer);
    res.status(200).json({
      success: true,
      message: `File "${originalname}" indexed successfully.`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process the file: " + error.message,
    });
  }
})

router.get("/:threadId",validate, async (req, res) => {
  const { threadId } = req.params;
  try {
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

    if(chathistory.userId!==req.user.id){
      return res.status(403).json({ error: "Unauthorized" });
    }
    const messages = chathistory.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error });
  }
})

router.get("/",validate,async(req,res)=>{
  console.log("im fetching the chats");
  try{
    const chats = await prisma.chat.findMany({
      where:{
        userId:req.user.id
      },
      orderBy:{updatedAt:"desc"},
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
    })
    res.json({chats})
  }
  catch(error){
    console.error("Error fetching chats:", error);
      res.status(500).json({ error: "Internal server error" });
  }
})

export default router