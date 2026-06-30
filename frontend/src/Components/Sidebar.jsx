import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { Menu, X, Trash2 } from "lucide-react";

export default function Sidebar({ refreshKey, triggerRefresh }) {
  const [chats, setChats] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredChatId, setHoveredChatId] = useState(null); // track which chat is hovered
  const [confirmDelete, setConfirmDelete] = useState(null); // store threadId to delete
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
  }, [refreshKey]);

  const startNewChat = () => {
    const newId = uuidv4();
    navigate(`/chat/${newId}`);
    if (triggerRefresh) triggerRefresh();
    setIsOpen(false);
  };

  const goToChat = (threadId) => {
    navigate(`/chat/${threadId}`);
    setIsOpen(false);
  };

  const handleDelete = async (threadId) => {
    try {
      await axios.delete(`https://nexus-foq8.onrender.com/chats/${threadId}`, {
        withCredentials: true,
      });
      // Refresh the list
      if (triggerRefresh) triggerRefresh();
      // If the deleted chat is the current one, navigate to new chat
      // (you can add logic to check current threadId)
      setConfirmDelete(null);
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const stripMarkdown = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/## /g, "")
      .replace(/# /g, "")
      .replace(/```.*?```/gs, "")
      .replace(/`(.*?)`/g, "$1")
      .trim();
  };

  return (
    <>
      {/* Toggle button for mobile */}
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
            className="group relative p-3 rounded-lg cursor-pointer mb-2 transition-colors bg-neutral-700 text-white hover:bg-neutral-600 flex items-center justify-between"
            onMouseEnter={() => setHoveredChatId(chat.threadId)}
            onMouseLeave={() => setHoveredChatId(null)}
          >
            <div className="flex-1 truncate" onClick={() => goToChat(chat.threadId)}>
              {stripMarkdown(chat.messages[0]?.content)?.slice(0, 30) || "New chat"}
            </div>
            {/* Trash icon – appears on hover */}
            {hoveredChatId === chat.threadId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(chat.threadId);
                }}
                className="ml-2 p-1 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition"
                aria-label="Delete chat"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-neutral-800 p-6 rounded-xl max-w-sm w-full mx-4">
            <h3 className="text-white text-lg font-semibold mb-2">Delete Chat?</h3>
            <p className="text-gray-400 text-sm mb-4">
              This conversation will be permanently removed. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg bg-neutral-700 text-white hover:bg-neutral-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}