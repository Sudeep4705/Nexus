import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import UserLayout from "./Layouts/UserLayout"
import Hero from "./Components/Hero"
import Register from "./Components/Register"
 import { ToastContainer, toast } from 'react-toastify';
import Login from "./Components/Login";
import Sidebar from "./Components/Sidebar";
import ChatPage from "./Pages/ChatPage";


function App() {


  return (
    <>
     <BrowserRouter>
     <ToastContainer position="top-center"/>
     <Routes>
      <Route path="/" element={<UserLayout/>}>
      <Route index element={<Navigate to="/chat/new" replace/>}/>
      <Route path="chat/:threadId" element={<ChatPage/>}/>
      <Route path="register" element={<Register/>}/>
      <Route path="login" element={<Login/>}/>
      </Route>
     </Routes>
     </BrowserRouter>
    </>
  )
}

export default App
