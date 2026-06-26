

import React from 'react'
import Hero from '../Components/Hero'
import { useParams } from 'react-router-dom'
import Sidebar from '../Components/Sidebar';

export default function ChatPage() {
    const {threadId} =  useParams();
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar/>
      <div className="flex-1 overflow-hidden">
        <Hero threadId={threadId} />   
      </div>
    </div>
  )
}
