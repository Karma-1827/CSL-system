import React, { useState } from 'react';
// ✨ 引入 Lucide 的精緻線條圖示
import { Home, Users, FileEdit, Bell, MessageSquare, ChevronDown, User, Globe, LogOut } from 'lucide-react';
// ✨ 新增這行：引入導航器
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  // 控制右上角頭像下拉選單的開關狀態
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  // ✨ 新增這兩行：啟動導航器與登出功能
  const navigate = useNavigate();
  const handleLogout = () => {
    // 這裡未來可以加上「清除 localStorage」的動作
    navigate('/'); // 直接把使用者送回首頁
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* --- 頂部導覽列 --- */}
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center space-x-8">
          {/* Logo 區塊 (拿掉黑框，改用主題色字體) */}
          <div className="text-2xl font-black text-primary tracking-wider">LOGO</div>
          
          {/* 主選單 (改為柔和的背景切換) */}
          <nav className="hidden md:flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <a href="#" className="px-5 py-1.5 bg-white text-primary font-bold rounded-md shadow-sm text-sm">首頁</a>
            <a href="#" className="px-5 py-1.5 text-slate-500 font-medium hover:text-primary transition text-sm">輔導學生</a>
            <a href="#" className="px-5 py-1.5 text-slate-500 font-medium hover:text-primary transition text-sm">紀錄</a>
            <a href="#" className="px-5 py-1.5 text-slate-500 font-medium hover:text-primary transition text-sm">紙本</a>
          </nav>
        </div>

        {/* 右側使用者專區 */}
        <div className="flex items-center space-x-5">
          <button className="text-slate-400 hover:text-primary transition">
            <MessageSquare size={20} />
          </button>
          <button className="text-slate-400 hover:text-primary transition">
            <Bell size={20} />
          </button>
          
          {/* 👤 個人頭像與下拉選單區塊 */}
          <div className="relative">
            {/* 點擊按鈕：切換選單開關 */}
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <div className="w-9 h-9 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                SA
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>

            {/* 下拉選單面板 (根據 isProfileMenuOpen 決定是否顯示) */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                {/* 頂部名稱區塊 */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-800">Super Admin</span>
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Admin</span>
                </div>
                {/* 選單項目 */}
                <div className="py-2">
                  <a href="#" className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary">
                    <User size={16} className="mr-3" /> 個人資訊
                  </a>
                  <a href="#" className="flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary">
                    <Users size={16} className="mr-3" /> 學生
                  </a>
                </div>
                {/* 語言切換區塊 */}
                <div className="px-4 py-2 border-t border-slate-100">
                  <div className="flex items-center justify-between border border-slate-200 rounded-md px-3 py-1.5 cursor-pointer hover:border-primary">
                    <div className="flex items-center text-sm text-slate-600">
                      <Globe size={16} className="mr-2" /> English
                    </div>
                    <ChevronDown size={14} className="text-slate-400" />
                  </div>
                </div>
                {/* 登出按鈕 */}
                <div className="py-2 border-t border-slate-100">
                  <a href="#" className="flex items-center px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50">
                    <LogOut size={16} className="mr-3" /> 登出
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- 主要內容區 --- */}
      <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-6 gap-8">
        
        {/* 左側邊欄：快速連結 */}
        <aside className="w-full md:w-64 flex flex-col gap-6">
          {/* 移除原本突兀的「首頁」大黑框 */}
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center text-lg">
              快速連結
            </h3>
            <ul className="space-y-4 text-sm text-slate-600 font-medium">
              <li className="flex items-center p-2 rounded-lg hover:bg-primary/5 hover:text-primary cursor-pointer transition group">
                <User size={20} className="mr-4 text-slate-400 group-hover:text-primary" /> 個人資訊
              </li>
              <li className="flex items-center p-2 rounded-lg hover:bg-primary/5 hover:text-primary cursor-pointer transition group">
                <Users size={20} className="mr-4 text-slate-400 group-hover:text-primary" /> 本期輔導學生
              </li>
              <li className="flex items-center p-2 rounded-lg hover:bg-primary/5 hover:text-primary cursor-pointer transition group">
                <FileEdit size={20} className="mr-4 text-slate-400 group-hover:text-primary" /> 審查結果
              </li>
              <li className="flex items-center p-2 rounded-lg hover:bg-primary/5 hover:text-primary cursor-pointer transition group">
                <Bell size={20} className="mr-4 text-slate-400 group-hover:text-primary" /> 通知
              </li>
            </ul>
          </div>
        </aside>

        {/* 中間：課表資訊 (移除黑框，上色，並對齊左側) */}
        <main className="flex-grow flex flex-col gap-6">
          
          {/* 本週課表：使用主題色作為強調 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-primary px-6 py-3 border-b border-primary/20">
              <h2 className="text-sm font-bold text-white tracking-wider">本週課表</h2>
            </div>
            <div className="p-10 text-center bg-primary/5">
              <h3 className="text-2xl font-bold text-primary-dark mb-3">學生：王小明</h3>
              <p className="text-slate-600 font-medium flex items-center justify-center">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                上課時間：14:00~16:00
              </p>
            </div>
          </div>

          {/* 未來課表：使用較淺的顏色區隔 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-2">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-600 tracking-wider">未來課表</h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="p-5 rounded-xl border border-slate-100 bg-white hover:border-primary/30 hover:shadow-md transition cursor-pointer flex justify-between items-center group">
                <p className="font-bold text-slate-700 group-hover:text-primary transition">未來課程 1 - 基礎發音</p>
                <span className="text-sm text-slate-400">下週三 10:00</span>
              </div>
              <div className="p-5 rounded-xl border border-slate-100 bg-white hover:border-primary/30 hover:shadow-md transition cursor-pointer flex justify-between items-center group">
                <p className="font-bold text-slate-700 group-hover:text-primary transition">未來課程 2 - 日常對話</p>
                <span className="text-sm text-slate-400">下週五 14:00</span>
              </div>
            </div>
          </div>
        </main>

        {/* 右側：上課紀錄 (對齊左側，美化按鈕) */}
        <aside className="w-full md:w-64">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-full min-h-[400px] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
            {/* 加一點背景裝飾，讓右邊這塊不無聊 */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-0"></div>
            
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2 z-10">
              <FileEdit size={32} />
            </div>
            
            <h3 className="font-bold text-xl text-slate-800 z-10">上課紀錄</h3>
            <p className="text-sm text-slate-500 text-center mb-2 z-10">
              課程結束後，請記得填寫學生的上課狀況與進度。
            </p>
            
            <button className="w-full py-3 bg-primary text-white hover:bg-primary-dark rounded-xl font-bold shadow-md hover:shadow-lg transition-all z-10">
              填寫表單
            </button>
          </div>
        </aside>
      </div>

      {/* ✨ 這是加回來的 Footer，使用了 mt-auto 確保它會被推到畫面最下方 */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 flex justify-between items-center text-sm text-slate-500 mt-auto">
        <div>© 2026 華語系 保留所有權利。</div>
        <div className="text-slate-500 font-medium hidden md:block">臺師大華語系</div>
      </footer>
    </div>
  );
}

export default Dashboard;