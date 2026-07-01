import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthContext } from "../Context/AuthContext";

export default function Navbar(){
  const location = useLocation();
  const {User,setUser} = useContext(AuthContext)
       
        const handlelogout = async()=>{
            try{
                let res = await axios.get("https://nexus-foq8.onrender.com/auth/logout",{withCredentials:true})
                Navigate("/login")
                toast.success(res.data.message)
                setUser(null)
                
            }
            catch(error){
                console.log(error);
                
            }
        }
  return (
    <>
    {User && (
        <>
            <div className="w-40 flex justify-end ml-auto items-center gap-3 px-6 py-4 ">
                      <Link
        onClick={handlelogout}
        className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 "text-gray-300 bg-red-500 hover:text-white bg-neutral-900"
        }`}
      >
        Logout
      </Link>
            </div>
        </>
    )}
    {!User && (
            <div className="w-full flex justify-end items-center gap-3 px-6 py-4 ">
      {/* Navigation Links */}
      <Link
        to="/register"
        className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
          location.pathname === "/register"
            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-black shadow-lg shadow-green-500/30"
            : "text-gray-300 hover:text-white bg-neutral-900"
        }`}
      >
        Register
      </Link>
      <Link
        to="/login"
        className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
          location.pathname === "/login"
            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-black shadow-lg shadow-green-500/30"
            : "text-gray-300 hover:text-white bg-neutral-900"
        }`}
      >
        Login
      </Link>
    
    </div>
    )}

    </>
    
  );
}