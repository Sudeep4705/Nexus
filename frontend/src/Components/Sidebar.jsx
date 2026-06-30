import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { Menu, X, Ellipsis,Trash2  } from "lucide-react"; // install lucide-react if not already
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from "react-toastify";
export default function Sidebar({refershKey,triggerRefresh}) {
  const [chats, setChats] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await axios.get("https://nexus-foq8.onrender.com/chats/", {
          withCredentials: true,
        });
        setChats(res.data.chats);
      } catch (error) {
        console.log("Failed to load chats", error);
      }
    };
    fetchChats();
  }, [refershKey]);

  const startNewChat = () => {
    const newId = uuidv4();
    navigate(`/chat/${newId}`);
    if(triggerRefresh) triggerRefresh();
    setIsOpen(false); // close sidebar on mobile
  };

  const goToChat = (threadId) => {
    navigate(`/chat/${threadId}`);
    setIsOpen(false); // close sidebar on mobile
  };

  const stripMarkdown = (text) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/## /g, '') // headings
    .replace(/# /g, '') // headings
    .replace(/```.*?```/gs, '') // code blocks
    .replace(/`(.*?)`/g, '$1') // inline code
    .trim();
};

const handlechatdelete = async(threadId)=>{
  try {
      const res = await axios.delete(`https://nexus-foq8.onrender.com/chats/${threadId}`, {
        withCredentials: true,
      });
      toast.success(res.data.message)
      if (triggerRefresh) triggerRefresh();
    } catch (error) {
      toast.error(error.response.data.message)
      console.error("Delete failed", error);
    }
}
  return (
    <>
      {/* Toggle button*/}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-neutral-800 text-white p-2 rounded-lg shadow-lg hover:bg-neutral-700 transition"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-64 bg-neutral-800 h-full overflow-y-auto p-4 flex-shrink-0
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <button
          onClick={startNewChat}
          className="w-full bg-neutral-200 text-black font-semibold py-2 rounded-lg mb-4 hover:bg-green-400 transition"
        >
          + New Chat
        </button>
        <h2 className="text-white text-lg font-semibold mb-4">Your Chats</h2>
        {chats.map((chat) => (
           <div
  key={chat.threadId}
  className="p-3 rounded-lg cursor-pointer mb-2 transition-colors bg-neutral-700 text-white hover:bg-neutral-600 flex items-center justify-between relative"
>
  <div className="truncate flex-1" onClick={() => goToChat(chat.threadId)}>
    {stripMarkdown(chat.messages[0]?.content)?.slice(0, 30) || "New chat"}
  </div>
  <button
    onClick={(e) => {
      e.stopPropagation();
      setMenuOpenFor(menuOpenFor === chat.threadId ? null : chat.threadId);
    }}
    className="p-1 rounded-full hover:bg-neutral-600"
  >
    <Ellipsis size={18} />
  </button>
  {menuOpenFor === chat.threadId && (
    <div className="absolute right-0 top-full mt-1 w-32 bg-neutral-800 rounded-lg shadow-lg z-10">
      <button
        onClick={() => {
          // handle delete
          handlechatdelete(chat.threadId)
          setMenuOpenFor(null);
        }}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-neutral-700 rounded-lg"
      >
        <Trash2 size={16} />
        Delete
      </button>
    </div>
  )}
</div>
        ))}
      </div>

      {/* Overlay – closes sidebar when clicked on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}