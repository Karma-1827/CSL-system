import React, { useState } from 'react';// ✨ 新增 1：引入路由需要的工具
import { Routes, Route, useNavigate } from 'react-router-dom'; 
import Dashboard from './Dashboard'; // ✨ 新增 2：引入本系學生頁面
import TuteeProfileSetup from './TuteeProfileSetup'; // ✨ 新增這行：引入表單頁面
import TuteeDashboard from './TuteeDashboard'; // ✨ 新增這行：引入外籍生頁面
import TutorProfileSetup from './TutorProfileSetup';
import TutorDashboard from './TutorDashboard';
import UserProfile from './UserProfile';
// ✨ 新增引入 AdminDashboard
import AdminDashboard from './AdminDashboard';
import logoImg from './assets/csl-Logo.png';

function App() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  // ✨ 新增：預設註冊身份為本系學生 (tutor)
  const [regRole, setRegRole] = useState('tutor');

  // ✨ 新增 3：啟動導航器
  const navigate = useNavigate(); 

  // --- 登入功能 ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!account || !password) return alert("請輸入帳號和密碼！");

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password }),
      });
      const result = await response.json();

      if (result.success) {
        // 登入成功時，把帳號存進 localStorage
        localStorage.setItem('loggedInAccount', account); 
        // ✨ 新增這行：把後端給的 JWT 通行證也存進瀏覽器的保險箱裡！
        localStorage.setItem('authToken', result.data.token);
        
        alert(`🎉 ${result.message}\n歡迎回來！`);
        
        // ✨ 關鍵檢查點：這裡是「登入」的跳轉，外籍生應該直接去主畫面！
        if (result.data.role === 'tutor') {
          navigate('/tutor-dashboard'); 
        } else if (result.data.role === 'tutee') {
          navigate('/tutee-dashboard'); // 👈 請確認這裡是 /tutee-dashboard，不能是 /setup
        } else {
          // ✨ 確保其他身分 (admin 或 superadmin) 會來到管理員面板
          navigate('/admin-dashboard'); 
        }
        
      } else {
        alert(`❌ 登入失敗：${result.message}`);
      }
    } catch (error) {
      alert("無法連線到伺服器！");
    }
  };

  // --- 註冊功能 (維持不變) ---
  const handleRegister = async (e) => {
    e.preventDefault();
    // ✨ 修改 1：拿掉 regName 的檢查
    if (!account || !password || !regEmail || !regStudentId) {
      return alert("請填寫所有註冊資訊！");
    }
    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✨ 修改 2：送出時不傳 chineseName
        body: JSON.stringify({ account, password, email: regEmail, studentId: regStudentId, role: regRole }),
      });
      const result = await response.json();

      if (result.success) {
        localStorage.setItem('savedStudentId', regStudentId);

        alert(`🎉 ${result.message}\n歡迎回來！`);
        // ✨ 修改 3：註冊成功的跳轉魔法！
        if (result.data.role === 'tutee') {
          alert("註冊成功！請接著完成您的輔導需求資料。");
          navigate('/tutee-setup', { state: { studentId: regStudentId } }); // 外籍生直接跳轉填表單！
        } else if (result.data.role === 'tutor') {
          // ✨ 新增：如果是小老師，跳轉到 tutor-setup
          alert("註冊成功！請接著完成您的小老師檔案。");
          navigate('/tutor-setup'); 
        } else {
          alert("🎉 註冊成功！請使用新帳號登入。");
          setIsLoginMode(true);
          setPassword('');
        }
        setRegStudentId('');
      } else {
        alert(`❌ 註冊失敗：${result.message}`);
      }
    } catch (error) {
      alert("無法連線到伺服器！");
    }
  };

  // --- 將原本的登入畫面包裝成一個獨立區塊 ---
  const LoginScreen = (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center z-10">
        {/* ✨ 修改後的寫法：h-8 代表高度大約 32px，你可以改成 h-10 讓他變大，或 h-6 變小 */}
        <img src={logoImg} alt="Logo" className="h-12 w-auto object-contain" />
        <div className="flex items-center space-x-4">
          <select className="border-gray-300 rounded-md text-sm border p-1 outline-none"><option>繁體中文</option><option>English</option></select>
          <button onClick={() => setIsLoginMode(true)} className="text-gray-600 hover:text-gray-900 text-sm font-medium">登入</button>
          <button onClick={() => setIsLoginMode(false)} className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition">註冊</button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-6 md:p-12 bg-slate-50">
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 md:gap-10 items-stretch justify-center">
          <div className="w-full md:w-1/2 bg-primary p-10 shadow-lg rounded-xl flex flex-col justify-center items-center text-center text-white">
            <h1 className="text-3xl font-bold mb-3 tracking-wide">國立臺灣師範大學</h1>
            <h2 className="text-3xl font-bold mb-8 tracking-wider">華語文教學系</h2>
            <div className="w-16 h-1 bg-white/30 rounded-full mb-8"></div>
            <h3 className="text-xl font-medium text-slate-100">外籍生輔導系統</h3>
          </div>

          <div className="w-full md:w-1/2 bg-white p-8 sm:p-10 rounded-xl shadow-lg flex flex-col justify-center transition-all duration-300">
            <h2 className="text-2xl font-bold text-center text-black-500 mb-8">{isLoginMode ? '系統登入' : '建立新帳號'}</h2>
            <form className="space-y-4" onSubmit={isLoginMode ? handleLogin : handleRegister}>
              {!isLoginMode && (
                <>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">電子信箱</label><input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="example@school.edu.tw" required className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">學號</label><input type="text" value={regStudentId} onChange={(e) => setRegStudentId(e.target.value)} placeholder="例如：B10902000" required className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" /></div>
                  {/* ✨ 新增：身份選擇區塊 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">註冊身份</label>
                    <div className="flex space-x-6">
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <input 
                          type="radio" name="role" value="tutor" 
                          checked={regRole === 'tutor'} onChange={(e) => setRegRole(e.target.value)} 
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300" 
                        />
                        <span className="text-sm text-slate-700 group-hover:text-primary transition">本系學生</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <input 
                          type="radio" name="role" value="tutee" 
                          checked={regRole === 'tutee'} onChange={(e) => setRegRole(e.target.value)} 
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300" 
                        />
                        <span className="text-sm text-slate-700 group-hover:text-primary transition">外籍生</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">使用者名稱 (登入帳號)</label><input type="text" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="請輸入英數字帳號" required className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" /></div>
              {/* ✨ 修改後：加入忘記密碼按鈕 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">密碼</label>
                  {isLoginMode && (
                    <button 
                      type="button" 
                      onClick={() => alert('系統發信功能目前建置中 🚧 \n如果忘記密碼，請帶著您的學生證至「華語文教學系辦公室」請管理員協助重設。')}
                      className="text-xs text-primary font-medium hover:underline focus:outline-none"
                    >
                      忘記密碼？
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="輸入密碼" 
                    required 
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" 
                  />
                </div>
              </div>
              {isLoginMode && (
                <div><label className="block text-sm font-medium text-gray-700 mb-1">驗證碼</label><div className="flex space-x-4"><input type="text" placeholder="輸入驗證碼" className="w-1/2 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition" /><div className="w-1/2 bg-gray-50 flex items-center justify-center rounded-md border border-gray-200 border-dashed text-gray-500 font-mono tracking-widest text-lg select-none">A2C8</div></div></div>
              )}
              <button type="submit" className="w-full bg-primary text-white font-bold py-2.5 rounded-md mt-6 hover:bg-primary-dark transition duration-200 shadow-md hover:shadow-lg">{isLoginMode ? '登入' : '立即註冊'}</button>
            </form>
            <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
              {isLoginMode ? <p>還沒有帳號？ <button onClick={() => setIsLoginMode(false)} className="text-primary font-medium hover:underline">點我註冊</button></p> : <p>已經有帳號了？ <button onClick={() => setIsLoginMode(true)} className="text-primary font-medium hover:underline">返回登入</button></p>}
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-white border-t border-gray-200 py-4 px-6 flex justify-between items-center text-sm text-gray-500">
        <div>© 2026 華語系 保留所有權利。</div><div className="text-gray-500 font-medium hidden md:block">臺師大華語系</div>
      </footer>
    </div>
  );

  // ✨ 新增 5：定義網址對應的畫面
  // ✨ 修改：定義網址對應的畫面
  return (
    <Routes>
      <Route path="/" element={LoginScreen} /> 
      {/* 依照身分給予不同的網址與畫面 */}
      <Route path="/tutor-dashboard" element={<TutorDashboard />} />
      <Route path="/tutee-dashboard" element={<TuteeDashboard />} /> 
      <Route path="/tutee-setup" element={<TuteeProfileSetup />} />
      <Route path="/tutor-setup" element={<TutorProfileSetup />} />
      <Route path="/profile" element={<UserProfile />} />
      <Route path="/dashboard" element={<Dashboard />} /> {/* 保留原本的避免報錯 */}
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
    </Routes>
  );
}

export default App;