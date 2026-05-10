import React, { useState, useEffect } from "react";
import {
  Home,
  UserCheck,
  FileText,
  Bell,
  MessageSquare,
  ChevronDown,
  User,
  Globe,
  LogOut,
  FileEdit,
  FileCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  Award,
  ListTodo,
  HelpCircle,
  Search,
  Filter,
  Send,
  Calendar,
  Plus,
  X,
  Edit,
  CheckSquare,
  Flag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoImg from "./assets/csl-Logo.png";

const DAYS_MAP = { Mon: "一", Tue: "二", Wed: "三", Thu: "四", Fri: "五" };
const SKILL_MAP = {
  listening: "聽力",
  speaking: "口說",
  reading: "閱讀",
  writing: "寫作",
};

function TutorDashboard() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("tutorActiveTab") || "home",
  );
  const [userInfo, setUserInfo] = useState({
    account: "",
    chineseName: "",
    englishName: "",
    role: "tutor",
    certificationStatus: "pending",
    certificationFile: "",
    id: null,
    matched_tutee_id: null,
  });

  const [tuteesList, setTuteesList] = useState([]);
  const [filterLevel, setFilterLevel] = useState("All");
  const [matchedTutee, setMatchedTutee] = useState(null);

  // 補簽到相關 state
  const [makeupModal, setMakeupModal] = useState({
    isOpen: false,
    classId: null,
  });
  const [makeupReason, setMakeupReason] = useState("");
  const [makeupFile, setMakeupFile] = useState(null);
  const [makeupRemaining, setMakeupRemaining] = useState(5);

  // 課堂紀錄相關 state
  const [notesModal, setNotesModal] = useState({
    isOpen: false,
    classId: null,
    classDate: "",
    startTime: "",
    endTime: "",
    isDeadlinePassed: false,
  });
  const [notesForm, setNotesForm] = useState({
    location: "",
    content: "",
    remarks: "",
    file: null,
  });
  const [existingNote, setExistingNote] = useState(null);
  const [notesRemaining, setNotesRemaining] = useState(5);

  const [classes, setClasses] = useState([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [slots, setSlots] = useState([
    { date: "", startTime: "14:00", endTime: "15:00" },
  ]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [endDate, setEndDate] = useState("");

  const [editClassModal, setEditClassModal] = useState({
    isOpen: false,
    classId: null,
    date: "",
    startTime: "",
    endTime: "",
  });

  const [hasSentAlert, setHasSentAlert] = useState(false);

  // ── 輔導時數相關 state ──────────────────────────────
  const [hoursData, setHoursData] = useState([]);
  const [approvedHours, setApprovedHours] = useState(0);
  const [certStatus, setCertStatus] = useState(null);

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
          body: JSON.stringify({ userId: userInfo.user_id, role: "tutor" }),
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) setHasSentAlert(true);
    } catch (err) {
      alert("連線錯誤");
    }
  };

  // --- fetch functions ---
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

  // ── 輔導時數 fetch ──────────────────────────────────
  const fetchHours = (userId) => {
    fetch(`http://localhost:3001/api/tutor/hours/${userId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setHoursData(result.data);
          setApprovedHours(result.approvedHours || 0);
        }
      });
  };

  const fetchCertStatus = (userId) => {
    fetch(`http://localhost:3001/api/tutor/certificate-status/${userId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) setCertStatus(result.data.status);
      });
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
              matched_tutee_id: result.data.matched_tutee_id,
            });
            if (result.data.matched_tutee_id)
              fetchMatchedTutee(result.data.matched_tutee_id);
            if (result.data.user_id) {
              fetchClasses(result.data.user_id);
              fetchMakeupRemaining(result.data.user_id);
              fetchNotesRemaining(result.data.user_id);
              // ── 新增 ──
              fetchHours(result.data.user_id);
              fetchCertStatus(result.data.user_id);
            }
          }
        });
      fetchTutees();
    } else {
      navigate("/");
    }
  }, [navigate]);

  const fetchTutees = () =>
    fetch("http://localhost:3001/api/match/tutees")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setTuteesList(result.data);
      });

  const fetchMatchedTutee = (tuteeId) =>
    fetch(`http://localhost:3001/api/match/tutee-info/${tuteeId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setMatchedTutee(result.data);
      });

  const fetchClasses = (userId) =>
    fetch(`http://localhost:3001/api/classes/${userId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setClasses(result.data);
      });

  useEffect(() => {
    sessionStorage.setItem("tutorActiveTab", activeTab);
  }, [activeTab]);

  const avatarInitial = userInfo.englishName
    ? userInfo.englishName.charAt(0).toUpperCase()
    : "T";
  const displayName = userInfo.chineseName
    ? `${userInfo.chineseName} ${userInfo.englishName}`
    : userInfo.englishName || "Tutor Name";

  const handleLogout = () => {
    localStorage.removeItem("loggedInAccount");
    navigate("/");
  };

  const handleSendRequest = async (tuteeUserId, tuteeName) => {
    if (!window.confirm(`確定要向 ${tuteeName} 發送輔導邀請嗎？`)) return;
    try {
      const res = await fetch("http://localhost:3001/api/match/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorAccount: userInfo.account, tuteeUserId }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) fetchTutees();
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
    formData.append("role", "tutor");
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

  const handleAddSlot = () =>
    setSlots([...slots, { date: "", startTime: "14:00", endTime: "15:00" }]);
  const handleRemoveSlot = (index) =>
    setSlots(slots.filter((_, i) => i !== index));
  const handleSlotChange = (index, field, value) => {
    const newSlots = [...slots];
    newSlots[index][field] = value;
    setSlots(newSlots);
  };

  const getWeekdayString = (dateString) => {
    if (!dateString) return "";
    const [y, m, d] = dateString.split("-");
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return weekdays[new Date(y, m - 1, d).getDay()];
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    for (const slot of slots)
      if (!slot.date || !slot.startTime || !slot.endTime)
        return alert("請填寫所有時段的日期與時間！");
    if (isRecurring && !endDate) return alert("請選擇重複結束的日期！");

    let totalHours = 0;
    slots.forEach((slot) => {
      const start = new Date(`1970-01-01T${slot.startTime}`);
      const end = new Date(`1970-01-01T${slot.endTime}`);
      const diff = (end - start) / (1000 * 60 * 60);
      if (diff > 0) totalHours += diff;
    });

    if (totalHours > 2)
      return alert(
        `⚠️ 每週輔導時間不可超過 2 小時！\n(您目前安排了 ${totalHours} 小時)`,
      );
    if (totalHours <= 0)
      return alert("時間設定有誤，結束時間必須晚於開始時間！");

    try {
      const res = await fetch("http://localhost:3001/api/classes/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorAccount: userInfo.account,
          tuteeUserId: userInfo.matched_tutee_id,
          slots,
          isRecurring,
          endDate,
        }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setIsScheduleModalOpen(false);
        setSlots([{ date: "", startTime: "14:00", endTime: "15:00" }]);
        setIsRecurring(false);
        setEndDate("");
        fetchClasses(userInfo.user_id);
      }
    } catch (error) {
      alert("連線錯誤");
    }
  };

  const handleEditClassSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `http://localhost:3001/api/classes/${editClassModal.classId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classDate: editClassModal.date,
            startTime: editClassModal.startTime,
            endTime: editClassModal.endTime,
          }),
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setEditClassModal({
          isOpen: false,
          classId: null,
          date: "",
          startTime: "",
          endTime: "",
        });
        fetchClasses(userInfo.user_id);
      }
    } catch (error) {
      alert("連線錯誤");
    }
  };

  const handleCheckin = async (classId) => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/classes/${classId}/checkin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "tutor" }),
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) fetchClasses(userInfo.user_id);
    } catch (err) {
      alert("連線錯誤");
    }
  };

  const handleMakeupCheckin = async (e) => {
    e.preventDefault();
    if (!makeupReason.trim()) return alert("請填寫說明原因");
    const formData = new FormData();
    formData.append("userId", userInfo.user_id);
    formData.append("role", "tutor");
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
        fetchMakeupRemaining(userInfo.user_id);
      }
    } catch (err) {
      alert("連線錯誤");
    }
  };

  const handleOpenNotesModal = async (cls) => {
    const dateStr = cls.class_date.split("T")[0];
    const [year, month, day] = dateStr.split("-").map(Number);
    const displayDate = new Date(year, month - 1, day);
    const deadline = new Date(`${dateStr}T23:59:59`);
    const isDeadlinePassed = new Date() > deadline;

    setNotesModal({
      isOpen: true,
      classId: cls.id,
      classDate: dateStr,
      startTime: cls.start_time.substring(0, 5),
      endTime: cls.end_time.substring(0, 5),
      isDeadlinePassed,
    });

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

  const handleNotesSubmit = async (e) => {
    e.preventDefault();
    if (!notesForm.content.trim()) return alert("請填寫上課內容！");

    const formData = new FormData();
    formData.append("userId", userInfo.user_id);
    formData.append("role", "tutor");
    formData.append("location", notesForm.location);
    formData.append("content", notesForm.content);
    formData.append("remarks", notesForm.remarks);
    if (notesForm.file) formData.append("attachment", notesForm.file);

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
        fetchClasses(userInfo.user_id);
      }
    } catch (err) {
      alert("連線錯誤");
    }
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
      const [year, month, day] = dateStr.split("-").map(Number);
      const displayDate = new Date(year, month - 1, day);
      const isPast = type === "past";
      const isUpcoming = type === "upcoming";

      return (
        <div
          key={cls.id}
          className={`p-5 rounded-xl border flex flex-col gap-4 transition group ${isPast ? "bg-slate-50 border-slate-200 opacity-80" : "bg-white border-slate-100 shadow-sm hover:border-primary/30 hover:shadow-md"}`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center mr-4 flex-shrink-0 ${isPast ? "bg-slate-200 text-slate-500" : "bg-blue-50 border border-blue-100 text-blue-600"}`}
              >
                <span className="text-[10px] font-bold uppercase">
                  {displayDate.toLocaleDateString("en-US", { month: "short" })}
                </span>
                <span className="text-lg font-black leading-none">
                  {displayDate.getDate()}
                </span>
              </div>
              <div>
                <p
                  className={`font-bold ${isPast ? "text-slate-600" : "text-slate-800"} text-lg`}
                >
                  {matchedTutee
                    ? matchedTutee.chinese_name || matchedTutee.english_name
                    : "學生未載入"}
                </p>
                <p className="text-sm font-medium text-slate-500 flex items-center mt-1">
                  <Clock size={14} className="mr-1.5" />{" "}
                  {cls.start_time.substring(0, 5)} ~{" "}
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

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
            {!isPast ? (
              <button
                onClick={() =>
                  setEditClassModal({
                    isOpen: true,
                    classId: cls.id,
                    date: dateStr,
                    startTime: cls.start_time.substring(0, 5),
                    endTime: cls.end_time.substring(0, 5),
                  })
                }
                className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
              >
                <Edit size={16} className="mb-1" />
                <span className="text-xs font-bold">編輯時間</span>
              </button>
            ) : (
              <button
                disabled
                className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-300 cursor-not-allowed"
              >
                <Edit size={16} className="mb-1" />
                <span className="text-xs font-bold">不可編輯</span>
              </button>
            )}

            {(() => {
              const deadline = new Date(`${dateStr}T23:59:59`);
              const nowTime = new Date();
              const isSigned = !!cls.tutor_signed_at;
              const isDeadlinePassed = nowTime > deadline;
              const classStart = new Date(`${dateStr}T${cls.start_time}`);
              const windowStart = new Date(
                classStart.getTime() - 30 * 60 * 1000,
              );
              const canCheckin = nowTime >= windowStart && !isDeadlinePassed;

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
                    onClick={() =>
                      setMakeupModal({ isOpen: true, classId: cls.id })
                    }
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
                    className={`flex flex-col items-center justify-center py-2 rounded-lg transition ${canCheckin ? "text-slate-500 hover:bg-orange-50 hover:text-orange-600" : "text-slate-300 cursor-not-allowed"}`}
                  >
                    <CheckSquare size={16} className="mb-1" />
                    <span className="text-xs font-bold">老師簽到</span>
                  </button>
                );
              }
            })()}

            {(() => {
              const dateStr = cls.class_date.split("T")[0];
              const deadline = new Date(`${dateStr}T23:59:59`);
              const isNoteDeadlinePassed = new Date() > deadline;

              if (cls.has_note) {
                return (
                  <button
                    onClick={() => handleOpenNotesModal(cls)}
                    className="flex flex-col items-center justify-center py-2 rounded-lg text-green-600 bg-green-50 transition"
                  >
                    <FileText size={16} className="mb-1" />
                    <span className="text-xs font-bold">已填寫 ✓</span>
                  </button>
                );
              } else if (isNoteDeadlinePassed) {
                return (
                  <button
                    onClick={() => handleOpenNotesModal(cls)}
                    className="flex flex-col items-center justify-center py-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                  >
                    <FileText size={16} className="mb-1" />
                    <span className="text-xs font-bold">補填紀錄</span>
                  </button>
                );
              } else {
                return (
                  <button
                    onClick={() => handleOpenNotesModal(cls)}
                    className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-500 hover:bg-green-50 hover:text-green-600 transition"
                  >
                    <FileText size={16} className="mb-1" />
                    <span className="text-xs font-bold">課堂紀錄</span>
                  </button>
                );
              }
            })()}

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
      <>
        <main className="flex-grow flex flex-col gap-6 animate-fade-in max-w-3xl">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-600 px-6 py-3 border-b border-slate-700/20">
              <h2 className="text-sm font-bold text-white tracking-wider">
                即將上課 Upcoming Class
              </h2>
            </div>
            <div className="p-6 bg-slate-50/50">
              {upcomingClass && matchedTutee ? (
                renderClassCard(upcomingClass, "upcoming")
              ) : (
                <div className="text-center py-8 text-slate-500 font-medium">
                  目前尚無即將到來的課程。
                </div>
              )}
            </div>
          </div>

          {futureClasses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-2">
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

          {pastClasses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-2">
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
        <aside className="hidden xl:flex w-72 flex-col gap-6 flex-shrink-0 animate-fade-in"></aside>
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
            <h3 className="font-bold text-slate-700 flex items-center text-lg">
              <Award className="mr-2 text-orange-500" size={20} /> 1. 資格證明
            </h3>
          </div>
          <div className="space-y-3">
            {userInfo.certification_file ? (
              <div className="p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between bg-white hover:shadow-md transition gap-4">
                <div className="flex items-center overflow-hidden">
                  <FileText
                    className="text-slate-400 mr-3 flex-shrink-0"
                    size={24}
                  />
                  <p className="font-bold text-slate-700 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                    {userInfo.certification_file}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {userInfo.certification_status === "pending" && (
                    <span className="px-4 py-1.5 bg-amber-100 text-amber-700 font-bold text-sm rounded-full flex items-center">
                      <Clock size={16} className="mr-1.5" /> 審查中
                    </span>
                  )}
                  {userInfo.certification_status === "approved" && (
                    <span className="px-4 py-1.5 bg-green-100 text-green-700 font-bold text-sm rounded-full flex items-center">
                      <CheckCircle size={16} className="mr-1.5" /> 已通過
                    </span>
                  )}
                  {userInfo.certification_status === "resubmit" && (
                    <span className="px-4 py-1.5 bg-red-100 text-red-700 font-bold text-sm rounded-full flex items-center">
                      <AlertCircle size={16} className="mr-1.5" /> 需補件
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 border-2 border-slate-100 border-dashed rounded-xl text-center">
                <p className="text-slate-400 text-sm font-medium">
                  尚未上傳資格證明
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );

  // --- 介面 3：尋找外籍生 ---
  const renderFindStudents = () => {
    const filteredTutees =
      filterLevel === "All"
        ? tuteesList
        : tuteesList.filter((t) => t.overall_level === filterLevel);
    return (
      <main className="flex-grow flex flex-col gap-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full min-h-[600px]">
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="font-bold text-lg text-slate-800 flex items-center">
              <Search size={22} className="mr-2 text-primary" /> 尋找外籍生
            </h2>
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-600">
              <Filter size={16} /> <span>程度篩選：</span>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary"
              >
                <option value="All">全部 (All)</option>
                <option value="不知道 (Unknown)">不知道 (Unknown)</option>
                <option value="N">N (零基礎)</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
              </select>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 bg-slate-50/50 flex-grow content-start">
            {filteredTutees.length > 0 ? (
              filteredTutees.map((tutee) => {
                const skills =
                  typeof tutee.target_skills === "string"
                    ? JSON.parse(tutee.target_skills)
                    : tutee.target_skills || {};
                const times =
                  typeof tutee.available_times === "string"
                    ? JSON.parse(tutee.available_times)
                    : tutee.available_times || { days: [], slots: [] };
                let btnState = "available";
                if (tutee.match_status === "accepted")
                  btnState = "matched_others";
                if (tutee.match_status === "pending")
                  btnState = "pending_others";
                return (
                  <div
                    key={tutee.tutee_user_id}
                    className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">
                            {tutee.nationality}
                          </span>
                          <h3 className="text-lg font-bold text-slate-800">
                            {tutee.englishName}
                          </h3>
                        </div>
                        <p className="text-sm text-slate-500 font-medium">
                          {tutee.chinese_name || "無中文名"} ({tutee.student_id}
                          )
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs text-slate-400 font-bold mb-0.5">
                          華語程度
                        </span>
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 font-black rounded-lg">
                          {tutee.overall_level}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4 flex-grow">
                      <div>
                        <span className="text-xs font-bold text-slate-400 flex items-center mb-1.5">
                          <Award size={14} className="mr-1" /> 想加強的技巧
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(skills).map(([k, v]) =>
                            v ? (
                              <span
                                key={k}
                                className="px-2.5 py-1 bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100 rounded-md"
                              >
                                {SKILL_MAP[k]}
                              </span>
                            ) : null,
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 flex items-center mb-1.5">
                          <Clock size={14} className="mr-1" /> 希望上課時間
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
                          {times.days &&
                            times.slots &&
                            times.days.length > 0 &&
                            times.slots.length > 0 && (
                              <span className="text-slate-300 font-bold px-1">
                                |
                              </span>
                            )}
                          {times.slots &&
                            times.slots.map((s) => (
                              <span
                                key={s}
                                className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded"
                              >
                                {s}
                              </span>
                            ))}
                          {(!times.days || times.days.length === 0) &&
                            (!times.slots || times.slots.length === 0) && (
                              <span className="text-slate-400 text-sm italic">
                                未設定時間
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">
                        學習時長：{tutee.learning_duration || "未提供"}
                      </span>
                      {btnState === "available" ? (
                        <button
                          onClick={() =>
                            handleSendRequest(
                              tutee.tutee_user_id,
                              tutee.englishName,
                            )
                          }
                          className="flex items-center px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition shadow-sm"
                        >
                          <Send size={16} className="mr-2" /> 👋 發送邀請
                        </button>
                      ) : btnState === "pending_others" ? (
                        <button
                          disabled
                          className="flex items-center px-4 py-2 bg-amber-50 text-amber-600 text-sm font-bold rounded-lg border border-amber-200 cursor-not-allowed"
                        >
                          ⏳ 洽談中
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex items-center px-4 py-2 bg-slate-100 text-slate-400 text-sm font-bold rounded-lg cursor-not-allowed"
                        >
                          ❌ 已配對
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
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

  // --- 介面 4：我的學生 ---
  const renderMyStudent = () => {
    if (userInfo.matched_tutee_id && matchedTutee) {
      const skills =
        typeof matchedTutee.target_skills === "string"
          ? JSON.parse(matchedTutee.target_skills)
          : matchedTutee.target_skills || {};
      const times =
        typeof matchedTutee.available_times === "string"
          ? JSON.parse(matchedTutee.available_times)
          : matchedTutee.available_times || { days: [], slots: [] };
      return (
        <main className="flex-grow animate-fade-in">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-green-500 px-8 py-6 text-white flex justify-between items-center">
              <div>
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-2 inline-block">
                  🎉 配對成功 Matched!
                </span>
                <h2 className="text-2xl font-bold">
                  Your Student: {matchedTutee.english_name}
                </h2>
              </div>
              <CheckCircle size={48} className="text-white/80" />
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-1">
                  中文 / 英文姓名
                </h4>
                <p className="font-bold text-slate-800 text-lg mb-4">
                  {matchedTutee.chinese_name || "未提供"} /{" "}
                  {matchedTutee.english_name}
                </p>
                <h4 className="text-sm font-bold text-slate-400 mb-1">
                  學號 / 系所
                </h4>
                <p className="font-medium text-slate-700 mb-4">
                  {matchedTutee.student_id} / {matchedTutee.department}
                </p>
                <h4 className="text-sm font-bold text-slate-400 mb-1">
                  國家 Nationality
                </h4>
                <p className="font-medium text-slate-700 mb-4">
                  {matchedTutee.nationality}
                </p>
                <h4 className="text-sm font-bold text-slate-400 mb-1">
                  聯絡方式 Email
                </h4>
                <p className="font-medium text-primary hover:underline cursor-pointer">
                  {matchedTutee.email || "未提供 Email"}
                </p>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex gap-6 mb-5 border-b border-slate-200 pb-5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 mb-1">
                      學習時長
                    </h4>
                    <p className="font-bold text-slate-700">
                      {matchedTutee.learning_duration}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 mb-1">
                      整體能力
                    </h4>
                    <p className="font-bold text-slate-700">
                      {matchedTutee.overall_level}
                    </p>
                  </div>
                </div>
                <h4 className="font-bold text-slate-700 flex items-center mb-3">
                  <Clock size={18} className="mr-2 text-primary" />{" "}
                  學生希望上課時間
                </h4>
                <div className="space-y-3 mb-6 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 mb-2 block">
                      📅 星期 Days
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {times.days &&
                        times.days.map((d) => (
                          <span
                            key={d}
                            className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-sm font-bold rounded-md"
                          >
                            {DAYS_MAP[d] || d}
                          </span>
                        ))}
                      {(!times.days || times.days.length === 0) && (
                        <span className="text-slate-400 text-sm italic">
                          未設定
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400 mb-2 block">
                      ⏰ 時段 Time Slots
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {times.slots &&
                        times.slots.map((s) => (
                          <span
                            key={s}
                            className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-sm font-bold rounded-md"
                          >
                            {s}
                          </span>
                        ))}
                      {(!times.slots || times.slots.length === 0) && (
                        <span className="text-slate-400 text-sm italic">
                          未設定
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <h4 className="font-bold text-slate-700 flex items-center mb-3">
                  <Award size={18} className="mr-2 text-orange-500" />{" "}
                  學生想加強的技巧
                </h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(skills).map(([k, v]) =>
                    v ? (
                      <span
                        key={k}
                        className="px-2.5 py-1 bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100 rounded-md"
                      >
                        {SKILL_MAP[k]}
                      </span>
                    ) : null,
                  )}
                </div>
                {matchedTutee.skills_to_improve && (
                  <div className="mt-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 mb-1.5 block">
                      備註 Notes
                    </span>
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      "{matchedTutee.skills_to_improve}"
                    </p>
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
        <h3 className="text-xl font-bold text-slate-700 mb-3">
          尚未配對到學生
        </h3>
        <p className="text-slate-500 text-center max-w-sm mb-6 leading-relaxed">
          您目前還沒有專屬的外籍生。
          <br />
          請主動去尋找適合您的學生，並向他們發出輔導邀請吧！
        </p>
        <button
          onClick={() => setActiveTab("find-students")}
          className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-sm hover:bg-primary-dark transition flex items-center"
        >
          <Search size={18} className="mr-2" /> 前往尋找學生
        </button>
      </main>
    );
  };

  // --- 介面 5：課表 ---
  const renderSchedule = () => (
    <main className="flex-grow w-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in flex flex-col">
      <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
        <h2 className="font-bold text-lg text-slate-800 flex items-center">
          <Calendar size={22} className="mr-2 text-primary" /> 專屬課表 My
          Schedule
        </h2>
      </div>
      <div className="p-8 flex-grow flex flex-col gap-8">
        <div>
          <h3 className="text-sm font-bold text-slate-500 mb-4">
            選擇學生安排課程
          </h3>
          {!matchedTutee ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
              尚未配對學生，請先至「尋找學生」發送邀請。
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-primary/30 transition gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {matchedTutee.english_name
                    ? matchedTutee.english_name.charAt(0).toUpperCase()
                    : "S"}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">
                    {matchedTutee.chinese_name || "未提供"} /{" "}
                    {matchedTutee.english_name}
                  </h4>
                  <p className="text-sm text-slate-500 font-medium">
                    {matchedTutee.student_id} | 程度:{" "}
                    {matchedTutee.overall_level}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center text-sm font-bold text-white bg-primary hover:bg-primary-dark px-5 py-2.5 rounded-lg transition shadow-sm"
              >
                <Plus size={16} className="mr-1.5" /> 安排上課
              </button>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-500 mb-4">
            已排定課程 Scheduled Classes
          </h3>
          {classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Calendar size={48} className="mb-3 text-slate-300" />
              <p className="font-bold text-slate-600">目前沒有任何課程</p>
              <p className="text-sm mt-1">
                請點擊上方「安排上課」按鈕為學生排課
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map((cls, index) => {
                const dateStr = cls.class_date.split("T")[0];
                const now = new Date();
                const classEndTime = new Date(`${dateStr}T${cls.end_time}`);
                const isPast = classEndTime < now;
                return (
                  <div
                    key={cls.id}
                    className={`flex items-center p-4 border rounded-xl shadow-sm transition group ${isPast ? "bg-slate-50 border-slate-200 opacity-75" : "bg-white border-slate-100 hover:bg-slate-50"}`}
                  >
                    <div
                      className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center mr-6 flex-shrink-0 ${isPast ? "bg-slate-200 text-slate-500" : "bg-blue-50 border border-blue-100 text-blue-600"}`}
                    >
                      {(() => {
                        const [y, m, d] = dateStr.split("-").map(Number);
                        const displayDate = new Date(y, m - 1, d);
                        return (
                          <>
                            <span className="text-xs font-bold uppercase">
                              {displayDate.toLocaleDateString("en-US", {
                                month: "short",
                              })}
                            </span>
                            <span className="text-xl font-black">
                              {displayDate.getDate()}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-slate-800 text-lg">
                        華語輔導課程 - 第 {index + 1} 堂
                      </h4>
                      <p className="text-slate-500 font-medium flex items-center mt-1">
                        <Clock size={14} className="mr-1.5 text-slate-400" />{" "}
                        {cls.start_time.substring(0, 5)} ~{" "}
                        {cls.end_time.substring(0, 5)}
                      </p>
                    </div>
                    {isPast ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          disabled
                          className="p-2 text-slate-300 cursor-not-allowed rounded-lg mr-2"
                        >
                          <Edit size={18} />
                        </button>
                        <div className="px-4 py-1.5 bg-slate-100 text-slate-400 font-bold text-sm rounded-lg border border-slate-200">
                          已結束
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() =>
                            setEditClassModal({
                              isOpen: true,
                              classId: cls.id,
                              date: dateStr,
                              startTime: cls.start_time.substring(0, 5),
                              endTime: cls.end_time.substring(0, 5),
                            })
                          }
                          className="p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition mr-2"
                        >
                          <Edit size={18} />
                        </button>
                        <div className="px-4 py-1.5 bg-amber-50 text-amber-600 font-bold text-sm rounded-lg border border-amber-200">
                          即將到來
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                <Calendar className="mr-2 text-primary" size={20} />{" "}
                安排上課時間
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={handleScheduleSubmit}
              className="p-6 overflow-y-auto flex-grow"
            >
              <div className="space-y-5">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-slate-700">
                    設定上課時段 <span className="text-red-500">*</span>
                  </h4>
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md">
                    一週最多 2 小時
                  </span>
                </div>
                {slots.map((slot, index) => {
                  const weekdayStr = getWeekdayString(slot.date);
                  return (
                    <div
                      key={index}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative"
                    >
                      {slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(index)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                        >
                          <X size={16} />
                        </button>
                      )}
                      <div className="mb-3">
                        <label className="flex items-center text-xs font-bold text-slate-500 mb-1">
                          上課日期 Date
                          {weekdayStr && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] tracking-widest shadow-sm">
                              星期{weekdayStr}
                            </span>
                          )}
                        </label>
                        <input
                          type="date"
                          value={slot.date}
                          onChange={(e) =>
                            handleSlotChange(index, "date", e.target.value)
                          }
                          required
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            開始 Start
                          </label>
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) =>
                              handleSlotChange(
                                index,
                                "startTime",
                                e.target.value,
                              )
                            }
                            required
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">
                            結束 End
                          </label>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) =>
                              handleSlotChange(index, "endTime", e.target.value)
                            }
                            required
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {slots.length < 2 && (
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="flex items-center text-sm font-bold text-primary hover:text-primary-dark transition bg-primary/10 px-4 py-2 rounded-lg w-full justify-center border border-primary/20"
                  >
                    <Plus size={16} className="mr-1" /> 新增一天 (Add another
                    day)
                  </button>
                )}
                <div className="pt-5 border-t border-slate-100">
                  <label className="flex items-center space-x-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="font-bold text-slate-700">
                      每週重複此課表 (Recurring Weekly)
                    </span>
                  </label>
                  {isRecurring && (
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                      <label className="block text-sm font-bold text-slate-700 mb-1">
                        重複直到哪一天？ End Date{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required={isRecurring}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition shadow-md flex justify-center items-center"
                >
                  <CheckCircle size={18} className="mr-1.5" /> 確定排課
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );

  // --- 介面 6：輔導時數 ─────────────────────────────────────
  const renderHours = () => {
    const TARGET_HOURS = 100;
    const pct = Math.min((approvedHours / TARGET_HOURS) * 100, 100);

    const rows = hoursData.map((r) => {
      const hasSigned = !!r.tutor_signed_at;
      const hasNote = !!r.note_id;
      const hrs = parseFloat(r.hours || 0);
      const dateStr = r.class_date;
      const [y, m, d] = dateStr.split("-").map(Number);
      const displayDate = new Date(y, m - 1, d);
      return { ...r, hasSigned, hasNote, hrs, displayDate };
    });

    const handleSubmitForReview = async (classId) => {
      if (!window.confirm("確認送出此堂課的時數審查？")) return;
      try {
        const res = await fetch(
          `http://localhost:3001/api/tutor/hours/submit/${classId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: userInfo.user_id }),
          },
        );
        const data = await res.json();
        alert(data.message);
        if (data.success) fetchHours(userInfo.user_id);
      } catch {
        alert("連線錯誤");
      }
    };

    const handleApplyCert = async () => {
      if (!window.confirm("確認申請實習時數證明？申請後請等待管理員審核。"))
        return;
      try {
        const res = await fetch(
          "http://localhost:3001/api/tutor/apply-certificate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: userInfo.user_id }),
          },
        );
        const data = await res.json();
        alert(data.message);
        if (data.success) fetchCertStatus(userInfo.user_id);
      } catch {
        alert("連線錯誤");
      }
    };

    const statusBadge = (row) => {
      if (row.review_status === "approved")
        return (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1 w-fit">
            <CheckCircle size={12} /> 已核准
          </span>
        );
      if (row.review_status === "pending")
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1 w-fit">
            <Clock size={12} /> 審查中
          </span>
        );
      if (row.review_status === "rejected")
        return (
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1 w-fit">
            <AlertCircle size={12} /> 未通過
          </span>
        );
      // 還沒送審
      if (row.hasSigned && row.hasNote)
        return (
          <button
            onClick={() => handleSubmitForReview(row.class_id)}
            className="px-2.5 py-1 bg-blue-500 text-white text-xs font-bold rounded-full hover:bg-blue-600 transition w-fit"
          >
            送出審查
          </button>
        );
      return (
        <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full w-fit">
          {!row.hasSigned && !row.hasNote
            ? "需簽到＋填紀錄"
            : !row.hasSigned
              ? "需完成簽到"
              : "需填寫紀錄"}
        </span>
      );
    };

    const certButton = () => {
      if (certStatus === "issued")
        return (
          <div className="flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 font-bold rounded-xl border border-green-200">
            <CheckCircle size={18} /> 證書已核發，請聯絡助教領取
          </div>
        );
      if (certStatus === "pending")
        return (
          <div className="flex items-center gap-2 px-6 py-3 bg-amber-100 text-amber-700 font-bold rounded-xl border border-amber-200">
            <Clock size={18} /> 申請審核中，請靜候通知
          </div>
        );
      return (
        <button
          onClick={handleApplyCert}
          disabled={approvedHours < TARGET_HOURS}
          className={`px-6 py-3 font-bold rounded-xl transition shadow-md flex items-center gap-2 ${
            approvedHours >= TARGET_HOURS
              ? "bg-primary text-white hover:bg-primary-dark"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Award size={18} />
          申請實習時數證明
          {approvedHours < TARGET_HOURS && (
            <span className="text-xs font-normal ml-1">
              （還差 {(TARGET_HOURS - approvedHours).toFixed(1)} 小時）
            </span>
          )}
        </button>
      );
    };

    return (
      <main className="flex-grow w-full flex flex-col gap-6 animate-fade-in">
        {/* 時數進度卡 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-500 px-8 py-5">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <Award size={20} /> 輔導時數累積
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              畢業條件：累積 100 小時輔導時數（需管理員審查通過）
            </p>
          </div>
          <div className="p-8">
            <div className="flex items-end gap-3 mb-5">
              <span className="text-6xl font-black text-slate-800 tabular-nums">
                {approvedHours.toFixed(1)}
              </span>
              <span className="text-2xl font-bold text-slate-400 mb-1.5">
                / {TARGET_HOURS} 小時
              </span>
              <span
                className={`ml-auto text-sm font-bold px-3 py-1.5 rounded-full ${
                  pct >= 100
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {pct >= 100 ? "🎉 已達標！" : `${pct.toFixed(1)}%`}
              </span>
            </div>
            {/* 進度條 */}
            <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden">
              <div
                className={`h-5 rounded-full transition-all duration-700 ${
                  pct >= 100 ? "bg-green-500" : "bg-primary"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-400 mt-2">
              <span>0 hr</span>
              <span>25 hr</span>
              <span>50 hr</span>
              <span>75 hr</span>
              <span>100 hr</span>
            </div>
          </div>
        </div>

        {/* 課堂時數明細 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <FileText size={18} className="text-primary" /> 課堂時數明細
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              共 {rows.length} 堂課
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-medium">
              <Calendar size={40} className="mx-auto mb-3 text-slate-200" />
              尚無任何課程紀錄
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* 表頭（桌面版） */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr] px-6 py-3 bg-slate-50/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>日期 / 時間</span>
                <span>時長</span>
                <span>老師簽到</span>
                <span>課堂紀錄</span>
                <span>審查狀態</span>
              </div>

              {rows.map((row) => (
                <div
                  key={row.class_id}
                  className={`grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1.5fr] px-6 py-4 items-center gap-3 transition ${
                    row.review_status === "approved"
                      ? "bg-green-50/40"
                      : row.review_status === "rejected"
                        ? "bg-red-50/20"
                        : "hover:bg-slate-50"
                  }`}
                >
                  {/* 日期 */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                        row.review_status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase">
                        {row.displayDate.toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </span>
                      <span className="text-sm font-black leading-none">
                        {row.displayDate.getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">
                        {row.class_date}
                      </p>
                      <p className="text-xs text-slate-400">
                        {row.start_time.substring(0, 5)} ~{" "}
                        {row.end_time.substring(0, 5)}
                      </p>
                    </div>
                  </div>

                  {/* 時長 */}
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-black text-xl ${
                        row.review_status === "approved"
                          ? "text-green-600"
                          : "text-slate-700"
                      }`}
                    >
                      {row.hrs.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">hr</span>
                  </div>

                  {/* 老師簽到 */}
                  <div>
                    {row.hasSigned ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                        <CheckCircle size={14} /> 已簽到
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                        <AlertCircle size={14} /> 未簽到
                      </span>
                    )}
                  </div>

                  {/* 課堂紀錄 */}
                  <div>
                    {row.hasNote ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                        <CheckCircle size={14} /> 已填寫
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                        <AlertCircle size={14} /> 未填寫
                      </span>
                    )}
                  </div>

                  {/* 審查狀態 */}
                  <div>{statusBadge(row)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 申請證書區 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Award size={20} className="text-primary" /> 申請實習時數證明
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              累積 100 小時審查通過後，即可送出申請，由管理員核發正式證明文件
            </p>
            {approvedHours > 0 && approvedHours < TARGET_HOURS && (
              <p className="text-xs text-amber-600 font-bold mt-2">
                ⏳ 目前已累積{" "}
                <span className="text-lg font-black">
                  {approvedHours.toFixed(1)}
                </span>{" "}
                小時，距離目標還差{" "}
                <span className="font-black">
                  {(TARGET_HOURS - approvedHours).toFixed(1)}
                </span>{" "}
                小時，加油！
              </p>
            )}
          </div>
          {certButton()}
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
            <button
              onClick={() => setActiveTab("home")}
              className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${activeTab === "home" ? "bg-white text-primary" : "text-slate-500 hover:text-primary"}`}
            >
              首頁
            </button>
            <button
              onClick={() => setActiveTab("find-students")}
              className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${activeTab === "find-students" ? "bg-white text-primary" : "text-slate-500 hover:text-primary"}`}
            >
              尋找學生
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${activeTab === "schedule" ? "bg-white text-primary" : "text-slate-500 hover:text-primary"}`}
            >
              課表
            </button>
            <button
              onClick={() => setActiveTab("hours")}
              className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${activeTab === "hours" ? "bg-white text-primary" : "text-slate-500 hover:text-primary"}`}
            >
              輔導時數
            </button>
          </nav>
        </div>
        <div className="flex items-center space-x-5">
          <button className="text-slate-400 hover:text-primary transition">
            <MessageSquare size={20} />
          </button>
          <button className="text-slate-400 hover:text-primary transition">
            <Bell size={20} />
          </button>
          <div className="relative">
            <div
              className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <div className="w-9 h-9 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                {avatarInitial}
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span
                    className="font-bold text-slate-800 truncate block w-36"
                    title={displayName}
                  >
                    {displayName}
                  </span>
                  <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold capitalize">
                    {userInfo.role}
                  </span>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => navigate("/profile")}
                    className="w-full flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary transition"
                  >
                    <User size={16} className="mr-3" /> 個人資訊
                  </button>
                </div>
                <div className="py-2 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition"
                  >
                    <LogOut size={16} className="mr-3" /> 登出
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-6 gap-8">
        <aside className="w-full md:w-64 flex flex-col gap-6 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center text-lg">
              快速連結
            </h3>
            <ul className="space-y-2 text-sm font-medium">
              <li
                onClick={() => setActiveTab("home")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === "home" ? "bg-primary/10 text-primary font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-primary"}`}
              >
                <Home
                  size={20}
                  className={`mr-4 ${activeTab === "home" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                />{" "}
                首頁主控台
              </li>
              <li
                onClick={() => navigate("/profile")}
                className="flex items-center p-3 rounded-xl hover:bg-slate-50 hover:text-primary cursor-pointer transition group text-slate-600"
              >
                <User
                  size={20}
                  className="mr-4 text-slate-400 group-hover:text-primary"
                />{" "}
                個人資訊
              </li>
              <li
                onClick={() => setActiveTab("my-student")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === "my-student" ? "bg-primary/10 text-primary font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-primary"}`}
              >
                <UserCheck
                  size={20}
                  className={`mr-4 ${activeTab === "my-student" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                />{" "}
                我的學生
              </li>
              <li
                onClick={() => setActiveTab("schedule")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === "schedule" ? "bg-primary/10 text-primary font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-primary"}`}
              >
                <Calendar
                  size={20}
                  className={`mr-4 ${activeTab === "schedule" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                />{" "}
                課表
              </li>
              {/* ── 新增：輔導時數 ── */}
              <li
                onClick={() => setActiveTab("hours")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === "hours" ? "bg-primary/10 text-primary font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-primary"}`}
              >
                <Award
                  size={20}
                  className={`mr-4 ${activeTab === "hours" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                />{" "}
                輔導時數
                {/* 進度小標籤 */}
                {approvedHours > 0 && approvedHours < 100 && (
                  <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                    {approvedHours.toFixed(0)}h
                  </span>
                )}
                {approvedHours >= 100 && (
                  <span className="ml-auto text-[10px] bg-green-100 text-green-600 font-bold px-2 py-0.5 rounded-full">
                    達標 ✓
                  </span>
                )}
              </li>
              <li
                onClick={() => setActiveTab("reviews")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === "reviews" ? "bg-primary/10 text-primary font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-primary"}`}
              >
                <FileCheck
                  size={20}
                  className={`mr-4 ${activeTab === "reviews" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                />{" "}
                審查結果
                {userInfo.certification_status === "resubmit" && (
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full shadow-sm"></span>
                )}
              </li>
              <li className="flex items-center p-3 rounded-xl hover:bg-slate-50 hover:text-primary cursor-pointer transition group text-slate-600">
                <Bell
                  size={20}
                  className="mr-4 text-slate-400 group-hover:text-primary"
                />{" "}
                通知
              </li>
            </ul>
          </div>
        </aside>

        {activeTab === "home"
          ? renderHome()
          : activeTab === "find-students"
            ? renderFindStudents()
            : activeTab === "my-student"
              ? renderMyStudent()
              : activeTab === "schedule"
                ? renderSchedule()
                : activeTab === "hours"
                  ? renderHours()
                  : renderReviews()}
      </div>

      {/* 編輯課程 Modal */}
      {editClassModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                <Edit className="mr-2 text-primary" size={20} /> 修改上課時間
              </h3>
              <button
                onClick={() =>
                  setEditClassModal({ ...editClassModal, isOpen: false })
                }
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditClassSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="flex items-center text-sm font-bold text-slate-700 mb-1">
                    上課日期 Date
                    {getWeekdayString(editClassModal.date) && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] tracking-widest shadow-sm">
                        星期{getWeekdayString(editClassModal.date)}
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={editClassModal.date}
                    onChange={(e) =>
                      setEditClassModal({
                        ...editClassModal,
                        date: e.target.value,
                      })
                    }
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      開始 Start
                    </label>
                    <input
                      type="time"
                      value={editClassModal.startTime}
                      onChange={(e) =>
                        setEditClassModal({
                          ...editClassModal,
                          startTime: e.target.value,
                        })
                      }
                      required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      結束 End
                    </label>
                    <input
                      type="time"
                      value={editClassModal.endTime}
                      onChange={(e) =>
                        setEditClassModal({
                          ...editClassModal,
                          endTime: e.target.value,
                        })
                      }
                      required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setEditClassModal({ ...editClassModal, isOpen: false })
                  }
                  className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition shadow-sm"
                >
                  儲存變更
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 補簽到 Modal */}
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
                  placeholder="請說明無法在當天簽到的原因..."
                  required
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  附件證明{" "}
                  <span className="text-slate-400 font-normal">（選填）</span>
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
                  取消
                </button>
                <button
                  type="submit"
                  disabled={makeupRemaining <= 0}
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  送出申請
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 課堂紀錄 Modal */}
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
              <button
                onClick={() =>
                  setNotesModal({
                    isOpen: false,
                    classId: null,
                    classDate: "",
                    startTime: "",
                    endTime: "",
                    isDeadlinePassed: false,
                  })
                }
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
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
                  placeholder="請描述本次上課的主題與內容..."
                  required
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  備註 Remarks{" "}
                  <span className="text-slate-400 font-normal">（選填）</span>
                </label>
                <textarea
                  value={notesForm.remarks}
                  onChange={(e) =>
                    setNotesForm({ ...notesForm, remarks: e.target.value })
                  }
                  placeholder="其他補充說明..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  附件 Attachment{" "}
                  <span className="text-slate-400 font-normal">（選填）</span>
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
                    setNotesModal({
                      isOpen: false,
                      classId: null,
                      classDate: "",
                      startTime: "",
                      endTime: "",
                      isDeadlinePassed: false,
                    })
                  }
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={notesModal.isDeadlinePassed && notesRemaining <= 0}
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {notesModal.isDeadlinePassed
                    ? "送出補填申請"
                    : existingNote
                      ? "更新紀錄"
                      : "儲存紀錄"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 異常回報 Modal */}
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
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  上課時間 Time
                </label>
                <div className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-500 text-sm">
                  {reportModal.classDate}　{reportModal.startTime} ~{" "}
                  {reportModal.endTime}
                </div>
              </div>
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
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  回報內容 Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reportForm.content}
                  onChange={(e) =>
                    setReportForm({ ...reportForm, content: e.target.value })
                  }
                  placeholder="請詳細描述發生的狀況..."
                  required
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  附件 Attachment{" "}
                  <span className="text-slate-400 font-normal">（選填）</span>
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

      <footer className="bg-white border-t border-slate-200 py-4 px-6 flex justify-between items-center text-sm text-slate-500 mt-auto">
        <div>© 2026 華語系 保留所有權利。</div>
        <div className="text-slate-500 font-medium hidden md:block">
          臺師大華語系
        </div>
      </footer>
    </div>
  );
}

export default TutorDashboard;
