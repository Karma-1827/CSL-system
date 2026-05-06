import React, { useState, useEffect } from 'react';
import { Home, User, Bell, MessageSquare, ChevronDown, LogOut, CheckCircle, XCircle, Clock, BookOpen, UserCheck, Search, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoImg from './assets/csl-Logo.png';

const DAYS_MAP = { 'Mon': '一', 'Tue': '二', 'Wed': '三', 'Thu': '四', 'Fri': '五' };

function TuteeDashboard() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('tuteeActiveTab') || 'home');
  
  const [userInfo, setUserInfo] = useState({ account: '', chineseName: '', englishName: '', role: 'tutee', matched_tutor_id: null });
  const [requests, setRequests] = useState([]);
  const [matchedTutor, setMatchedTutor] = useState(null);

  useEffect(() => {
    const account = localStorage.getItem('loggedInAccount');
    if (account) {
      // 1. 撈取基本資料與綁定狀態
      fetch(`http://localhost:3001/api/profile/${account}`)
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setUserInfo({ ...result.data, account, matched_tutor_id: result.data.matched_tutor_id });
            
            // 2. 判斷：如果有老師了，去撈老師資料；如果還沒，去撈邀請列表
            if (result.data.matched_tutor_id) {
              fetchMatchedTutor(result.data.matched_tutor_id);
            } else {
              fetchRequests(account);
            }
          }
        });
    } else { navigate('/'); }
  }, [navigate]);

  useEffect(() => { sessionStorage.setItem('tuteeActiveTab', activeTab); }, [activeTab]);

  const fetchRequests = (account) => {
    fetch(`http://localhost:3001/api/match/requests/${account}`)
      .then(res => res.json())
      .then(result => { if (result.success) setRequests(result.data); });
  };

  const fetchMatchedTutor = (tutorId) => {
    fetch(`http://localhost:3001/api/match/tutor-info/${tutorId}`)
      .then(res => res.json())
      .then(result => { if (result.success) setMatchedTutor(result.data); });
  };

  const handleRespond = async (requestId, tutorUserId, action) => {
    const confirmMsg = action === 'accept' ? '確定要接受這位小老師嗎？(接受後其他邀請將自動取消)' : '確定要婉拒這個邀請嗎？';
    if(!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('http://localhost:3001/api/match/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, tuteeAccount: userInfo.account, tutorUserId, action })
      });
      const data = await res.json();
      alert(data.message);
      
      if (data.success) {
        window.location.reload(); // 暴力但有效的重整，讓畫面抓取最新狀態
      }
    } catch (err) { alert('連線錯誤'); }
  };

  const avatarInitial = userInfo.englishName ? userInfo.englishName.charAt(0).toUpperCase() : 'S';
  const handleLogout = () => { localStorage.removeItem('loggedInAccount'); navigate('/'); };

  // --- 介面 1：首頁 ---
  const renderHome = () => (
    <main className="flex-grow flex flex-col gap-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-primary px-6 py-3 border-b border-primary/20"><h2 className="text-sm font-bold text-white tracking-wider">本週課表 My Schedule</h2></div>
        <div className="p-10 text-center bg-primary/5">
          {matchedTutor ? (
            <>
              <h3 className="text-2xl font-bold text-primary-dark mb-3">Tutor: {matchedTutor.english_name}</h3>
              <p className="text-slate-600 font-medium">請至「我的老師」查看詳細可上課時間，並主動聯絡老師喔！</p>
            </>
          ) : (
            <p className="text-slate-500 font-medium">您還沒有配對老師，快去「我的老師」看看有沒有收到邀請吧！<br/>(Go to 'My Tutor' to check your invites!)</p>
          )}
        </div>
      </div>
    </main>
  );

  // --- 介面 2：我的老師 (邀請列表 or 已配對畫面) ---
  const renderMyTutor = () => {
    // 狀態 A：已經配對成功，顯示老師資料
    if (userInfo.matched_tutor_id && matchedTutor) {
      const times = typeof matchedTutor.available_times === 'string' ? JSON.parse(matchedTutor.available_times) : (matchedTutor.available_times || {days:[], slots:[]});
      return (
        <main className="flex-grow animate-fade-in">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-green-500 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block">🎉 配對成功 Matched!</span>
                <h2 className="text-2xl font-bold">Your Tutor: {matchedTutor.english_name}</h2>
              </div>
              <CheckCircle size={48} className="text-white/80" />
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-1">中文姓名 Chinese Name</h4>
                <p className="font-bold text-slate-800 text-lg mb-4">{matchedTutor.chinese_name || '未提供'}</p>
                <h4 className="text-sm font-bold text-slate-400 mb-1">身分別 / 系所 Status & Department</h4>
                <p className="font-medium text-slate-700 mb-4">{matchedTutor.student_status} - {matchedTutor.department}</p>
                <h4 className="text-sm font-bold text-slate-400 mb-1">Email 聯絡方式</h4>
                <p className="font-medium text-primary hover:underline cursor-pointer">{matchedTutor.email || '未提供 Email'}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-700 flex items-center mb-3"><Clock size={18} className="mr-2 text-primary"/> 老師可上課時間 Available Times</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {times.days && times.days.map(d => <span key={d} className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-md">{DAYS_MAP[d] || d}</span>)}
                  {times.slots && times.slots.map(s => <span key={s} className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-md">{s}</span>)}
                </div>
                <h4 className="font-bold text-slate-700 flex items-center mb-2 mt-6"><BookOpen size={18} className="mr-2 text-orange-500"/> 教學強項 Teaching Notes</h4>
                <p className="text-sm text-slate-600 leading-relaxed italic">{matchedTutor.teaching_notes || '老師尚未填寫備註'}</p>
              </div>
            </div>
          </div>
        </main>
      );
    }

    // 狀態 B：尚未配對，顯示收到的邀請列表
    return (
      <main className="flex-grow animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full min-h-[600px]">
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-100">
            <h2 className="font-bold text-lg text-slate-800 flex items-center">
              <Bell size={22} className="mr-2 text-primary" /> 收到的邀請 Tutor Invitations
            </h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 bg-slate-50/50 flex-grow content-start">
            {requests.length > 0 ? requests.map(req => {
              const times = typeof req.available_times === 'string' ? JSON.parse(req.available_times) : (req.available_times || {days:[], slots:[]});
              
              return (
                <div key={req.request_id} className="bg-white rounded-xl border border-blue-100 p-6 shadow-sm hover:shadow-md transition flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">New Invite</div>
                  
                  <div className="mb-4 pb-4 border-b border-slate-100 mt-2">
                    <h3 className="text-xl font-bold text-slate-800">{req.english_name}</h3>
                    <p className="text-sm text-slate-500 font-medium">{req.chinese_name || '無中文名'} | {req.student_status} - {req.department}</p>
                  </div>

                  <div className="space-y-4 flex-grow">
                    <div>
                      <span className="text-xs font-bold text-slate-400 flex items-center mb-1.5"><Clock size={14} className="mr-1"/> 老師可上課時間</span>
                      <div className="flex flex-wrap gap-2">
                        {times.days && times.days.map(d => <span key={d} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">{DAYS_MAP[d]}</span>)}
                        {times.slots && times.slots.map(s => <span key={s} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">{s}</span>)}
                      </div>
                    </div>
                    {req.teaching_notes && (
                      <div>
                        <span className="text-xs font-bold text-slate-400 flex items-center mb-1.5"><BookOpen size={14} className="mr-1"/> 教學強項與備註</span>
                        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic">"{req.teaching_notes}"</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                    <button onClick={() => handleRespond(req.request_id, req.tutor_user_id, 'reject')} className="flex-1 py-2 bg-slate-100 text-slate-500 font-bold rounded-lg hover:bg-red-50 hover:text-red-500 transition">婉拒 Reject</button>
                    <button onClick={() => handleRespond(req.request_id, req.tutor_user_id, 'accept')} className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition shadow-sm">✅ 同意 Accept</button>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-16 text-center text-slate-400 font-bold flex flex-col items-center">
                <UserCheck size={48} className="mb-4 text-slate-200" />
                目前還沒有收到老師的邀請喔！<br/>(No invites yet. Please wait for a tutor to contact you.)
              </div>
            )}
          </div>
        </div>
      </main>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center space-x-8">
          <img src={logoImg} alt="Logo" className="h-8 w-auto object-contain" />
          <nav className="hidden md:flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('home')} className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${activeTab === 'home' ? 'bg-white text-primary' : 'text-slate-500 hover:text-primary'}`}>首頁</button>
            <button onClick={() => setActiveTab('my-tutor')} className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${activeTab === 'my-tutor' ? 'bg-white text-primary' : 'text-slate-500 hover:text-primary'}`}>我的老師</button>
            <button className="px-5 py-1.5 text-slate-500 font-medium hover:text-primary transition text-sm">紀錄</button>
            <button className="px-5 py-1.5 text-slate-500 font-medium hover:text-primary transition text-sm">紙本</button>
          </nav>
        </div>
        <div className="flex items-center space-x-5">
          <div className="relative">
            <div className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
              <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">{avatarInitial}</div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                <button onClick={() => navigate('/profile')} className="w-full flex items-center px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary border-b border-slate-100"><User size={16} className="mr-3" /> 個人資訊</button>
                <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition"><LogOut size={16} className="mr-3" /> 登出</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-6 gap-8">
        <aside className="w-full md:w-64 flex flex-col gap-6 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center text-lg">快速連結 Quick Links</h3>
            <ul className="space-y-2 text-sm font-medium">
              <li onClick={() => setActiveTab('home')} className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === 'home' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-primary'}`}><Home size={20} className={`mr-4 ${activeTab === 'home' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} /> 首頁主控台</li>
              <li onClick={() => navigate('/profile')} className="flex items-center p-3 rounded-xl hover:bg-slate-50 hover:text-primary cursor-pointer transition group text-slate-600"><User size={20} className="mr-4 text-slate-400 group-hover:text-primary" /> 個人資訊</li>
              <li onClick={() => setActiveTab('my-tutor')} className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === 'my-tutor' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-primary'}`}><UserCheck size={20} className={`mr-4 ${activeTab === 'my-tutor' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} /> 我的老師</li>
              <li className="flex items-center p-3 rounded-xl hover:bg-slate-50 hover:text-primary cursor-pointer transition group text-slate-600"><Bell size={20} className="mr-4 text-slate-400 group-hover:text-primary" /> 通知 Notifications</li>
            </ul>
          </div>
        </aside>

        {/* 核心切換區塊 */}
        {activeTab === 'home' ? renderHome() : renderMyTutor()}
      </div>
    </div>
  );
}

export default TuteeDashboard;