import { useRef, useState } from "react";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import { Paperclip } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { toast } from "react-toastify";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export default function Hero({threadId,triggerRefresh}){
  const fileinputRef = useRef(null)
  const [input, setinput] = useState("");
  const [message, setMessage] = useState([]);
  const [isloading,setisloading] = useState(false)
  const messagesEndRef = useRef(null)
  const navigate = useNavigate();

    // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    // Grab the HTML element from the sticky note and scroll to it smoothly
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]); // <--- The watchdog only barks when 'message' changes
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
        const res = await axios.get(`https://nexus-foq8.onrender.com/chats/${threadId}`,{withCredentials:true})
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
    setMessage((prev) => [...prev, { role: "assistant", content: "" }]);
    setisloading(true)
    setinput("")
    try {
    let res = await fetch("https://nexus-foq8.onrender.com/chats/add", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include", // This is the fetch version of withCredentials: true
  body: JSON.stringify({ content: input, threadId }),
});
      
         // 1. Get the reader and the decoder
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = ""; // This holds the growing sentence

      // 2. Loop to catch the words as they arrive
           // 2. Loop to catch the words as they arrive
      while (true) {
        const { done, value } = await reader.read();
        if (done) break; // Stop when the backend closes the pipe

        // 3. Translate bytes to text and clean it
        const chunk = decoder.decode(value, { stream: true });
        const cleanText = chunk.replace(/^data: /gm, "").replace(/\n\n/g, "");

        
        
        // 4. NEW: Split the chunk into individual characters
        const characters = cleanText.split('');
        
        // 5. NEW: Add them to the screen one by one for a smooth typewriter effect
        for (const char of characters) {
          aiText += char;

          // Update the UI for every single character
          setMessage((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = aiText;
            return newMessages;
          });

          // Tiny delay per character (15ms is fast but perfectly smooth)
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      if(triggerRefresh) triggerRefresh()
      setinput("");
    } catch (error){
       // Safely get the error message whether it's from fetch or something else
        const errorMsg = error.message || "An error occurred while generating the response.";
        toast.error(errorMsg);
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
    formdata.append("threadId",threadId)
    try{
   setisloading(true)
    let res = await axios.post("https://nexus-foq8.onrender.com/chats/fileupload",formdata,{withCredentials:true})
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
               <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {msg.content}
  </ReactMarkdown>
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
