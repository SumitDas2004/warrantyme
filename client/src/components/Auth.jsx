import React from "react";
const Auth = () => {
  return (
    <div style={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <a href={`${import.meta.env.VITE_SERVER}/auth/google`} style={{fontSize: '3rem'}}>Login</a>
    </div>
  );
};
export default Auth;
