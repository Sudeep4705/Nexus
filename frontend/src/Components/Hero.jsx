import React, { useRef, useState } from "react";
import { SquarePlus, SquareArrowUp } from "lucide-react";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import { Paperclip } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { toast } from "react-toastify";
export default function Hero({threadId}){
  
  const fileinputRef = useRef(null)
  const [input, setinput] = useState("");
  const [message, setMessage] = useState([]);
  const [isloading,setisloading] = useState(false)
  const navigate = useNavigate();

  // handle new chat or initial chat
  useEffect(() => {
  if (threadId === "new"){
    const newId = uuidv4();
    navigate(`/chat/${newId}`, { replace: true });
  }
}, [threadId, navigate]);

// fetch the message when thread changes 
useEffect(()=>{
  if(threadId && threadId !== "new"){
    const fetchMessages =async()=>{
      try{
        const res = await axios.get(`http://localhost:8333/chats/${threadId}`,{withCredentials:true})
        setMessage(res.data.messages)
      }catch(error){
    console.error("Failed to fetch messages:", error);
    }
    }
    fetchMessages()
  }
},[threadId])


  const handlechange = (e) => {
    setinput(e.target.value);
  };


  const handlesubmit = async () => {
    if (input.trim() == "") return;
    setMessage((prev) => [...prev, { role: "user", content: input }]);
    setisloading(true)
    setinput("")
    try {
      console.log("im entering");
      let res = await axios.post(
        "http://localhost:8333/chats/add",
        { content: input,threadId },
        { withCredentials: true },
      );
      
      setMessage((prev) => [
        ...prev,
        { role: "assistant", content:res.data.message },
      ]);
      setinput("");
    } catch (error){
        toast.error(error.response.data.message)
    }finally{
      setisloading(false)
    }
  };

  const handlekeyPress = (e) => {
    if (e.key == "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlesubmit();
    }
  };

  const fileupload = async(e)=>{
    const file = e.target.files[0]
    if(!file)return

    const formdata = new FormData();
    formdata.append("file",file)
    try{
   setisloading(true)
    let res = await axios.post("http://localhost:8333/chats/fileupload",formdata,{headers:{
      'Content-Type':'multipart/form-data'
    },withCredentials:true})
  
    console.log('Upload success:', res.data);
    }
    catch(error){
        toast.error(error.response.data.message)
    }finally{
      setisloading(false)
    }
  }
  const handleFileIconClick = ()=>{
    fileinputRef.current.click()
  }

  return (
    <>
       
      <div className="flex flex-col h-full max-w-3xl mx-auto">
         <Navbar/>
        {/* greeting to the user */}
      {message.length === 0 &&(
             <div className="px-5 pt-65 w-full">
          <h1 className="text-center text-black text-2xl">
            Hello there,how can i help you?
          </h1>
          <h1 className="text-center text-gray-400 text-3xl">
            Let's make your search easier
          </h1>
          <p className="text-center">Your personal Ai assistant</p>
        </div>
        )}
        {/* user and assistant chat area */}
          <div className="flex-1 mt-6 overflow-y-auto px-4 space-y-4">
            {" "}
            {/* Adds spacing between messages */}
            {message.map((msg, index) => (
              <div
                key={index}
                className={`rounded-xl p-3  max-w-fit ${msg.role === "user" ? "bg-neutral-200 ml-auto" : "bg-neutral-300 mr-auto"} `}
              >
                <h1>{msg.content}</h1>
              </div>
            ))}
             {isloading && (
          <>
          <h1 className="mt-5">Thinking....</h1>
          </>
        )}
          </div>
   
        {/* text area section */}
      <div className="flex-shrink-0 p-4">
  <div className="p-2 w-full border border-gray-300 rounded-[20px] max-w-3xl bg-white focus-within:border-gray-400 transition-colors duration-150 flex flex-col gap-1.5 px-4 pt-2 pb-2.5">
    <input
      type="file"
      ref={fileinputRef}
      onChange={fileupload}
      accept=".pdf,.xlsx,.xls"
      className="hidden"
    />
    <textarea
      className="w-full resize-none outline-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 leading-relaxed py-2"
      onKeyDown={handlekeyPress}
      rows={2}
      name="msg"
      value={input}
      onChange={handlechange}
      placeholder="Ask anything…"
    />
    <div className="flex items-center justify-start">
      <Paperclip
        size={28}
        onClick={handleFileIconClick}
        className="rotate-45 text-gray-900 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 cursor-pointer transition-all duration-150"
      />
    </div>
    <div className="flex items-center justify-end">
      <button
        className="bg-black  text-white w-8 h-8 p-5 rounded-full flex items-center justify-center hover:bg-gray-800 active:scale-90 transition-all duration-150 cursor-pointer"
        onClick={handlesubmit}
      >
        Ask
      </button>
    </div>
  </div>
</div>
      </div>
    </>
  );
}
