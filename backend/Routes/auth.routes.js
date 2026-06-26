import express from "express";
const router = express.Router();
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { userSchema } from "../Validators/auth.validator.js";
import {validate} from "../middlewares/verifyLogin.js"
const prisma = new PrismaClient();

router.post("/signup", async (req, res) => {
  console.log("signup hittttt");
  
  const { error, value } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  try {
    const { email, password, name } = value;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const hashed = await bcrypt.hash(password, 10);

    const data = await prisma.user.create({
      data: {
        email: email,
        password: hashed,
        name: name,
      },
    });
    const token = jwt.sign({ id: data.id }, process.env.SECRET, {
      expiresIn: "1d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV == "production",
      sameSite: process.env.NODE_ENV == "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });
      const safeuser = {
      email:data.email,
      name:data.name
    }
    res.status(201).json({ message: "Registerd successfully",user:safeuser });
  } catch (error) {
    console.log(error);
  }
});

router.post("/login", async (req, res) => {
  const { error, value } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  try {
    const { email, password } = value;
    const emailcheck = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (!emailcheck) {
      return res.status(400).json({ message: "email is not found" });
    }
    const hashed = await bcrypt.compare(password, emailcheck.password);
    if (!hashed) {
      return res.status(401).json({ message: "Password is wrong" });
    }
    const token = jwt.sign({ id: emailcheck.id }, process.env.SECRET, {
      expiresIn: "1d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV == "production",
      sameSite: process.env.NODE_ENV == "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });
    const safeuser = {
      email:emailcheck.email,
      name:emailcheck.name
    }

    res.status(200).json({ message: "Login Successfully",user:safeuser });
  } catch (error) {
    res.status(400).json({ message: "internal Error" });
  }
});


router.get("/logout",async(req,res)=>{
    const token = req.cookies.token
  if (!token)
    return res.status(400).json({ message: "No token" })
  
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  })
   res.status(200).json({ message: "Logged out successfully" });
})

router.get("/verify",validate,async(req,res)=>{
    res.json({user:req.user})
})


export default router;

