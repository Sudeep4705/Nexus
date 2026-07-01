import express from "express";
import multer from "multer";
import path from "path";
import { indexFile } from "../embeddFiledata.js";
import { PrismaClient } from "@prisma/client";
import { generateMain } from "../llmserver.js";
import {validate} from "../middlewares/verifyLogin.js"
import { asyncWrapper } from "../middlewares/asyncWrapper.js";
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

router.post("/add",validate,asyncWrapper(async (req, res) => {
  const msg = req.body.content;
  const threadId = req.body.threadId;
  if (!msg) {
    return res.status(400).json({ message: "All fields required" });
  }
    let chat = await prisma.chat.findUnique({
      where:{
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
}))

router.post("/fileupload",validate,uploads.single("file"),asyncWrapper(async (req, res) => {

    if (!req.file) {
      return res.status(400).json({ error: "'No file uploaded'" });
    }
    const { originalname, buffer } = req.file;
    await indexFile(originalname, buffer);
    res.status(200).json({
      success: true,
      message: `File "${originalname}" indexed successfully.`,
    });
  
}))

router.get("/:threadId",validate, asyncWrapper(async (req, res) => {
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

    if(chathistory.userId!==req.user.id){
      return res.status(403).json({ error: "Unauthorized" });
    }
    const messages = chathistory.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    res.json({ messages });
  
}))

router.get("/",validate,asyncWrapper(async(req,res)=>{
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
}))

router.delete("/:threadId", validate,asyncWrapper(async (req, res) => {
  const { threadId } = req.params;
    const chat = await prisma.chat.findUnique({ where: { threadId } });
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    if (chat.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });
    await prisma.chat.delete({ where: { threadId } });
    res.json({ message: "Chat deleted" });
}));

export default router