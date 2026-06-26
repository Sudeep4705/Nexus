# 🧠 Nexus - AI RAG Chatbot

A full-stack RAG (Retrieval-Augmented Generation) chatbot that enables users to query any documents (PDFs/Excel) using AI-powered semantic search. It combines a modern chat interface with document ingestion, vector search, and real-time web search capabilities.

🔗 **Live Demo:** [https://nexus-gules-rho.vercel.app](https://nexus-gules-rho.vercel.app)

## ✨ Features

- 🤖 **RAG Chatbot** – Ask questions about your uploaded documents (PDFs, Excel).
- 📄 **Document Ingestion** – Upload PDF/Excel files, which are automatically chunked and indexed in a vector database.
- 🔍 **Semantic Search** – Uses Qdrant vector DB and Voyage AI embeddings for accurate context retrieval.
- 🌐 **Web Search Fallback** – Integrated with Tavily to search the web when the answer is not in the knowledge base.
- 🧵 **Conversation Memory** – Chat history is persisted using PostgreSQL with Prisma ORM.
- 🔐 **Authentication** – Full JWT authentication with secure HTTP-only cookies.
- 💬 **Multi-Chat Support** – Create and manage multiple chat threads from the sidebar.
- 📱 **Responsive Design** – Modern UI built with React.js and Tailwind CSS.

## 🛠️ Tech Stack

**Frontend**
- React.js (Vite)
- Tailwind CSS
- React Router DOM
- Axios
- React Hook Form

**Backend**
- Node.js & Express.js
- PostgreSQL (Supabase)
- Prisma ORM
- Qdrant (Vector Database)
- Groq (LLM API)
- Voyage AI (Embeddings)
- Tavily (Web Search API)

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- npm or yarn
- PostgreSQL database (local or Supabase)
- Qdrant instance (local or cloud)
- API keys for: Groq, Voyage AI, Tavily

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
