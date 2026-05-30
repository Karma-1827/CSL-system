import React, { useState } from "react"; // ✨ 新增 1：引入路由需要的工具
import { Routes, Route, useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard"; // ✨ 新增 2：引入本系學生頁面
import TuteeProfileSetup from "./TuteeProfileSetup"; // ✨ 新增這行：引入表單頁面
import TuteeDashboard from "./TuteeDashboard"; // ✨ 新增這行：引入外籍生頁面
import TutorProfileSetup from "./TutorProfileSetup";
import TutorDashboard from "./TutorDashboard";
import UserProfile from "./UserProfile";
// ✨ 新增引入 AdminDashboard
import AdminDashboard from "./AdminDashboard";
import logoImg from "./assets/csl-Logo.png";

function App() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regStudentId, setRegStudentId] = useState("");
  const [regParticipantType, setRegParticipantType] = useState("ntnu_tutor");
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotAccount, setForgotAccount] = useState("");
  const [forgotStudentId, setForgotStudentId] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");

  // ✨ 新增 3：啟動導航器
  const navigate = useNavigate();

  const registerTypes = [
    {
      id: "ntnu_tutor",
      role: "tutor",
      label: "老師 Teacher",
    },
    {
      id: "general_tutee",
      role: "tutee",
      label: "師大外籍生 NTNU International Student",
    },
    {
      id: "maryland_exchange",
      role: "tutee",
      label: "馬里蘭大學學生 University of Maryland Student",
    },
  ];

  // --- 登入功能 ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!account || !password) return alert("請輸入帳號和密碼！");

    try {
      const response = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password }),
      });
      const result = await response.json();

      if (result.success) {
        // 登入成功時，把帳號存進 localStorage
        localStorage.setItem("loggedInAccount", account);
        // ✨ 新增這行：把後端給的 JWT 通行證也存進瀏覽器的保險箱裡！
        localStorage.setItem("authToken", result.data.token);

        alert(`🎉 ${result.message}\n歡迎回來！`);

        // ✨ 關鍵檢查點：這裡是「登入」的跳轉，外籍生應該直接去主畫面！
        if (result.data.role === "tutor") {
          navigate("/tutor-dashboard");
        } else if (result.data.role === "tutee") {
          navigate("/tutee-dashboard"); // 👈 請確認這裡是 /tutee-dashboard，不能是 /setup
        } else {
          // ✨ 確保其他身分 (admin 或 superadmin) 會來到管理員面板
          navigate("/admin-dashboard");
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
      const selectedType =
        registerTypes.find((type) => type.id === regParticipantType) ||
        registerTypes[0];
      const response = await fetch("http://localhost:3001/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✨ 修改 2：送出時不傳 chineseName
        body: JSON.stringify({
          account,
          password,
          email: regEmail,
          studentId: regStudentId,
          role: selectedType.role,
          participantType: selectedType.id,
        }),
      });
      const result = await response.json();

      if (result.success) {
        localStorage.setItem("savedStudentId", regStudentId);

        //alert(`🎉 ${result.message}\n歡迎回來！`);
        // ✨ 修改 3：註冊成功的跳轉魔法！
        if (result.data.role === "tutee") {
          alert("註冊成功！請接著完成您的學生檔案。");
          navigate("/tutee-setup", {
            state: {
              studentId: regStudentId,
              participantType: result.data.participantType,
            },
          }); // 外籍生直接跳轉填表單！
        } else if (result.data.role === "tutor") {
          // ✨ 新增：如果是小老師，跳轉到 tutor-setup
          alert("註冊成功！請接著完成您的老師檔案。");
          navigate("/tutor-setup");
        } else {
          alert("🎉 註冊成功！請使用新帳號登入。");
          setIsLoginMode(true);
          setPassword("");
        }
        setRegStudentId("");
      } else {
        alert(`❌ 註冊失敗：${result.message}`);
      }
    } catch (error) {
      alert("無法連線到伺服器！");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (forgotNewPassword !== forgotConfirmPassword) {
      return alert("兩次輸入的密碼不一致！");
    }
    if (forgotNewPassword.length < 6) {
      return alert("密碼至少需要 6 個字元");
    }
    try {
      const response = await fetch("http://localhost:3001/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: forgotAccount,
          studentId: forgotStudentId,
          newPassword: forgotNewPassword,
        }),
      });
      const result = await response.json();
      if (result.success) {
        alert("✅ " + result.message);
        setIsForgotMode(false);
        setForgotAccount("");
        setForgotStudentId("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
      } else {
        alert("❌ " + result.message);
      }
    } catch (error) {
      alert("無法連線到伺服器！");
    }
  };

  const ForgotPasswordScreen = (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center z-10">
        <img src={logoImg} alt="Logo" className="h-16 w-auto object-contain" />
      </header>

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-lg border border-slate-100">
          <button
            onClick={() => setIsForgotMode(false)}
            className="text-sm text-primary hover:underline mb-6 flex items-center font-semibold"
          >
            ← 返回登入 Back to Sign In
          </button>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            重設密碼 Reset Password
          </h2>
          <p className="text-sm text-slate-500 text-center mb-8">
            請輸入您的帳號與學號以驗證身份 / Verify your account with your username and student ID.
          </p>

          <form className="space-y-4" onSubmit={handleResetPassword}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                使用者名稱 Username
              </label>
              <input
                type="text"
                value={forgotAccount}
                onChange={(e) => setForgotAccount(e.target.value)}
                placeholder="請輸入登入帳號 / Enter username"
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                學號 Student ID
              </label>
              <input
                type="text"
                value={forgotStudentId}
                onChange={(e) => setForgotStudentId(e.target.value)}
                placeholder="例如 Example: B10902000"
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新密碼 New Password
              </label>
              <input
                type="password"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                placeholder="請輸入新密碼（至少6碼）/ Enter new password"
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                確認新密碼 Confirm New Password
              </label>
              <input
                type="password"
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                placeholder="再輸入一次新密碼 / Confirm new password"
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-white font-bold py-2.5 rounded-md mt-4 hover:bg-primary-dark transition duration-200 shadow-md"
            >
              確認重設密碼 Reset Password
            </button>
          </form>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 px-6 flex justify-between items-center text-sm text-gray-500">
        <div>© 2026 華語系 Department of Chinese as a Second Language. All rights reserved.</div>
      </footer>
    </div>
  );

  // --- 將原本的登入畫面包裝成一個獨立區塊 ---
  const LoginScreen = (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center z-10">
        <img src={logoImg} alt="Logo" className="h-16 w-auto object-contain" />
      </header>

      <main className="flex-grow flex items-center justify-center px-6 py-10 md:py-14 bg-slate-50">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-stretch">
          <div className="bg-primary p-10 md:p-12 shadow-lg rounded-2xl flex flex-col justify-center text-white min-h-[480px]">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                NTNU CSL
              </p>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-wide">
                國立臺灣師範大學
                <br />
                華語文教學系
              </h1>
              <p className="text-base md:text-lg text-white/80 leading-relaxed">
                National Taiwan Normal University
                <br />
                Department of Chinese as a Second Language
              </p>
            </div>
            <div className="space-y-5 mt-14">
              <div className="w-16 h-1 bg-white/35 rounded-full"></div>
              <div>
                <h2 className="text-2xl font-bold mb-2">外籍生輔導系統</h2>
                <p className="text-white/80">
                  International Student Tutoring System
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-lg border border-slate-100 flex flex-col justify-center transition-all duration-300">
            <div className="mb-8">
              <p className="text-sm font-semibold text-primary mb-2">
                {isLoginMode ? "Sign In" : "Create Account"}
              </p>
              <h2 className="text-3xl font-bold text-slate-900">
                {isLoginMode ? "系統登入 Sign In" : "建立新帳號 Create Account"}
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                {isLoginMode
                  ? "Sign in to access your tutoring dashboard."
                  : "Register your account and complete your profile."}
              </p>
            </div>
            <form
              className="space-y-4"
              onSubmit={isLoginMode ? handleLogin : handleRegister}
            >
              {!isLoginMode && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      電子信箱 Email
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="example@school.edu.tw"
                      required
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      學號 Student ID
                    </label>
                    <input
                      type="text"
                      value={regStudentId}
                      onChange={(e) => setRegStudentId(e.target.value)}
                      placeholder="例如 Example: B10902000"
                      required
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      註冊身份 Registration Type
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {registerTypes.map((type) => (
                        <label
                          key={type.id}
                          className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition ${
                            regParticipantType === type.id
                              ? "border-primary bg-primary/5 text-primary shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-primary/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="participantType"
                            value={type.id}
                            checked={regParticipantType === type.id}
                            onChange={(e) => setRegParticipantType(e.target.value)}
                            className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                          />
                          <span className="text-sm font-semibold">{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  帳號 Username
                </label>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="請輸入英數字帳號 / Enter username"
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    密碼 Password
                  </label>
                  {isLoginMode && (
                    <button
                      type="button"
                      onClick={() => setIsForgotMode(true)}
                      className="text-xs text-primary font-semibold hover:underline focus:outline-none"
                    >
                      忘記密碼？ Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="輸入密碼 / Enter password"
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
              {isLoginMode && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    驗證碼 Verification Code
                  </label>
                  <div className="grid grid-cols-[1fr_140px] gap-3">
                    <input
                      type="text"
                      placeholder="輸入驗證碼 / Enter code"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                    <div className="bg-slate-50 flex items-center justify-center rounded-lg border border-slate-200 border-dashed text-slate-500 font-mono tracking-widest text-lg select-none">
                      A2C8
                    </div>
                  </div>
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-primary text-white font-bold py-3 rounded-lg mt-6 hover:bg-primary-dark transition duration-200 shadow-md hover:shadow-lg"
              >
                {isLoginMode ? "登入 Sign In" : "立即註冊 Register"}
              </button>
            </form>
            <div className="mt-8 text-center text-sm text-slate-500 space-y-2">
              {isLoginMode ? (
                <p>
                  還沒有帳號？ No account yet?{" "}
                  <button
                    onClick={() => setIsLoginMode(false)}
                    className="text-primary font-semibold hover:underline"
                  >
                    點我註冊 Register
                  </button>
                </p>
              ) : (
                <p>
                  已經有帳號了？ Already have an account?{" "}
                  <button
                    onClick={() => setIsLoginMode(true)}
                    className="text-primary font-semibold hover:underline"
                  >
                    返回登入 Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-white border-t border-gray-200 py-4 px-6 flex justify-between items-center text-sm text-gray-500">
        <div>© 2026 華語系 Department of Chinese as a Second Language. All rights reserved.</div>
        <div className="text-gray-500 font-medium hidden md:block">
          臺師大華語系 NTNU CSL
        </div>
      </footer>
    </div>
  );

  // ✨ 新增 5：定義網址對應的畫面
  // ✨ 修改：定義網址對應的畫面
  return (
    <Routes>
      <Route
        path="/"
        element={isForgotMode ? ForgotPasswordScreen : LoginScreen}
      />
      {/* 依照身分給予不同的網址與畫面 */}
      <Route path="/tutor-dashboard" element={<TutorDashboard />} />
      <Route path="/tutee-dashboard" element={<TuteeDashboard />} />
      <Route path="/tutee-setup" element={<TuteeProfileSetup />} />
      <Route path="/tutor-setup" element={<TutorProfileSetup />} />
      <Route path="/profile" element={<UserProfile />} />
      <Route path="/dashboard" element={<Dashboard />} />{" "}
      {/* 保留原本的避免報錯 */}
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
    </Routes>
  );
}

export default App;
