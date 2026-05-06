import React, { useState, useEffect } from 'react';
// ✨ 補上 Edit, CheckSquare (簽到), Flag (回報) 等圖示
import { Home, UserCheck, FileText, Bell, MessageSquare, ChevronDown, User, Globe, LogOut, FileEdit, FileCheck, CheckCircle, Clock, AlertCircle, ChevronRight, Award, ListTodo, HelpCircle, Search, Filter, Send, Calendar, Plus, X, Edit, CheckSquare, Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoImg from './assets/csl-Logo.png';

const DAYS_MAP = { 'Mon': '一', 'Tue': '二', 'Wed': '三', 'Thu': '四', 'Fri': '五' };
const SKILL_MAP = { listening: '聽力', speaking: '口說', reading: '閱讀', writing: '寫作' };

function TutorDashboard() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('tutorActiveTab') || 'home');
  const [userInfo, setUserInfo] = useState({ account: '', chineseName: '', englishName: '', role: 'tutor', certificationStatus: 'pending', certificationFile: '', id: null, matched_tutee_id: null });
  
  const [tuteesList, setTuteesList] = useState([]);
  const [filterLevel, setFilterLevel] = useState('All'); 
  const [matchedTutee, setMatchedTutee] = useState(null);

  const [classes, setClasses] = useState([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [slots, setSlots] = useState([{ date: '', startTime: '14:00', endTime: '15:00' }]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [endDate, setEndDate] = useState('');

  // ✨ 單筆編輯課程狀態
  const [editClassModal, setEditClassModal] = useState({ isOpen: false, classId: null, date: '', startTime: '', endTime: '' });

  useEffect(() => {
    const account = localStorage.getItem('loggedInAccount');
    if (account) {
      fetch(`http://localhost:3001/api/profile/${account}`)
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setUserInfo({ ...result.data, account, matched_tutee_id: result.data.matched_tutee_id });
            if (result.data.matched_tutee_id) fetchMatchedTutee(result.data.matched_tutee_id);
            if (result.data.user_id) fetchClasses(result.data.user_id);
          }
        });
      fetchTutees();
    } else { navigate('/'); }
  }, [navigate]);

  const fetchTutees = () => fetch('http://localhost:3001/api/match/tutees').then(res => res.json()).then(result => { if (result.success) setTuteesList(result.data); });
  const fetchMatchedTutee = (tuteeId) => fetch(`http://localhost:3001/api/match/tutee-info/${tuteeId}`).then(res => res.json()).then(result => { if (result.success) setMatchedTutee(result.data); });
  const fetchClasses = (userId) => fetch(`http://localhost:3001/api/classes/${userId}`).then(res => res.json()).then(result => { if (result.success) setClasses(result.data); });

  useEffect(() => { sessionStorage.setItem('tutorActiveTab', activeTab); }, [activeTab]);

  const avatarInitial = userInfo.englishName ? userInfo.englishName.charAt(0).toUpperCase() : 'T';
  const displayName = userInfo.chineseName ? `${userInfo.chineseName} ${userInfo.englishName}` : userInfo.englishName || 'Tutor Name';
  const handleLogout = () => { localStorage.removeItem('loggedInAccount'); navigate('/'); };

  const handleSendRequest = async (tuteeUserId, tuteeName) => {
    if(!window.confirm(`確定要向 ${tuteeName} 發送輔導邀請嗎？`)) return;
    try {
      const res = await fetch('http://localhost:3001/api/match/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tutorAccount: userInfo.account, tuteeUserId }) });
      const data = await res.json();
      alert(data.message);
      if(data.success) fetchTutees(); 
    } catch (err) { alert('連線錯誤'); }
  };

  const handleAddSlot = () => setSlots([...slots, { date: '', startTime: '14:00', endTime: '15:00' }]);
  const handleRemoveSlot = (index) => setSlots(slots.filter((_, i) => i !== index));
  const handleSlotChange = (index, field, value) => {
    const newSlots = [...slots];
    newSlots[index][field] = value;
    setSlots(newSlots);
  };

  const getWeekdayString = (dateString) => {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return weekdays[new Date(y, m - 1, d).getDay()];
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    for (const slot of slots) if (!slot.date || !slot.startTime || !slot.endTime) return alert("請填寫所有時段的日期與時間！");
    if (isRecurring && !endDate) return alert("請選擇重複結束的日期！");
    
    let totalHours = 0;
    slots.forEach(slot => {
       const start = new Date(`1970-01-01T${slot.startTime}`);
       const end = new Date(`1970-01-01T${slot.endTime}`);
       const diff = (end - start) / (1000 * 60 * 60);
       if(diff > 0) totalHours += diff;
    });

    if (totalHours > 2) return alert(`⚠️ 每週輔導時間不可超過 2 小時！\n(您目前安排了 ${totalHours} 小時)`);
    if (totalHours <= 0) return alert("時間設定有誤，結束時間必須晚於開始時間！");

    try {
      const res = await fetch('http://localhost:3001/api/classes/schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorAccount: userInfo.account, tuteeUserId: userInfo.matched_tutee_id, slots, isRecurring, endDate })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setIsScheduleModalOpen(false);
        setSlots([{ date: '', startTime: '14:00', endTime: '15:00' }]); setIsRecurring(false); setEndDate('');
        fetchClasses(userInfo.user_id); 
      }
    } catch (error) { alert('連線錯誤'); }
  };

  // ✨ 編輯單堂課送出
  const handleEditClassSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:3001/api/classes/${editClassModal.classId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classDate: editClassModal.date, startTime: editClassModal.startTime, endTime: editClassModal.endTime })
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setEditClassModal({ isOpen: false, classId: null, date: '', startTime: '', endTime: '' });
        fetchClasses(userInfo.user_id); 
      }
    } catch (error) { alert('連線錯誤'); }
  };


// --- ✨ 修改：介面 1：首頁 (三層動態分類課表 + 老師簽到等按鈕) ---
  const renderHome = () => {
    // 1. 取得現在時間
    const now = new Date();
    const pastClasses = [];
    const upcomingAndFuture = [];

    // 2. 將所有課程分類
    classes.forEach(cls => {
       const dateStr = cls.class_date.split('T')[0];
       // 組合出這堂課的「結束時間」來當作判定標準
       const classEndTime = new Date(`${dateStr}T${cls.end_time}`);
       if (classEndTime < now) {
           pastClasses.push(cls);
       } else {
           upcomingAndFuture.push(cls);
       }
    });

    // 過去的課，我們希望最新的在最上面
    pastClasses.sort((a, b) => new Date(b.class_date) - new Date(a.class_date));
    // 未來的課，我們希望最近的在最上面
    upcomingAndFuture.sort((a, b) => new Date(a.class_date) - new Date(b.class_date));
    
    // 即將到來：未來陣列的第 1 筆；未來課程：剩下的
    const upcomingClass = upcomingAndFuture.length > 0 ? upcomingAndFuture[0] : null;
    const futureClasses = upcomingAndFuture.length > 1 ? upcomingAndFuture.slice(1) : [];

    // ✨ 專門用來渲染課表卡片的共用元件
    const renderClassCard = (cls, type = 'normal') => {
      const dateStr = cls.class_date.split('T')[0];
      const isPast = type === 'past';
      
      // ✨ 判斷是否為「即將上課」，用來顯示特殊標籤
      const isUpcoming = type === 'upcoming';
      
      return (
        <div key={cls.id} className={`p-5 rounded-xl border flex flex-col gap-4 transition group ${isPast ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-slate-100 shadow-sm hover:border-primary/30 hover:shadow-md'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center mr-4 flex-shrink-0 ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 border border-blue-100 text-blue-600'}`}>
                <span className="text-[10px] font-bold uppercase">{new Date(dateStr).toLocaleDateString('en-US', { month: 'short' })}</span>
                <span className="text-lg font-black leading-none">{new Date(dateStr).getDate()}</span>
              </div>
              <div>
                {/* ✨ 修改：標題改為學生姓名 */}
                <p className={`font-bold ${isPast ? 'text-slate-600' : 'text-slate-800'} text-lg`}>
                  {matchedTutee ? (matchedTutee.chinese_name || matchedTutee.english_name) : '學生未載入'}
                </p>
                <p className="text-sm font-medium text-slate-500 flex items-center mt-1">
                  <Clock size={14} className="mr-1.5"/> {cls.start_time.substring(0,5)} ~ {cls.end_time.substring(0,5)}
                </p>
              </div>
            </div>
            {/* ✨ 即將上課的標籤 */}
            {isUpcoming && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full shadow-sm animate-pulse flex-shrink-0 ml-2">即將上課</span>
            )}
          </div>

          {/* ✨ 橫列的四個操作按鈕 */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
            {!isPast ? (
              <button onClick={() => setEditClassModal({ isOpen: true, classId: cls.id, date: dateStr, startTime: cls.start_time.substring(0,5), endTime: cls.end_time.substring(0,5) })} className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition">
                <Edit size={16} className="mb-1" /> <span className="text-xs font-bold">編輯時間</span>
              </button>
            ) : (
              <button disabled className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-300 cursor-not-allowed">
                <Edit size={16} className="mb-1" /> <span className="text-xs font-bold">不可編輯</span>
              </button>
            )}
            <button onClick={() => alert('紀錄功能待開發中！')} className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-500 hover:bg-green-50 hover:text-green-600 transition">
              <FileText size={16} className="mb-1" /> <span className="text-xs font-bold">課堂紀錄</span>
            </button>
            {/* ✨ 修改：按鈕文字改為「老師簽到」 */}
            <button onClick={() => alert('老師簽到功能待開發中！')} className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition">
              <CheckSquare size={16} className="mb-1" /> <span className="text-xs font-bold">老師簽到</span>
            </button>
            <button onClick={() => alert('回報功能待開發中！')} className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition">
              <Flag size={16} className="mb-1" /> <span className="text-xs font-bold">異常回報</span>
            </button>
          </div>
        </div>
      );
    };

    return (
      <>
        <main className="flex-grow flex flex-col gap-6 animate-fade-in max-w-3xl">
          
          {/* 1. 即將上課 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-600 px-6 py-3 border-b border-slate-700/20"><h2 className="text-sm font-bold text-white tracking-wider">即將上課 Upcoming Class</h2></div>
            <div className="p-6 bg-slate-50/50">
              {upcomingClass && matchedTutee ? (
                <>
                   {renderClassCard(upcomingClass, 'upcoming')}
                </>
              ) : (
                <div className="text-center py-8 text-slate-500 font-medium">目前尚無即將到來的課程。</div>
              )}
            </div>
          </div>

          {/* 2. 未來上課 */}
          {futureClasses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-2">
              <div className="bg-white px-6 py-3 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-600 tracking-wider">未來上課 Future Classes</h2></div>
              <div className="p-6 flex flex-col gap-4 bg-slate-50/30">
                {futureClasses.map(cls => renderClassCard(cls, 'normal'))}
              </div>
            </div>
          )}

          {/* 3. 過去上課 */}
          {pastClasses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-2">
              <div className="bg-white px-6 py-3 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-600 tracking-wider">過去上課 Past Classes</h2></div>
              <div className="p-6 flex flex-col gap-4">
                {pastClasses.map(cls => renderClassCard(cls, 'past'))}
              </div>
            </div>
          )}

        </main>
        {/* 保留原本右側的快速紀錄區塊（如果不需要也可以刪掉） */}
        <aside className="hidden xl:flex w-72 flex-col gap-6 flex-shrink-0 animate-fade-in">
           {/* 你原本右邊有個上課紀錄的卡片，因為版面變窄，我把它放到這邊，或者如果你不需要可以移除整個 aside */}
        </aside>
      </>
    );
  };

  // --- 介面 2：審查檔案庫 ---
  const renderReviews = () => (
    <main className="flex-grow w-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
      <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
        <h2 className="font-bold text-lg text-slate-800 flex items-center">
          <FileCheck size={22} className="mr-2 text-primary" /> 審查結果追蹤
        </h2>
      </div>

      <div className="p-8 space-y-10">
        <section>
          <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-700 flex items-center text-lg"><Award className="mr-2 text-orange-500" size={20}/> 1. 資格證明</h3>
          </div>
          <div className="space-y-3">
            {userInfo.certificationFile ? (
              <div className="p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between bg-white hover:shadow-md transition gap-4">
                <div className="flex items-center overflow-hidden">
                  <FileText className="text-slate-400 mr-3 flex-shrink-0" size={24} />
                  <div>
                    <p className="font-bold text-slate-700 truncate max-w-[200px] sm:max-w-xs md:max-w-md">{userInfo.certificationFile}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {userInfo.certificationStatus === 'pending' && <span className="px-4 py-1.5 bg-amber-100 text-amber-700 font-bold text-sm rounded-full flex items-center"><Clock size={16} className="mr-1.5"/> 審查中</span>}
                  {userInfo.certificationStatus === 'approved' && <span className="px-4 py-1.5 bg-green-100 text-green-700 font-bold text-sm rounded-full flex items-center"><CheckCircle size={16} className="mr-1.5"/> 已通過</span>}
                  {userInfo.certificationStatus === 'resubmit' && <span className="px-4 py-1.5 bg-red-100 text-red-700 font-bold text-sm rounded-full flex items-center"><AlertCircle size={16} className="mr-1.5"/> 需補件</span>}
                </div>
              </div>
            ) : (
              <div className="p-6 border-2 border-slate-100 border-dashed rounded-xl text-center"><p className="text-slate-400 text-sm font-medium">尚未上傳資格證明</p></div>
            )}
          </div>
        </section>
      </div>
    </main>
  );

  // --- 介面 3：尋找外籍生 ---
  const renderFindStudents = () => {
    const filteredTutees = filterLevel === 'All' ? tuteesList : tuteesList.filter(t => t.overall_level === filterLevel);

    return (
      <main className="flex-grow flex flex-col gap-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full min-h-[600px]">
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="font-bold text-lg text-slate-800 flex items-center">
              <Search size={22} className="mr-2 text-primary" /> 尋找外籍生
            </h2>
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-600">
              <Filter size={16} /> <span>程度篩選：</span>
              <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary">
                <option value="All">全部 (All)</option>
                <option value="不知道 (Unknown)">不知道 (Unknown)</option>
                <option value="N">N (零基礎)</option>
                <option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option><option value="B2">B2</option><option value="C1">C1</option><option value="C2">C2</option>
              </select>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 bg-slate-50/50 flex-grow content-start">
            {filteredTutees.length > 0 ? filteredTutees.map(tutee => {
              const skills = typeof tutee.target_skills === 'string' ? JSON.parse(tutee.target_skills) : (tutee.target_skills || {});
              const times = typeof tutee.available_times === 'string' ? JSON.parse(tutee.available_times) : (tutee.available_times || {days:[], slots:[]});
              
              let btnState = 'available'; 
              if (tutee.match_status === 'accepted') btnState = 'matched_others';
              if (tutee.match_status === 'pending') btnState = 'pending_others';

              return (
                <div key={tutee.tutee_user_id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col">
                  <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">{tutee.nationality}</span>
                        <h3 className="text-lg font-bold text-slate-800">{tutee.englishName}</h3>
                      </div>
                      <p className="text-sm text-slate-500 font-medium">{tutee.chinese_name || '無中文名'} ({tutee.student_id})</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs text-slate-400 font-bold mb-0.5">華語程度</span>
                      <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 font-black rounded-lg">{tutee.overall_level}</span>
                    </div>
                  </div>

                  <div className="space-y-4 flex-grow">
                    <div>
                      <span className="text-xs font-bold text-slate-400 flex items-center mb-1.5"><Award size={14} className="mr-1"/> 想加強的技巧</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(skills).map(([k, v]) => v ? <span key={k} className="px-2.5 py-1 bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100 rounded-md">{SKILL_MAP[k]}</span> : null)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-400 flex items-center mb-1.5"><Clock size={14} className="mr-1"/> 希望上課時間</span>
                      <div className="flex flex-wrap gap-2">
                        {times.days && times.days.map(d => <span key={d} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">{DAYS_MAP[d]}</span>)}
                        {times.days && times.slots && times.days.length > 0 && times.slots.length > 0 && <span className="text-slate-300 font-bold px-1">|</span>}
                        {times.slots && times.slots.map(s => <span key={s} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">{s}</span>)}
                        {(!times.days || times.days.length === 0) && (!times.slots || times.slots.length === 0) && <span className="text-slate-400 text-sm italic">未設定時間</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">學習時長：{tutee.learning_duration || '未提供'}</span>
                    
                    {btnState === 'available' ? (
                      <button onClick={() => handleSendRequest(tutee.tutee_user_id, tutee.englishName)} className="flex items-center px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition shadow-sm">
                        <Send size={16} className="mr-2"/> 👋 發送邀請
                      </button>
                    ) : btnState === 'pending_others' ? (
                      <button disabled className="flex items-center px-4 py-2 bg-amber-50 text-amber-600 text-sm font-bold rounded-lg border border-amber-200 cursor-not-allowed">
                        ⏳ 洽談中
                      </button>
                    ) : (
                      <button disabled className="flex items-center px-4 py-2 bg-slate-100 text-slate-400 text-sm font-bold rounded-lg cursor-not-allowed">
                        ❌ 已配對
                      </button>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-16 text-center text-slate-400 font-bold flex flex-col items-center">
                <Search size={48} className="mb-4 text-slate-200" />
                目前沒有符合條件的外籍生喔！
              </div>
            )}
          </div>
        </div>
      </main>
    );
  };

  // --- 介面 4：我的學生 (專屬已配對畫面) ---
  const renderMyStudent = () => {
    if (userInfo.matched_tutee_id && matchedTutee) {
      const skills = typeof matchedTutee.target_skills === 'string' ? JSON.parse(matchedTutee.target_skills) : (matchedTutee.target_skills || {});
      const times = typeof matchedTutee.available_times === 'string' ? JSON.parse(matchedTutee.available_times) : (matchedTutee.available_times || {days:[], slots:[]});

      return (
        <main className="flex-grow animate-fade-in">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-green-500 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block">🎉 配對成功 Matched!</span>
                <h2 className="text-2xl font-bold">Your Student: {matchedTutee.english_name}</h2>
              </div>
              <CheckCircle size={48} className="text-white/80" />
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-1">中文 / 英文姓名</h4>
                <p className="font-bold text-slate-800 text-lg mb-4">
                  {matchedTutee.chinese_name || '未提供'} / {matchedTutee.english_name}
                </p>
                
                <h4 className="text-sm font-bold text-slate-400 mb-1">學號 / 系所</h4>
                <p className="font-medium text-slate-700 mb-4">
                  {matchedTutee.student_id} / {matchedTutee.department}
                </p>
                
                <h4 className="text-sm font-bold text-slate-400 mb-1">國家 Nationality</h4>
                <p className="font-medium text-slate-700 mb-4">{matchedTutee.nationality}</p>
                
                <h4 className="text-sm font-bold text-slate-400 mb-1">聯絡方式 Email</h4>
                <p className="font-medium text-primary hover:underline cursor-pointer">{matchedTutee.email || '未提供 Email'}</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex gap-6 mb-5 border-b border-slate-200 pb-5">
                   <div>
                     <h4 className="text-xs font-bold text-slate-400 mb-1">學習時長</h4>
                     <p className="font-bold text-slate-700">{matchedTutee.learning_duration}</p>
                   </div>
                   <div>
                     <h4 className="text-xs font-bold text-slate-400 mb-1">整體能力</h4>
                     <p className="font-bold text-slate-700">{matchedTutee.overall_level}</p>
                   </div>
                </div>
                
                <h4 className="font-bold text-slate-700 flex items-center mb-3"><Clock size={18} className="mr-2 text-primary"/> 學生希望上課時間</h4>
                
                <div className="space-y-3 mb-6 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 mb-2 block">📅 星期 Days</span>
                    <div className="flex flex-wrap gap-2">
                      {times.days && times.days.map(d => <span key={d} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-sm font-bold rounded-md">{DAYS_MAP[d] || d}</span>)}
                      {(!times.days || times.days.length === 0) && <span className="text-slate-400 text-sm italic">未設定</span>}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400 mb-2 block">⏰ 時段 Time Slots</span>
                    <div className="flex flex-wrap gap-2">
                      {times.slots && times.slots.map(s => <span key={s} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-sm font-bold rounded-md">{s}</span>)}
                      {(!times.slots || times.slots.length === 0) && <span className="text-slate-400 text-sm italic">未設定</span>}
                    </div>
                  </div>
                </div>

                <h4 className="font-bold text-slate-700 flex items-center mb-3"><Award size={18} className="mr-2 text-orange-500"/> 學生想加強的技巧</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(skills).map(([k, v]) => v ? <span key={k} className="px-2.5 py-1 bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100 rounded-md">{SKILL_MAP[k]}</span> : null)}
                </div>
                
                {matchedTutee.skills_to_improve && (
                  <div className="mt-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 mb-1.5 block">備註 Notes</span>
                    <p className="text-sm text-slate-600 leading-relaxed italic">"{matchedTutee.skills_to_improve}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="flex-grow animate-fade-in flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 p-12 min-h-[500px]">
        <UserCheck size={64} className="text-slate-200 mb-6" />
        <h3 className="text-xl font-bold text-slate-700 mb-3">尚未配對到學生</h3>
        <p className="text-slate-500 text-center max-w-sm mb-6 leading-relaxed">您目前還沒有專屬的外籍生。<br/>請主動去尋找適合您的學生，並向他們發出輔導邀請吧！</p>
        <button onClick={() => setActiveTab('find-students')} className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-sm hover:bg-primary-dark transition flex items-center">
          <Search size={18} className="mr-2" /> 前往尋找學生
        </button>
      </main>
    );
  };

  // --- 介面 5：全新課表與排課系統 ---
  const renderSchedule = () => (
    <main className="flex-grow w-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in flex flex-col">
      <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
        <h2 className="font-bold text-lg text-slate-800 flex items-center"><Calendar size={22} className="mr-2 text-primary" /> 專屬課表 My Schedule</h2>
      </div>

      <div className="p-8 flex-grow flex flex-col gap-8">
        
        {/* 我的學生專屬排課卡片 */}
        <div>
          <h3 className="text-sm font-bold text-slate-500 mb-4">選擇學生安排課程</h3>
          {!matchedTutee ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
              尚未配對學生，請先至「尋找學生」發送邀請。
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-primary/30 transition gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {matchedTutee.english_name ? matchedTutee.english_name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{matchedTutee.chinese_name || '未提供'} / {matchedTutee.english_name}</h4>
                  <p className="text-sm text-slate-500 font-medium">{matchedTutee.student_id} | 程度: {matchedTutee.overall_level}</p>
                </div>
              </div>
              <button onClick={() => setIsScheduleModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center text-sm font-bold text-white bg-primary hover:bg-primary-dark px-5 py-2.5 rounded-lg transition shadow-sm">
                <Plus size={16} className="mr-1.5" /> 安排上課
              </button>
            </div>
          )}
        </div>

        {/* 課表清單 */}
        <div>
          <h3 className="text-sm font-bold text-slate-500 mb-4">已排定課程 Scheduled Classes</h3>
          {classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Calendar size={48} className="mb-3 text-slate-300"/>
              <p className="font-bold text-slate-600">目前沒有任何課程</p>
              <p className="text-sm mt-1">請點擊上方「安排上課」按鈕為學生排課</p>
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((cls, index) => (
                <div key={cls.id} className="flex items-center p-4 border border-slate-100 bg-white hover:bg-slate-50 rounded-xl shadow-sm transition group">
                  <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex flex-col items-center justify-center mr-6 flex-shrink-0">
                    <span className="text-xs font-bold uppercase">{new Date(cls.class_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="text-xl font-black">{new Date(cls.class_date).getDate()}</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-slate-800 text-lg">華語輔導課程 - 第 {index + 1} 堂</h4>
                    <p className="text-slate-500 font-medium flex items-center mt-1">
                      <Clock size={14} className="mr-1.5 text-slate-400"/> {cls.start_time.substring(0,5)} ~ {cls.end_time.substring(0,5)}
                    </p>
                  </div>
                  {/* 在課表總表也可以加入小小的編輯按鈕 */}
                  <button onClick={() => setEditClassModal({ isOpen: true, classId: cls.id, date: cls.class_date.split('T')[0], startTime: cls.start_time.substring(0,5), endTime: cls.end_time.substring(0,5) })} className="p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition mr-2">
                    <Edit size={18} />
                  </button>
                  <div className="flex-shrink-0 px-4 py-1.5 bg-amber-50 text-amber-600 font-bold text-sm rounded-lg border border-amber-200">
                    即將到來
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 排課彈出視窗 (一次性排很多課) */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center"><Calendar className="mr-2 text-primary" size={20}/> 安排上課時間</h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleScheduleSubmit} className="p-6 overflow-y-auto flex-grow">
              <div className="space-y-5">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-700">設定上課時段 <span className="text-red-500">*</span></h4>
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md">一週最多 2 小時</span>
                </div>

                {slots.map((slot, index) => {
                  const weekdayStr = getWeekdayString(slot.date);
                  return (
                    <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
                      {slots.length > 1 && (
                        <button type="button" onClick={() => handleRemoveSlot(index)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><X size={16}/></button>
                      )}
                      <div className="mb-3">
                        <label className="flex items-center text-xs font-bold text-slate-500 mb-1">
                          上課日期 Date
                          {weekdayStr && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] tracking-widest shadow-sm">星期{weekdayStr}</span>}
                        </label>
                        <input type="date" value={slot.date} onChange={e => handleSlotChange(index, 'date', e.target.value)} required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm" />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">開始 Start</label>
                          <input type="time" value={slot.startTime} onChange={e => handleSlotChange(index, 'startTime', e.target.value)} required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">結束 End</label>
                          <input type="time" value={slot.endTime} onChange={e => handleSlotChange(index, 'endTime', e.target.value)} required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {slots.length < 2 && (
                  <button type="button" onClick={handleAddSlot} className="flex items-center text-sm font-bold text-primary hover:text-primary-dark transition bg-primary/10 px-4 py-2 rounded-lg w-full justify-center border border-primary/20">
                    <Plus size={16} className="mr-1" /> 新增一天 (Add another day)
                  </button>
                )}

                <div className="pt-5 border-t border-slate-100">
                  <label className="flex items-center space-x-2 cursor-pointer mb-3">
                    <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded" />
                    <span className="font-bold text-slate-700">每週重複此課表 (Recurring Weekly)</span>
                  </label>

                  {isRecurring && (
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                      <label className="block text-sm font-bold text-slate-700 mb-1">重複直到哪一天？ End Date <span className="text-red-500">*</span></label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required={isRecurring} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">取消</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition shadow-md flex justify-center items-center">
                  <CheckCircle size={18} className="mr-1.5"/> 確定排課
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✨ 編輯單一課程的彈出視窗 */}
      {editClassModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center"><Edit className="mr-2 text-primary" size={20}/> 修改上課時間</h3>
              <button onClick={() => setEditClassModal({ ...editClassModal, isOpen: false })} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditClassSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="flex items-center text-sm font-bold text-slate-700 mb-1">
                    上課日期 Date
                    {getWeekdayString(editClassModal.date) && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] tracking-widest shadow-sm">星期{getWeekdayString(editClassModal.date)}</span>}
                  </label>
                  <input type="date" value={editClassModal.date} onChange={e => setEditClassModal({...editClassModal, date: e.target.value})} required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1">開始 Start</label>
                    <input type="time" value={editClassModal.startTime} onChange={e => setEditClassModal({...editClassModal, startTime: e.target.value})} required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1">結束 End</label>
                    <input type="time" value={editClassModal.endTime} onChange={e => setEditClassModal({...editClassModal, endTime: e.target.value})} required className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary" />
                  </div>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setEditClassModal({ ...editClassModal, isOpen: false })} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">取消</button>
                <button type="submit" className="flex-1 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition shadow-sm">儲存變更</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center space-x-8">
          <img src={logoImg} alt="Logo" className="h-8 w-auto object-contain" />
          
          <nav className="hidden md:flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('home')} className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${activeTab === 'home' ? 'bg-white text-primary' : 'text-slate-500 hover:text-primary'}`}>首頁</button>
            <button onClick={() => setActiveTab('find-students')} className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${activeTab === 'find-students' ? 'bg-white text-primary' : 'text-slate-500 hover:text-primary'}`}>尋找學生</button>
            <button onClick={() => setActiveTab('schedule')} className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${activeTab === 'schedule' ? 'bg-white text-primary' : 'text-slate-500 hover:text-primary'}`}>課表</button>
            <button className="px-5 py-1.5 text-slate-500 font-medium hover:text-primary transition text-sm">紀錄</button>
            <button className="px-5 py-1.5 text-slate-500 font-medium hover:text-primary transition text-sm">紙本</button>
          </nav>
        </div>
        <div className="flex items-center space-x-5">
          <button className="text-slate-400 hover:text-primary transition"><MessageSquare size={20} /></button>
          <button className="text-slate-400 hover:text-primary transition"><Bell size={20} /></button>
          <div className="relative">
            <div className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
              <div className="w-9 h-9 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">{avatarInitial}</div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"><span className="font-bold text-slate-800 truncate block w-36" title={displayName}>{displayName}</span><span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold capitalize">{userInfo.role}</span></div>
                <div className="py-2">
                  <button onClick={() => navigate('/profile')} className="w-full flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary transition"><User size={16} className="mr-3" /> 個人資訊</button>
                </div>
                <div className="py-2 border-t border-slate-100"><button onClick={handleLogout} className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition"><LogOut size={16} className="mr-3" /> 登出</button></div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-6 gap-8">
        <aside className="w-full md:w-64 flex flex-col gap-6 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center text-lg">快速連結</h3>
            <ul className="space-y-2 text-sm font-medium">
              <li onClick={() => setActiveTab('home')} className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === 'home' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-primary'}`}><Home size={20} className={`mr-4 ${activeTab === 'home' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} /> 首頁主控台</li>
              <li onClick={() => navigate('/profile')} className="flex items-center p-3 rounded-xl hover:bg-slate-50 hover:text-primary cursor-pointer transition group text-slate-600"><User size={20} className="mr-4 text-slate-400 group-hover:text-primary" /> 個人資訊</li>
              
              <li onClick={() => setActiveTab('my-student')} className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === 'my-student' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-primary'}`}><UserCheck size={20} className={`mr-4 ${activeTab === 'my-student' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} /> 我的學生</li>
              <li onClick={() => setActiveTab('schedule')} className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === 'schedule' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-primary'}`}><Calendar size={20} className={`mr-4 ${activeTab === 'schedule' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} /> 課表</li>
              
              <li onClick={() => setActiveTab('reviews')} className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === 'reviews' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-primary'}`}><FileCheck size={20} className={`mr-4 ${activeTab === 'reviews' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} /> 審查結果{userInfo.certificationStatus === 'resubmit' && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full shadow-sm"></span>}</li>
              <li className="flex items-center p-3 rounded-xl hover:bg-slate-50 hover:text-primary cursor-pointer transition group text-slate-600"><Bell size={20} className="mr-4 text-slate-400 group-hover:text-primary" /> 通知</li>
            </ul>
          </div>
        </aside>

        {/* 版面切換器 */}
        {activeTab === 'home' ? renderHome() : 
         activeTab === 'find-students' ? renderFindStudents() : 
         activeTab === 'my-student' ? renderMyStudent() : 
         activeTab === 'schedule' ? renderSchedule() : 
         renderReviews()}
      </div>
      
      <footer className="bg-white border-t border-slate-200 py-4 px-6 flex justify-between items-center text-sm text-slate-500 mt-auto">
        <div>© 2026 華語系 保留所有權利。</div>
        <div className="text-slate-500 font-medium hidden md:block">臺師大華語系</div>
      </footer>
    </div>
  );
}

export default TutorDashboard;