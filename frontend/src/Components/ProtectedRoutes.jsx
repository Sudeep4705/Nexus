
import React from 'react'
import { useContext } from 'react'
import { AuthContext } from '../Context/AuthContext'
import { Navigate } from "react-router-dom";

export default function ProtectedRoutes({children}) {
  const {User,Loading} = useContext(AuthContext)
  if(Loading){
    return <p className="text-gray-200">Loading...</p>
  }
  if(!User){
    return <Navigate to="/login"/>
  }
  else{
    return children
  }
}
