

import React from 'react'
import Hero from '../Components/Hero'
import { useParams } from 'react-router-dom'
import Sidebar from '../Components/Sidebar';
import { useState } from 'react';

export default function ChatPage() {
    const {threadId} =  useParams();
    const [refershkey,setrefreshkey] =  useState(0)

    const triggerRefresh = ()=>setrefreshkey(prev=>prev+1)
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar refershKey={refershkey} triggerRefresh={triggerRefresh} currentThreadId={threadId}/>
      <div className="flex-1 overflow-hidden">
        <Hero threadId={threadId} triggerRefresh={triggerRefresh} />   
      </div>
    </div>
  )
}
