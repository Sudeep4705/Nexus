import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import chatRouter from './Routes/chat.routes.js'
import authRouter from './Routes/auth.routes.js'
import cookieParser from "cookie-parser";
const app = express()


// middlewares 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "https://nexus-gules-rho.vercel.app", credentials: true }));
app.use(cookieParser())

// routes
app.use("/chats",chatRouter);
app.use("/auth",authRouter)

app.listen(8333, () => {
  console.log("SERVER IS LISTENING ON THE PORT 8333");
});
