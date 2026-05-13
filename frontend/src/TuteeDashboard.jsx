import React, { useState, useEffect } from "react";
import {
  Home,
  User,
  Bell,
  MessageSquare,
  ChevronDown,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  UserCheck,
  Edit,
  FileText,
  CheckSquare,
  Flag,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoImg from "./assets/csl-Logo.png";

const DAYS_MAP = { Mon: "一", Tue: "二", Wed: "三", Thu: "四", Fri: "五" };

function TuteeDashboard() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("tuteeActiveTab") || "home",
  );

  const [userInfo, setUserInfo] = useState({
    account: "",
    chineseName: "",
    englishName: "",
    role: "tutee",
    matched_tutor_id: null,
  });
  const [requests, setRequests] = useState([]);
  const [matchedTutor, setMatchedTutor] = useState(null);
  const [classes, setClasses] = useState([]);

  // 補簽到相關 state
  const [makeupModal, setMakeupModal] = useState({
    isOpen: false,
    classId: null,
  });
  const [makeupReason, setMakeupReason] = useState("");
  const [makeupFile, setMakeupFile] = useState(null);
  const [makeupRemaining, setMakeupRemaining] = useState(5);

  // 撈剩餘補簽次數
  const fetchMakeupRemaining = (userId) => {
    fetch(`http://localhost:3001/api/makeup-remaining/${userId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setMakeupRemaining(result.remaining);
      });
  };

  const fetchNotesRemaining = (userId) => {
    fetch(`http://localhost:3001/api/notes-remaining/${userId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setNotesRemaining(result.remaining);
      });
  };

  const [hasSentAlert, setHasSentAlert] = useState(false);

  const handleEmergencyAlert = async (cls) => {
    if (
      !window.confirm(
        "確定要送出緊急通報嗎？\n助教將收到通知：您目前聯絡不到對方。",
      )
    )
      return;

    try {
      const res = await fetch(
        `http://localhost:3001/api/classes/${cls.id}/emergency`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userInfo.user_id, role: "tutee" }), // tutee 改 'tutee'
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) setHasSentAlert(true);
    } catch (err) {
      alert("連線錯誤");
    }
  };

  // 送出補簽申請
  const handleMakeupCheckin = async (e) => {
    e.preventDefault();
    if (!makeupReason.trim()) return alert("請填寫說明原因");

    const formData = new FormData();
    formData.append("userId", userInfo.user_id);
    formData.append("role", "tutee");
    formData.append("reason", makeupReason);
    if (makeupFile) formData.append("attachment", makeupFile);

    try {
      const res = await fetch(
        `http://localhost:3001/api/classes/${makeupModal.classId}/makeup-checkin`,
        { method: "POST", body: formData },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setMakeupModal({ isOpen: false, classId: null });
        setMakeupReason("");
        setMakeupFile(null);
      }
    } catch (err) {
      alert("連線錯誤");
    }
  };

  const [reportModal, setReportModal] = useState({
    isOpen: false,
    classId: null,
    classDate: "",
    startTime: "",
    endTime: "",
  });
  const [reportForm, setReportForm] = useState({
    reportType: "",
    location: "",
    content: "",
    file: null,
  });

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportForm.reportType) return alert("請選擇回報類型！");
    if (!reportForm.content.trim()) return alert("請填寫回報內容！");

    const formData = new FormData();
    formData.append("userId", userInfo.user_id);
    formData.append("role", "tutee"); // tutee 改成 'tutee'
    formData.append("reportType", reportForm.reportType);
    formData.append("location", reportForm.location);
    formData.append("content", reportForm.content);
    if (reportForm.file) formData.append("attachment", reportForm.file);

    try {
      const res = await fetch(
        `http://localhost:3001/api/classes/${reportModal.classId}/report`,
        { method: "POST", body: formData },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setReportModal({
          isOpen: false,
          classId: null,
          classDate: "",
          startTime: "",
          endTime: "",
        });
        setReportForm({
          reportType: "",
          location: "",
          content: "",
          file: null,
        });
      }
    } catch (err) {
      alert("連線錯誤");
    }
  };

  const [notesModal, setNotesModal] = useState({
    isOpen: false,
    classId: null,
    classDate: "",
    startTime: "",
    endTime: "",
    isDeadlinePassed: false, // ✨ 新增
  });
  const [notesForm, setNotesForm] = useState({
    location: "",
    content: "",
    remarks: "",
    file: null,
  });
  const [existingNote, setExistingNote] = useState(null);

  const handleOpenNotesModal = async (cls) => {
    const dateStr = cls.class_date.split("T")[0];
    const deadline = new Date(`${dateStr}T23:59:59`); // ✅ 先宣告
    const isDeadlinePassed = new Date() > deadline; // ✅ 再計算

    setNotesModal({
      isOpen: true,
      classId: cls.id,
      classDate: dateStr,
      startTime: cls.start_time.substring(0, 5),
      endTime: cls.end_time.substring(0, 5),
      isDeadlinePassed, // ✅ 這時才用
    });

    // 撈現有紀錄
    try {
      const res = await fetch(
        `http://localhost:3001/api/classes/${cls.id}/notes/${userInfo.user_id}`,
      );
      const data = await res.json();
      if (data.success && data.data) {
        setExistingNote(data.data);
        setNotesForm({
          location: data.data.location || "",
          content: data.data.content || "",
          remarks: data.data.remarks || "",
          file: null,
        });
      } else {
        setExistingNote(null);
        setNotesForm({ location: "", content: "", remarks: "", file: null });
      }
    } catch (err) {
      setExistingNote(null);
    }
  };

  const [notesRemaining, setNotesRemaining] = useState(5);

  const handleNotesSubmit = async (e) => {
    e.preventDefault();
    if (!notesForm.content.trim()) return alert("請填寫上課內容！");

    const formData = new FormData();
    formData.append("userId", userInfo.user_id);
    formData.append("role", "tutee"); // tutee 改成 "tutee"
    formData.append("location", notesForm.location);
    formData.append("content", notesForm.content);
    formData.append("remarks", notesForm.remarks);
    if (notesForm.file) formData.append("attachment", notesForm.file);

    // ✨ 根據截止時間決定打哪支 API
    const apiUrl = notesModal.isDeadlinePassed
      ? `http://localhost:3001/api/classes/${notesModal.classId}/makeup-notes`
      : `http://localhost:3001/api/classes/${notesModal.classId}/notes`;

    try {
      const res = await fetch(apiUrl, { method: "POST", body: formData });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setNotesModal({
          isOpen: false,
          classId: null,
          classDate: "",
          startTime: "",
          endTime: "",
          isDeadlinePassed: false,
        });
        if (notesModal.isDeadlinePassed) fetchNotesRemaining(userInfo.user_id);
      }
    } catch (err) {
      alert("連線錯誤");
    }
  };

  useEffect(() => {
    const account = localStorage.getItem("loggedInAccount");
    if (account) {
      fetch(`http://localhost:3001/api/profile/${account}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            setUserInfo({
              ...result.data,
              account,
              matched_tutor_id: result.data.matched_tutor_id,
            });
            if (result.data.matched_tutor_id) {
              fetchMatchedTutor(result.data.matched_tutor_id);
            } else {
              fetchRequests(account);
            }
            fetchClasses(account);
            if (result.data.user_id) fetchMakeupRemaining(result.data.user_id);
            if (result.data.user_id) fetchNotesRemaining(result.data.user_id);
          }
        });
    } else {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    sessionStorage.setItem("tuteeActiveTab", activeTab);
  }, [activeTab]);

  const fetchRequests = (account) => {
    fetch(`http://localhost:3001/api/match/requests/${account}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setRequests(result.data);
      });
  };

  const fetchMatchedTutor = (tutorId) => {
    fetch(`http://localhost:3001/api/match/tutor-info/${tutorId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setMatchedTutor(result.data);
      });
  };

  const fetchClasses = (account) => {
    fetch(`http://localhost:3001/api/tutee-classes/${account}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setClasses(result.data);
      });
  };

  // 一般簽到
  const handleCheckin = async (classId) => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/classes/${classId}/checkin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "tutee" }),
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        const account = localStorage.getItem("loggedInAccount");
        fetchClasses(account);
      }
    } catch (err) {
      alert("連線錯誤");
    }
  };

  const handleRespond = async (requestId, tutorUserId, action) => {
    const confirmMsg =
      action === "accept"
        ? "確定要接受這位小老師嗎？(接受後其他邀請將自動取消)"
        : "確定要婉拒這個邀請嗎？";
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch("http://localhost:3001/api/match/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          tuteeAccount: userInfo.account,
          tutorUserId,
          action,
        }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        window.location.reload();
      }
    } catch (err) {
      alert("連線錯誤");
    }
  };

  const avatarInitial = userInfo.englishName
    ? userInfo.englishName.charAt(0).toUpperCase()
    : "S";

  const handleLogout = () => {
    localStorage.removeItem("loggedInAccount");
    navigate("/");
  };

  // --- 介面 1：首頁 ---
  const renderHome = () => {
    const now = new Date();
    const pastClasses = [];
    const upcomingAndFuture = [];

    classes.forEach((cls) => {
      const dateStr = cls.class_date.split("T")[0];
      const classEndTime = new Date(`${dateStr}T${cls.end_time}`);
      if (classEndTime < now) {
        pastClasses.push(cls);
      } else {
        upcomingAndFuture.push(cls);
      }
    });

    pastClasses.sort((a, b) => new Date(b.class_date) - new Date(a.class_date));
    upcomingAndFuture.sort(
      (a, b) => new Date(a.class_date) - new Date(b.class_date),
    );

    const upcomingClass =
      upcomingAndFuture.length > 0 ? upcomingAndFuture[0] : null;
    const futureClasses =
      upcomingAndFuture.length > 1 ? upcomingAndFuture.slice(1) : [];

    const renderClassCard = (cls, type = "normal") => {
      const dateStr = cls.class_date.split("T")[0];
      const isPast = type === "past";
      const isUpcoming = type === "upcoming";

      // 簽到邏輯
      const deadline = new Date(`${dateStr}T23:59:59`);
      const nowTime = new Date();
      const isSigned = !!cls.tutee_signed_at;
      const isDeadlinePassed = nowTime > deadline;
      const classStart = new Date(`${dateStr}T${cls.start_time}`);
      const windowStart = new Date(classStart.getTime() - 30 * 60 * 1000);
      const canCheckin = nowTime >= windowStart && !isDeadlinePassed;

      const renderCheckinButton = () => {
        if (isSigned) {
          return (
            <button
              disabled
              className="flex flex-col items-center justify-center py-2 rounded-lg text-green-600 bg-green-50 cursor-default"
            >
              <CheckSquare size={16} className="mb-1" />
              <span className="text-xs font-bold">已簽到 ✓</span>
            </button>
          );
        } else if (isDeadlinePassed) {
          return (
            <button
              onClick={() => setMakeupModal({ isOpen: true, classId: cls.id })}
              className="flex flex-col items-center justify-center py-2 rounded-lg text-red-500 hover:bg-red-50 transition"
            >
              <CheckSquare size={16} className="mb-1" />
              <span className="text-xs font-bold">補簽到</span>
            </button>
          );
        } else {
          return (
            <button
              onClick={() => handleCheckin(cls.id)}
              disabled={!canCheckin}
              className={`flex flex-col items-center justify-center py-2 rounded-lg transition ${
                canCheckin
                  ? "text-slate-500 hover:bg-orange-50 hover:text-orange-600"
                  : "text-slate-300 cursor-not-allowed"
              }`}
            >
              <CheckSquare size={16} className="mb-1" />
              <span className="text-xs font-bold text-center leading-tight">
                學生簽到
                <br />
                Check-in
              </span>
            </button>
          );
        }
      };

      return (
        <div
          key={cls.id}
          className={`p-5 rounded-xl border flex flex-col gap-4 transition group ${
            isPast
              ? "bg-slate-50 border-slate-200 opacity-80"
              : "bg-white border-slate-100 shadow-sm hover:border-primary/30 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center mr-4 flex-shrink-0 ${
                  isPast
                    ? "bg-slate-200 text-slate-500"
                    : "bg-blue-50 border border-blue-100 text-blue-600"
                }`}
              >
                <span className="text-[10px] font-bold uppercase">
                  {new Date(dateStr).toLocaleDateString("en-US", {
                    month: "short",
                  })}
                </span>
                <span className="text-lg font-black leading-none">
                  {new Date(dateStr).getDate()}
                </span>
              </div>
              <div>
                <p
                  className={`font-bold ${isPast ? "text-slate-600" : "text-slate-800"} text-lg`}
                >
                  Tutor:{" "}
                  {cls.tutor_english_name ||
                    cls.tutor_chinese_name ||
                    "載入中..."}
                </p>
                <p className="text-sm font-medium text-slate-500 flex items-center mt-1">
                  🕐 {cls.start_time.substring(0, 5)} ~{" "}
                  {cls.end_time.substring(0, 5)}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
              {isUpcoming && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full shadow-sm animate-pulse">
                  即將上課
                </span>
              )}
              {/* ✨ 緊急通報按鈕：只在上課時間內顯示 */}
              {isUpcoming &&
                (() => {
                  const now = new Date();
                  const classStart = new Date(`${dateStr}T${cls.start_time}`);
                  const classEnd = new Date(`${dateStr}T${cls.end_time}`);
                  const isInClass = now >= classStart && now <= classEnd;

                  if (!isInClass) return null;

                  return hasSentAlert ? (
                    <span className="px-3 py-1 bg-red-100 text-red-500 font-bold text-xs rounded-full">
                      🚨 已通報
                    </span>
                  ) : (
                    <button
                      onClick={() => handleEmergencyAlert(cls)}
                      className="px-3 py-1 bg-red-500 text-white font-bold text-xs rounded-full hover:bg-red-600 transition shadow-sm animate-pulse"
                    >
                      🚨 緊急通報 SOS
                    </button>
                  );
                })()}
            </div>
          </div>

          {/* 四個操作按鈕 */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
            {/* 編輯時間（tutee 不能編輯，永遠 disabled） */}
            <button
              disabled
              className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-300 cursor-not-allowed"
            >
              <Edit size={16} className="mb-1" />
              <span className="text-xs font-bold text-center leading-tight">
                編輯時間
                <br />
                Edit
              </span>
            </button>

            {(() => {
              const dateStr = cls.class_date.split("T")[0];
              const nowTime = new Date();
              const classStart = new Date(`${dateStr}T${cls.start_time}`);
              const deadline = new Date(`${dateStr}T23:59:59`);
              const canFillNote = nowTime >= classStart;
              const isNoteDeadlinePassed = nowTime > deadline;

              if (cls.has_note) {
                return (
                  <button
                    onClick={() => handleOpenNotesModal(cls)}
                    className="flex flex-col items-center justify-center py-2 rounded-lg text-green-600 bg-green-50 transition"
                  >
                    <FileText size={16} className="mb-1" />
                    <span className="text-xs font-bold text-center leading-tight">
                      已填寫 ✓<br />
                      Notes
                    </span>
                  </button>
                );
              } else if (isNoteDeadlinePassed) {
                return (
                  <button
                    onClick={() => handleOpenNotesModal(cls)}
                    className="flex flex-col items-center justify-center py-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                  >
                    <FileText size={16} className="mb-1" />
                    <span className="text-xs font-bold text-center leading-tight">
                      補填紀錄
                      <br />
                      Notes
                    </span>
                  </button>
                );
              } else if (canFillNote) {
                return (
                  <button
                    onClick={() => handleOpenNotesModal(cls)}
                    className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-500 hover:bg-green-50 hover:text-green-600 transition"
                  >
                    <FileText size={16} className="mb-1" />
                    <span className="text-xs font-bold text-center leading-tight">
                      課堂紀錄
                      <br />
                      Notes
                    </span>
                  </button>
                );
              } else {
                return (
                  <button
                    disabled
                    title="上課開始後才能填寫"
                    className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-300 cursor-not-allowed"
                  >
                    <FileText size={16} className="mb-1" />
                    <span className="text-xs font-bold text-center leading-tight">
                      課堂紀錄
                      <br />
                      Notes
                    </span>
                  </button>
                );
              }
            })()}
            {/* 學生簽到（動態按鈕） */}
            {renderCheckinButton()}

            {/* 異常回報 */}
            <button
              onClick={() =>
                setReportModal({
                  isOpen: true,
                  classId: cls.id,
                  classDate: cls.class_date.split("T")[0],
                  startTime: cls.start_time.substring(0, 5),
                  endTime: cls.end_time.substring(0, 5),
                })
              }
              className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
            >
              <Flag size={16} className="mb-1" />
              <span className="text-xs font-bold">異常回報</span>
            </button>
          </div>
        </div>
      );
    };

    return (
      <main className="flex-grow flex flex-col gap-6 animate-fade-in max-w-3xl">
        {/* 即將上課 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-600 px-6 py-3 border-b border-slate-700/20">
            <h2 className="text-sm font-bold text-white tracking-wider">
              即將上課 Upcoming Class
            </h2>
          </div>
          <div className="p-6 bg-slate-50/50">
            {upcomingClass ? (
              renderClassCard(upcomingClass, "upcoming")
            ) : (
              <div className="text-center py-8 text-slate-500 font-medium">
                目前沒有即將到來的課程
                <br />
                <span className="text-sm">(No upcoming classes)</span>
              </div>
            )}
          </div>
        </div>

        {/* 未來上課 */}
        {futureClasses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-white px-6 py-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-600 tracking-wider">
                未來上課 Future Classes
              </h2>
            </div>
            <div className="p-6 flex flex-col gap-4 bg-slate-50/30">
              {futureClasses.map((cls) => renderClassCard(cls, "normal"))}
            </div>
          </div>
        )}

        {/* 過去上課 */}
        {pastClasses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-white px-6 py-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-600 tracking-wider">
                過去上課 Past Classes
              </h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {pastClasses.map((cls) => renderClassCard(cls, "past"))}
            </div>
          </div>
        )}
      </main>
    );
  };

  // --- 介面 2：我的老師 ---
  const renderMyTutor = () => {
    if (userInfo.matched_tutor_id && matchedTutor) {
      const times =
        typeof matchedTutor.available_times === "string"
          ? JSON.parse(matchedTutor.available_times)
          : matchedTutor.available_times || { days: [], slots: [] };
      return (
        <main className="flex-grow animate-fade-in">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-green-500 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block">
                  🎉 配對成功 Matched!
                </span>
                <h2 className="text-2xl font-bold">
                  Your Tutor: {matchedTutor.english_name}
                </h2>
              </div>
              <CheckCircle size={48} className="text-white/80" />
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-1">
                  中文姓名 Chinese Name
                </h4>
                <p className="font-bold text-slate-800 text-lg mb-4">
                  {matchedTutor.chinese_name || "未提供"}
                </p>
                <h4 className="text-sm font-bold text-slate-400 mb-1">
                  性別 Gender
                </h4>
                <p className="font-medium text-slate-700 mb-4">
                  {matchedTutor.gender === "male"
                    ? "男 Male"
                    : matchedTutor.gender === "female"
                      ? "女 Female"
                      : matchedTutor.gender === "other"
                        ? "非二元性別 Non-binary"
                        : "未提供"}
                </p>
                <h4 className="text-sm font-bold text-slate-400 mb-1">
                  身分別 / 系所 Status & Department
                </h4>
                <p className="font-medium text-slate-700 mb-4">
                  {matchedTutor.student_status} - {matchedTutor.department}
                </p>
                <h4 className="text-sm font-bold text-slate-400 mb-1">
                  Email 聯絡方式
                </h4>
                <p className="font-medium text-primary hover:underline cursor-pointer">
                  {matchedTutor.email || "未提供 Email"}
                </p>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-700 flex items-center mb-3">
                  <Clock size={18} className="mr-2 text-primary" />{" "}
                  老師可上課時間 Available Times
                </h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {times.days &&
                    times.days.map((d) => (
                      <span
                        key={d}
                        className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-md"
                      >
                        {DAYS_MAP[d] || d}
                      </span>
                    ))}
                  {times.slots &&
                    times.slots.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-md"
                      >
                        {s}
                      </span>
                    ))}
                </div>
                <h4 className="font-bold text-slate-700 flex items-center mb-2 mt-6">
                  <BookOpen size={18} className="mr-2 text-orange-500" />{" "}
                  教學強項 Teaching Notes
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  {matchedTutor.teaching_notes || "老師尚未填寫備註"}
                </p>
              </div>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="flex-grow animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full min-h-[600px]">
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-100">
            <h2 className="font-bold text-lg text-slate-800 flex items-center">
              <Bell size={22} className="mr-2 text-primary" /> 收到的邀請 Tutor
              Invitations
            </h2>
          </div>

          <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 bg-slate-50/50 flex-grow content-start">
            {requests.length > 0 ? (
              requests.map((req) => {
                const times =
                  typeof req.available_times === "string"
                    ? JSON.parse(req.available_times)
                    : req.available_times || { days: [], slots: [] };

                return (
                  <div
                    key={req.request_id}
                    className="bg-white rounded-xl border border-blue-100 p-6 shadow-sm hover:shadow-md transition flex flex-col relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                      New Invite
                    </div>
                    <div className="mb-4 pb-4 border-b border-slate-100 mt-2">
                      <h3 className="text-xl font-bold text-slate-800">
                        {req.english_name}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">
                        {req.chinese_name || "無中文名"} | {req.student_status}{" "}
                        - {req.department}
                      </p>
                    </div>
                    <div className="space-y-4 flex-grow">
                      <div>
                        <span className="text-xs font-bold text-slate-400 flex items-center mb-1.5">
                          <Clock size={14} className="mr-1" /> 老師可上課時間
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {times.days &&
                            times.days.map((d) => (
                              <span
                                key={d}
                                className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded"
                              >
                                {DAYS_MAP[d]}
                              </span>
                            ))}
                          {times.slots &&
                            times.slots.map((s) => (
                              <span
                                key={s}
                                className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded"
                              >
                                {s}
                              </span>
                            ))}
                        </div>
                      </div>
                      {req.teaching_notes && (
                        <div>
                          <span className="text-xs font-bold text-slate-400 flex items-center mb-1.5">
                            <BookOpen size={14} className="mr-1" />{" "}
                            教學強項與備註
                          </span>
                          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic">
                            "{req.teaching_notes}"
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                      <button
                        onClick={() =>
                          handleRespond(
                            req.request_id,
                            req.tutor_user_id,
                            "reject",
                          )
                        }
                        className="flex-1 py-2 bg-slate-100 text-slate-500 font-bold rounded-lg hover:bg-red-50 hover:text-red-500 transition"
                      >
                        婉拒 Reject
                      </button>
                      <button
                        onClick={() =>
                          handleRespond(
                            req.request_id,
                            req.tutor_user_id,
                            "accept",
                          )
                        }
                        className="flex-1 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition shadow-sm"
                      >
                        ✅ 同意 Accept
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center text-slate-400 font-bold flex flex-col items-center">
                <UserCheck size={48} className="mb-4 text-slate-200" />
                目前還沒有收到老師的邀請喔！
                <br />
                (No invites yet. Please wait for a tutor to contact you.)
              </div>
            )}
          </div>
        </div>
      </main>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center space-x-8">
          <img src={logoImg} alt="Logo" className="h-8 w-auto object-contain" />
          <nav className="hidden md:flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${
                activeTab === "home"
                  ? "bg-white text-primary"
                  : "text-slate-500 hover:text-primary"
              }`}
            >
              首頁
            </button>
            <button
              onClick={() => setActiveTab("my-tutor")}
              className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${
                activeTab === "my-tutor"
                  ? "bg-white text-primary"
                  : "text-slate-500 hover:text-primary"
              }`}
            >
              我的老師
            </button>
            <button className="px-5 py-1.5 text-slate-500 font-medium hover:text-primary transition text-sm">
              紀錄
            </button>
            <button className="px-5 py-1.5 text-slate-500 font-medium hover:text-primary transition text-sm">
              紙本
            </button>
          </nav>
        </div>
        <div className="flex items-center space-x-5">
          <div className="relative">
            <div
              className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                {avatarInitial}
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full flex items-center px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary border-b border-slate-100"
                >
                  <User size={16} className="mr-3" /> 個人資訊
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition"
                >
                  <LogOut size={16} className="mr-3" /> 登出
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-6 gap-8">
        <aside className="w-full md:w-64 flex flex-col gap-6 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center text-lg">
              快速連結 Quick Links
            </h3>
            <ul className="space-y-2 text-sm font-medium">
              <li
                onClick={() => setActiveTab("home")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${
                  activeTab === "home"
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                }`}
              >
                <Home
                  size={20}
                  className={`mr-4 ${activeTab === "home" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                />
                首頁主控台
              </li>
              <li
                onClick={() => navigate("/profile")}
                className="flex items-center p-3 rounded-xl hover:bg-slate-50 hover:text-primary cursor-pointer transition group text-slate-600"
              >
                <User
                  size={20}
                  className="mr-4 text-slate-400 group-hover:text-primary"
                />
                個人資訊
              </li>
              <li
                onClick={() => setActiveTab("my-tutor")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${
                  activeTab === "my-tutor"
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                }`}
              >
                <UserCheck
                  size={20}
                  className={`mr-4 ${activeTab === "my-tutor" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                />
                我的老師
              </li>
              <li className="flex items-center p-3 rounded-xl hover:bg-slate-50 hover:text-primary cursor-pointer transition group text-slate-600">
                <Bell
                  size={20}
                  className="mr-4 text-slate-400 group-hover:text-primary"
                />
                通知 Notifications
              </li>
            </ul>
          </div>
        </aside>

        {activeTab === "home" ? renderHome() : renderMyTutor()}
      </div>

      {/* ✨ 補簽到 Modal */}
      {makeupModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-lg text-slate-800">補簽到申請</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  剩餘次數：
                  <span
                    className={`font-bold ${makeupRemaining <= 1 ? "text-red-500" : "text-primary"}`}
                  >
                    {makeupRemaining} / 5
                  </span>
                </p>
              </div>
              <button
                onClick={() => setMakeupModal({ isOpen: false, classId: null })}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleMakeupCheckin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  說明原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={makeupReason}
                  onChange={(e) => setMakeupReason(e.target.value)}
                  placeholder="請說明無法在當天簽到的原因... (Please explain why you couldn't check in on that day)"
                  required
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  附件證明{" "}
                  <span className="text-slate-400 font-normal">
                    （選填 Optional）
                  </span>
                </label>
                <input
                  type="file"
                  onChange={(e) => setMakeupFile(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setMakeupModal({ isOpen: false, classId: null })
                  }
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  取消 Cancel
                </button>
                <button
                  type="submit"
                  disabled={makeupRemaining <= 0}
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  送出申請 Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✨ 課堂紀錄 Modal */}
      {notesModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center">
                  <FileText className="mr-2 text-primary" size={20} />
                  {notesModal.isDeadlinePassed
                    ? "補填課堂紀錄申請"
                    : "課堂紀錄"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {notesModal.classDate}　{notesModal.startTime} ~{" "}
                  {notesModal.endTime}
                </p>
                {/* ✨ 超過截止時間才顯示剩餘次數 */}
                {notesModal.isDeadlinePassed && (
                  <p className="text-xs mt-1">
                    剩餘補填次數：
                    <span
                      className={`font-bold ${notesRemaining <= 1 ? "text-red-500" : "text-primary"}`}
                    >
                      {notesRemaining} / 5
                    </span>
                  </p>
                )}
              </div>
            </div>
            <form
              onSubmit={handleNotesSubmit}
              className="p-6 space-y-4 overflow-y-auto flex-grow"
            >
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  上課時間 Time
                </label>
                <div className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-500 text-sm">
                  {notesModal.classDate}　{notesModal.startTime} ~{" "}
                  {notesModal.endTime}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  上課地點 Location
                </label>
                <input
                  type="text"
                  value={notesForm.location}
                  onChange={(e) =>
                    setNotesForm({ ...notesForm, location: e.target.value })
                  }
                  placeholder="例如：圖書館 B1 / 線上 Zoom"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  上課內容 Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={notesForm.content}
                  onChange={(e) =>
                    setNotesForm({ ...notesForm, content: e.target.value })
                  }
                  placeholder="請描述本次上課的主題與內容... (Please describe what was covered in this session)"
                  required
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  備註 Remarks{" "}
                  <span className="text-slate-400 font-normal">
                    （選填 Optional）
                  </span>
                </label>
                <textarea
                  value={notesForm.remarks}
                  onChange={(e) =>
                    setNotesForm({ ...notesForm, remarks: e.target.value })
                  }
                  placeholder="其他補充說明... (Additional notes)"
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  附件 Attachment{" "}
                  <span className="text-slate-400 font-normal">
                    （選填 Optional）
                  </span>
                </label>
                {existingNote?.attachment_file && (
                  <p className="text-xs text-slate-500 mb-1">
                    目前附件：
                    <span className="text-primary font-medium">
                      {existingNote.attachment_file}
                    </span>
                  </p>
                )}
                <input
                  type="file"
                  onChange={(e) =>
                    setNotesForm({ ...notesForm, file: e.target.files[0] })
                  }
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setNotesModal({ ...notesModal, isOpen: false })
                  }
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  取消 Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition shadow-sm"
                >
                  {existingNote ? "更新紀錄 Update" : "儲存紀錄 Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reportModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center">
                  <Flag className="mr-2 text-red-500" size={20} /> 異常回報
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {reportModal.classDate}　{reportModal.startTime} ~{" "}
                  {reportModal.endTime}
                </p>
              </div>
              <button
                onClick={() =>
                  setReportModal({
                    isOpen: false,
                    classId: null,
                    classDate: "",
                    startTime: "",
                    endTime: "",
                  })
                }
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleReportSubmit}
              className="p-6 space-y-4 overflow-y-auto flex-grow"
            >
              {/* 時間（唯讀） */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  上課時間 Time
                </label>
                <div className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-500 text-sm">
                  {reportModal.classDate}　{reportModal.startTime} ~{" "}
                  {reportModal.endTime}
                </div>
              </div>

              {/* 回報類型 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  回報類型 Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={reportForm.reportType}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, reportType: e.target.value })
                  }
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm bg-white"
                >
                  <option value="">請選擇類型...</option>
                  <option value="student_absent">
                    學生未出席 Student Absent
                  </option>
                  <option value="tutor_absent">老師未出席 Tutor Absent</option>
                  <option value="venue_issue">場地問題 Venue Issue</option>
                  <option value="learning_issue">
                    學習進度問題 Learning Issue
                  </option>
                  <option value="safety">人身安全 Safety Concern</option>
                  <option value="other">其他 Other</option>
                </select>
              </div>

              {/* 地點 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  地點 Location
                </label>
                <input
                  type="text"
                  value={reportForm.location}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, location: e.target.value })
                  }
                  placeholder="例如：圖書館 B1 / 線上 Zoom"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                />
              </div>

              {/* 回報內容 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  回報內容 Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reportForm.content}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, content: e.target.value })
                  }
                  placeholder="請詳細描述發生的狀況... (Please describe the incident in detail)"
                  required
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm resize-none"
                />
              </div>

              {/* 附件 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  附件 Attachment{" "}
                  <span className="text-slate-400 font-normal">
                    （選填 Optional）
                  </span>
                </label>
                <input
                  type="file"
                  onChange={(e) =>
                    setReportForm({ ...reportForm, file: e.target.files[0] })
                  }
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-red-50 file:text-red-500 hover:file:bg-red-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setReportModal({
                      isOpen: false,
                      classId: null,
                      classDate: "",
                      startTime: "",
                      endTime: "",
                    })
                  }
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  取消 Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition shadow-sm"
                >
                  送出回報 Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 flex justify-between items-center text-sm text-slate-500 mt-auto">
        <div>© 2026 華語系 保留所有權利。</div>
        <div className="text-slate-500 font-medium hidden md:block">
          臺師大華語系
        </div>
      </footer>
    </div>
  );
}

export default TuteeDashboard;
