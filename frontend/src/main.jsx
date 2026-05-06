import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// ✨ 新增：引入 BrowserRouter
import { BrowserRouter } from 'react-router-dom' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* ✨ 新增：用 BrowserRouter 包住整個 App */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)