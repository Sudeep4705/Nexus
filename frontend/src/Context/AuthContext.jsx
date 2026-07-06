import React, { createContext, useEffect, useState } from "react";
import axios from "axios";
export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [User, setUser] = useState(null);
  const [Loading, setLoading] = useState(true);

  useEffect(() => {
    const cheklogin = async () => {
      try {
        let res = await axios.get("https://nexus-foq8.onrender.com/auth/verify", {
          withCredentials: true,
        });
        setUser(res.data.user)
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    cheklogin();
  }, []);
  
  return (
    <AuthContext.Provider value={{ User, setUser,Loading }}>
      {children}
    </AuthContext.Provider>
  );
};
