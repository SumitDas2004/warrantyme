import React from 'react'
import TextEditor from './components/TextEditor'
import GoogleAuth from './components/Auth'
import { Route, Routes } from 'react-router'
import Auth from './components/Auth'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<TextEditor/>}/>
      {/* <TextEditor/> */}
      <Route path="/login" element={<Auth/>}/>
    </Routes>
  )
}

export default App