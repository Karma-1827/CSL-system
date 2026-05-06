import React, { useState, useEffect } from 'react';
import { User, Users, Globe, FileCheck, Bell, MessageSquare, ChevronDown, LogOut, Clock, CheckCircle, Search, LayoutGrid, List, ArrowLeft, ClipboardList, Eye, FileText, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoImg from './assets/csl-Logo.png'; // 確保檔名正確

function AdminDashboard() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('adminActiveTab') || 'home');
  const [viewMode, setViewMode] = useState('grid');
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ✨ 首頁用的狀態：待審查與已審查清單
  const [pendingReviews, setPendingReviews] = useState([]);
  const [approvedReviews, setApprovedReviews] = useState([]);
  
  // ✨ 審查彈出視窗的狀態
  const [reviewModal, setReviewModal] = useState({ isOpen: false, student: null });
  const [previewFileUrl, setPreviewFileUrl] = useState(null);

  const [userInfo, setUserInfo] = useState({ chineseName: '管理員', englishName: 'Admin', role: 'admin' });

  useEffect(() => {
    const account = localStorage.getItem('loggedInAccount');
    if (account) {
      fetch(`http://localhost:3001/api/user/${account}`)
        .then(res => res.json())
        .then(result => { if (result.success) setUserInfo(result.data); });
    } else navigate('/'); 
  }, [navigate]);

  // ✨ 撈取學生資料的函數 (抽出來讓審查完可以重新呼叫)
  const fetchStudents = () => {
    if (activeTab === 'tutors' || activeTab === 'tutees' || activeTab === 'home') {
      fetch(`http://localhost:3001/api/admin/users/tutor`)
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            if (activeTab === 'tutors') setStudentsList(result.data);
            // 分類首頁資料
            setPendingReviews(result.data.filter(s => s.certification_file && s.certification_status === 'pending'));
            setApprovedReviews(result.data.filter(s => s.certification_file && s.certification_status === 'approved'));
          }
        });
        
      if (activeTab === 'tutees') {
        fetch(`http://localhost:3001/api/admin/users/tutee`)
          .then(res => res.json())
          .then(result => { if (result.success) setStudentsList(result.data); });
      }
    }
  };

  useEffect(() => {
    fetchStudents();
    setSelectedStudent(null);
  }, [activeTab]);

  useEffect(() => { sessionStorage.setItem('adminActiveTab', activeTab); }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('loggedInAccount');
    navigate('/');
  };

  // ✨ 送出審查結果 (通過 / 補件)
  const handleReviewSubmit = async (status) => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/review-cert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: reviewModal.student.student_id, status })
      });
      const result = await response.json();
      if (result.success) {
        alert(status === 'approved' ? '✅ 已通過審查！' : '⚠️ 已通知學生補件！');
        setReviewModal({ isOpen: false, student: null });
        fetchStudents(); // 重新撈資料，畫面會自動更新
      }
    } catch (error) { alert("連線錯誤"); }
  };

  // --- 介面：首頁儀表板 ---
  const renderHomeDashboard = () => (
    <>
      <main className="flex-grow flex flex-col gap-6">
        
        {/* 待審資料 */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
          <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
            <h2 className="font-bold text-orange-700 flex items-center"><Clock size={18} className="mr-2" /> 待審查資料 ({pendingReviews.length})</h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {pendingReviews.length > 0 ? pendingReviews.map((student, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">小老師</span>
                    <h4 className="font-bold text-slate-800">{student.chinese_name} ({student.student_id})</h4>
                  </div>
                  <div className="flex items-center text-sm text-slate-500 mt-2">
                    <button onClick={() => window.open(`http://localhost:3001/uploads/${student.certification_file}`)} className="flex items-center text-primary hover:underline font-bold bg-primary/5 px-2 py-1 rounded-md">
                      <Eye size={14} className="mr-1" /> 預覽檔案
                    </button>
                    <span className="ml-3 truncate max-w-[150px]">{student.certification_file}</span>
                  </div>
                </div>
                {/* ✨ 點擊打開審查 Modal */}
                <button onClick={() => setReviewModal({ isOpen: true, student })} className="px-5 py-2.5 bg-slate-700 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition shadow-sm">
                  開始審查
                </button>
              </div>
            )) : <div className="text-center py-6 text-slate-400 font-medium">目前沒有待審查的資料 🎉</div>}
          </div>
        </div>

        {/* 已審資料 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-2">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100"><h2 className="font-bold text-slate-700 flex items-center"><CheckCircle size={18} className="mr-2 text-green-500" /> 最近已審查</h2></div>
          <div className="p-4 flex flex-col gap-3">
            {approvedReviews.length > 0 ? approvedReviews.map((student, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
                <div>
                  <h4 className="font-bold text-slate-600">{student.chinese_name} ({student.student_id})</h4>
                  <p className="text-sm text-slate-500 mt-1">文件：{student.certification_file}</p>
                </div>
                <div className="flex items-center text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-sm font-bold"><CheckCircle size={16} className="mr-1.5" /> 已通過</div>
              </div>
            )) : <div className="text-center py-6 text-slate-400 font-medium">尚無已審查紀錄</div>}
          </div>
        </div>
      </main>

      <aside className="w-full md:w-64">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full min-h-[400px]">
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center"><Bell size={18} className="text-slate-500 mr-2" /><h3 className="font-bold text-slate-800">系統通知</h3></div>
          <div className="p-4 flex flex-col gap-4">
            <div className="flex gap-3"><div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5"></div><div><p className="text-sm font-medium text-slate-600 mb-0.5">系統運作正常</p></div></div>
          </div>
        </div>
      </aside>

      {/* ✨ 審查彈出視窗 (Modal) */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center"><FileCheck className="mr-2 text-primary" size={20}/> 資格審查</h3>
              <button onClick={() => setReviewModal({ isOpen: false, student: null })} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6 leading-relaxed">
                正在審查 <b>{reviewModal.student.chinese_name}</b> ({reviewModal.student.student_id}) 的資格證明。<br/><br/>
                請確認其上傳之檔案 <b>{reviewModal.student.certification_file}</b> 是否符合本系擔任小老師之標準。
              </p>
              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
                <button onClick={() => handleReviewSubmit('resubmit')} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition border border-red-200">
                  退回 / 要求補件
                </button>
                <button onClick={() => handleReviewSubmit('approved')} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition shadow-sm">
                  ✅ 審查通過
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // --- 介面元件：學生名單 (類 Google Drive) ---
  const renderStudentDirectory = () => {
    // 1. 如果有選中某個學生，顯示詳細資料畫面
    if (selectedStudent) {
      return (
        <main className="flex-grow bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center">
            <button onClick={() => setSelectedStudent(null)} className="flex items-center text-slate-500 hover:text-primary transition mr-4">
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-bold text-slate-800 text-lg">
              {selectedStudent.chinese_name} ({selectedStudent.english_name}) 的詳細資料
            </h2>
          </div>
          <div className="p-8">
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
              <div className="w-24 h-24 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-3xl">
                {selectedStudent.english_name ? selectedStudent.english_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 mb-1">{selectedStudent.chinese_name}</h3>
                <p className="text-slate-500 font-medium">{selectedStudent.student_id} • {selectedStudent.department || '未填寫系所'}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                  {activeTab === 'tutors' ? '小老師 Tutor' : '外籍生 Tutee'}
                </span>
              </div>
            </div>
            
            <h4 className="font-bold text-slate-700 mb-4 flex items-center"><User size={18} className="mr-2 text-primary" /> 所有資料紀錄</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ✨ 修改：客製化「資格證明文件」的顯示方式 */}
              {Object.entries(selectedStudent).map(([key, value]) => {
                if (key === 'certification_file' && value) {
                  return (
                    <div key={key} className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:col-span-2">
                      <span className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">資格證明文件 Certification</span>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center text-slate-700 font-bold truncate max-w-sm">
                          <FileText size={18} className="mr-2 text-primary flex-shrink-0" />
                          {value}
                        </div>
                        <div className="flex space-x-3 flex-shrink-0">
                          <button onClick={() => setPreviewFileUrl(`http://localhost:3001/uploads/${value}`)} className="flex items-center bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition">
                            <Eye size={16} className="mr-1.5" /> 預覽審查
                          </button>
                          <a href={`http://localhost:3001/uploads/${value}`} target="_blank" rel="noopener noreferrer" download className="flex items-center bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-300 transition">
                            <Download size={16} className="mr-1.5" /> 下載檔案
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                }

                // 其他一般欄位維持原本的印出方式
                return (
                  <div key={key} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col">
                    <span className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm text-slate-800 font-medium break-words">
                      {value === null || value === '' ? <span className="text-slate-300 italic">空值</span> : 
                       typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      );
    }

    // 2. 否則顯示清單畫面 (Google Drive Style)
    return (
      <main className="flex-grow flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* 上方工具列 */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-800 text-lg">
            {activeTab === 'tutors' ? '本系學生 (小老師) 清單' : '外籍生清單'}
          </h2>
          {/* 視角切換器 */}
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-50'}`}
              title="列表檢視"
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-50'}`}
              title="網格檢視"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50/30 flex-grow">
          {studentsList.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-medium">目前資料庫沒有找到任何相關學生資料</div>
          ) : viewMode === 'grid' ? (
            /* --- 網格模式 (Card) --- */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {studentsList.map((student, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedStudent(student)}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 cursor-pointer transition-all group"
                >
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary rounded-full flex items-center justify-center font-bold text-2xl mb-4 transition-colors">
                    {student.english_name ? student.english_name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <h4 className="font-bold text-slate-800 text-center">{student.chinese_name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{student.student_id}</p>
                </div>
              ))}
            </div>
          ) : (
            /* --- 列表模式 (Row) --- */
            <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="flex px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500">
                <div className="w-10"></div>
                <div className="flex-1">姓名</div>
                <div className="flex-1 hidden sm:block">學號</div>
                <div className="flex-1 hidden md:block">系所</div>
              </div>
              {studentsList.map((student, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedStudent(student)}
                  className="flex px-6 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition items-center"
                >
                  <div className="w-10 flex-shrink-0">
                    <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold text-sm">
                      {student.english_name ? student.english_name.charAt(0).toUpperCase() : 'S'}
                    </div>
                  </div>
                  <div className="flex-1 font-bold text-slate-800">{student.chinese_name} <span className="text-slate-400 text-sm ml-2 font-normal">{student.english_name}</span></div>
                  <div className="flex-1 hidden sm:block text-slate-500 text-sm">{student.student_id}</div>
                  <div className="flex-1 hidden md:block text-slate-500 text-sm">{student.department || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* 頂部導覽列 */}
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center space-x-8">
          {/* ✨ 修改後的寫法：h-8 代表高度大約 32px，你可以改成 h-10 讓他變大，或 h-6 變小 */}
          <img src={logoImg} alt="Logo" className="h-15 w-auto object-contain" />
          <nav className="hidden md:flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <span className="px-5 py-1.5 bg-white text-primary font-bold rounded-md shadow-sm text-sm cursor-default">主控台</span>
          </nav>
        </div>
        <div className="flex items-center space-x-5">
          <div className="hidden lg:flex items-center bg-slate-100 px-3 py-1.5 rounded-full">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="搜尋學號或姓名..." className="bg-transparent border-none outline-none text-sm text-slate-600 w-40" />
          </div>
          <div className="relative">
            <div className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
              <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">A</div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                <div className="py-2 border-t border-slate-100">
                  <button onClick={handleLogout} className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition"><LogOut size={16} className="mr-3" /> 登出</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主要內容區 */}
      <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-6 gap-8">
        
        {/* 左側邊欄：快速連結 */}
        <aside className="w-full md:w-64 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center text-lg">快速連結</h3>
            <ul className="space-y-2 text-sm text-slate-600 font-medium">
              <li onClick={() => setActiveTab('home')} className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === 'home' ? 'bg-purple-50 text-purple-600 font-bold' : 'hover:bg-slate-50'}`}>
                <ClipboardList size={20} className={`mr-4 ${activeTab === 'home' ? 'text-purple-600' : 'text-slate-400'}`} /> 待辦事項
              </li>
              <li onClick={() => setActiveTab('tutors')} className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === 'tutors' ? 'bg-purple-50 text-purple-600 font-bold' : 'hover:bg-slate-50'}`}>
                <Users size={20} className={`mr-4 ${activeTab === 'tutors' ? 'text-purple-600' : 'text-slate-400'}`} /> 本系學生
              </li>
              <li onClick={() => setActiveTab('tutees')} className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === 'tutees' ? 'bg-purple-50 text-purple-600 font-bold' : 'hover:bg-slate-50'}`}>
                <Globe size={20} className={`mr-4 ${activeTab === 'tutees' ? 'text-purple-600' : 'text-slate-400'}`} /> 外籍生
              </li>
              <li className={`flex items-center p-3 rounded-xl cursor-pointer transition hover:bg-slate-50`}>
                <FileCheck size={20} className="mr-4 text-slate-400" /> 審查資料
              </li>
            </ul>
          </div>
        </aside>

        {/* 動態渲染中間的內容 */}
        {activeTab === 'home' ? renderHomeDashboard() : renderStudentDirectory()}
      </div>
      {/* ✨ 新增：檔案預覽的彈出視窗 */}
      {previewFileUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-8 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center"><Eye className="mr-2 text-primary" size={20}/> 檔案預覽與審查</h3>
              <button onClick={() => setPreviewFileUrl(null)} className="text-slate-400 hover:text-red-500 transition p-1 bg-white rounded-md shadow-sm border border-slate-200">
                <X size={20} />
              </button>
            </div>
            <div className="flex-grow overflow-auto bg-slate-100 flex items-center justify-center p-4">
              {previewFileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                <img src={previewFileUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
              ) : previewFileUrl.match(/\.(pdf)$/i) ? (
                <iframe src={previewFileUrl} className="w-full h-[70vh] border-0 rounded-lg shadow-sm" title="PDF Preview" />
              ) : (
                <div className="text-center p-12">
                  <FileText size={64} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium">此檔案格式不支援直接預覽，請關閉視窗並點擊「下載」查看。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;