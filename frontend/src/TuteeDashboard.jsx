import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  User,
  Bell,
  MessageSquare,
  ChevronDown,
  LogOut,
  CheckCircle,
  Clock,
  BookOpen,
  UserCheck,
  Edit,
  FileText,
  CheckSquare,
  Flag,
  X,
  Send,
  Calendar,
  Award,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoImg from "./assets/csl-Logo.png";

const DAYS_MAP = { Mon: "一", Tue: "二", Wed: "三", Thu: "四", Fri: "五" };

// ─── 聊天視窗元件 ───────────────────────────────────────────
function ChatWindow({ myUserId, myAccount, partner, onClose, wsRef, onRead }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!myUserId || !partner?.user_id) return;
    fetch(`http://localhost:3001/api/messages/${myUserId}/${partner.user_id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setMessages(res.data);
      });
    onRead && onRead();
  }, [myUserId, partner?.user_id]);

  useEffect(() => {
    if (!wsRef?.current) return;
    const handleMsg = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "message") {
        setMessages((prev) => [...prev, msg]);
        onRead && onRead();
      }
    };
    wsRef.current.addEventListener("message", handleMsg);
    return () => wsRef.current?.removeEventListener("message", handleMsg);
  }, [wsRef]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!notifDropdownOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest("[data-notif-dropdown]"))
        setNotifDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifDropdownOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");
    if (wsRef?.current?.readyState === 1) {
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          senderId: myUserId,
          receiverId: partner.user_id,
          content,
        }),
      );
    }
    await fetch("http://localhost:3001/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderAccount: myAccount,
        receiverId: partner.user_id,
        content,
      }),
    });
    setMessages((prev) => [
      ...prev,
      { sender_id: myUserId, content, created_at: new Date().toISOString() },
    ]);
  };

  const partnerName = partner?.chinese_name || partner?.english_name || "對方";
  const partnerInitial = (partner?.english_name || partner?.chinese_name || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className="fixed bottom-0 right-6 z-[200] w-72 bg-white rounded-t-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      style={{ height: "420px" }}
    >
      <div
        className="bg-slate-700 px-4 py-3 flex justify-between items-center cursor-pointer select-none"
        onClick={onClose}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-400 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
            {partnerInitial}
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              {partnerName}
            </p>
            <p className="text-blue-300 text-[10px] font-medium">已配對</p>
          </div>
        </div>
        <X size={16} className="text-slate-300 hover:text-white" />
      </div>
      <div className="flex-grow overflow-y-auto p-3 flex flex-col gap-2 bg-slate-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
            <MessageSquare size={32} className="text-slate-200" />
            還沒有訊息，開始聊天吧！
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = String(msg.sender_id) === String(myUserId);
            return (
              <div
                key={msg.id || idx}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${isMine ? "bg-primary text-white rounded-br-none" : "bg-white text-slate-700 border border-slate-200 rounded-bl-none"}`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-2.5 border-t border-slate-100 flex gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="輸入訊息..."
          className="flex-1 border border-slate-200 rounded-full px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={handleSend}
          className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-dark transition flex-shrink-0"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── 主元件 ────────────────────────────────────────────────
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

  // 補簽到
  const [makeupModal, setMakeupModal] = useState({
    isOpen: false,
    classId: null,
  });
  const [makeupReason, setMakeupReason] = useState("");
  const [makeupFile, setMakeupFile] = useState(null);
  const [makeupRemaining, setMakeupRemaining] = useState(5);

  // 課堂紀錄
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

  // 異常回報
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

  // 緊急通報
  const [hasSentAlert, setHasSentAlert] = useState(false);

  // 解除配對
  const [unmatchModal, setUnmatchModal] = useState(false);
  const [unmatchReason, setUnmatchReason] = useState("");
  const [unmatchStatus, setUnmatchStatus] = useState(null);

  // 上課紀錄
  const [classHistory, setClassHistory] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);

  // 私訊
  const [chatOpen, setChatOpen] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [msgDropdownOpen, setMsgDropdownOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const wsRef = useRef(null);

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // ─── fetch helpers ───
  const fetchMakeupRemaining = (userId) =>
    fetch(`http://localhost:3001/api/makeup-remaining/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setMakeupRemaining(res.remaining);
      });
  const fetchNotesRemaining = (userId) =>
    fetch(`http://localhost:3001/api/notes-remaining/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setNotesRemaining(res.remaining);
      });
  const fetchUnreadMsg = (userId) =>
    fetch(`http://localhost:3001/api/messages/unread/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setUnreadMsg(res.count);
      });
  const fetchContacts = (userId) =>
    fetch(`http://localhost:3001/api/messages/contacts/tutee/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setContacts(res.data);
      });
  const fetchRequests = (account) =>
    fetch(`http://localhost:3001/api/match/requests/${account}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setRequests(res.data);
      });
  const fetchMatchedTutor = (tutorId) =>
    fetch(`http://localhost:3001/api/match/tutor-info/${tutorId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setMatchedTutor(res.data);
      });
  const fetchClasses = (account) =>
    fetch(`http://localhost:3001/api/tutee-classes/${account}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setClasses(res.data);
      });
  const fetchClassHistory = (userId) =>
    fetch(`http://localhost:3001/api/tutee/classes-history/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setClassHistory(res.data);
      });
  const fetchUnmatchStatus = (userId) =>
    fetch(`http://localhost:3001/api/unmatch/status/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setUnmatchStatus(res.data);
      });

  // ─── 初始化 ───
  useEffect(() => {
    const account = localStorage.getItem("loggedInAccount");
    if (account) {
      fetch(`http://localhost:3001/api/profile/${account}`)
        .then((r) => r.json())
        .then((result) => {
          if (result.success) {
            setUserInfo({
              ...result.data,
              account,
              chineseName: result.data.chinese_name || "",
              englishName: result.data.english_name || "",
              matched_tutor_id: result.data.matched_tutor_id,
            });
            if (result.data.matched_tutor_id) {
              fetchMatchedTutor(result.data.matched_tutor_id);
            } else {
              fetchRequests(account);
            }
            fetchClasses(account);
            if (result.data.user_id) {
              fetchMakeupRemaining(result.data.user_id);
              fetchNotesRemaining(result.data.user_id);
              fetchUnreadMsg(result.data.user_id);
              fetchContacts(result.data.user_id);
              fetchClassHistory(result.data.user_id);
              fetchUnmatchStatus(result.data.user_id);
              const ws = new WebSocket("ws://localhost:3001");
              wsRef.current = ws;
              ws.onopen = () =>
                ws.send(
                  JSON.stringify({
                    type: "register",
                    userId: result.data.user_id,
                  }),
                );
              ws.onmessage = () => {
                fetchUnreadMsg(result.data.user_id);
                fetchContacts(result.data.user_id);
              };
            }
          }
        });
    } else {
      navigate("/");
    }
    return () => wsRef.current?.close();
  }, [navigate]);

  useEffect(() => {
    sessionStorage.setItem("tuteeActiveTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!msgDropdownOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest("[data-msg-dropdown]")) setMsgDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [msgDropdownOpen]);

  const displayName = userInfo.chinese_Name
    ? `${userInfo.chinese_name} ${userInfo.english_name}`
    : userInfo.english_name || "Student";
  const avatarInitial = userInfo.englishName
    ? userInfo.englishName.charAt(0).toUpperCase()
    : "S";
  const handleLogout = () => {
    localStorage.removeItem("loggedInAccount");
    navigate("/");
  };

  // ─── 操作函式 ───
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
          body: JSON.stringify({ userId: userInfo.user_id, role: "tutee" }),
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) setHasSentAlert(true);
    } catch {
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
      if (data.success) window.location.reload();
    } catch {
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
          body: JSON.stringify({ role: "tutee" }),
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) fetchClasses(userInfo.account);
    } catch {
      alert("連線錯誤");
    }
  };

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
    } catch {
      alert("連線錯誤");
    }
  };

  const handleOpenNotesModal = async (cls) => {
    const dateStr = cls.class_date.split("T")[0];
    const deadline = new Date(`${dateStr}T23:59:59`);
    const isDeadlinePassed = new Date() > deadline;
    const classId = cls.id || cls.class_id;
    setNotesModal({
      isOpen: true,
      classId,
      classDate: dateStr,
      startTime: (cls.start_time || "").substring(0, 5),
      endTime: (cls.end_time || "").substring(0, 5),
      isDeadlinePassed,
    });
    try {
      const res = await fetch(
        `http://localhost:3001/api/classes/${classId}/notes/${userInfo.user_id}`,
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
    } catch {
      setExistingNote(null);
    }
  };

  const handleNotesSubmit = async (e) => {
    e.preventDefault();
    if (!notesForm.content.trim()) return alert("請填寫上課內容！");
    const formData = new FormData();
    formData.append("userId", userInfo.user_id);
    formData.append("role", "tutee");
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
        fetchClasses(userInfo.account);
        fetchClassHistory(userInfo.user_id);
      }
    } catch {
      alert("連線錯誤");
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportForm.reportType) return alert("請選擇回報類型！");
    if (!reportForm.content.trim()) return alert("請填寫回報內容！");
    const formData = new FormData();
    formData.append("userId", userInfo.user_id);
    formData.append("role", "tutee");
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
    } catch {
      alert("連線錯誤");
    }
  };

  const handleUnmatchSubmit = async (e) => {
    e.preventDefault();
    if (!unmatchReason.trim()) return alert("請填寫解除原因");
    try {
      const res = await fetch("http://localhost:3001/api/unmatch/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userInfo.user_id,
          role: "tutee",
          reason: unmatchReason,
        }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setUnmatchModal(false);
        setUnmatchReason("");
        fetchUnmatchStatus(userInfo.user_id);
      }
    } catch {
      alert("連線錯誤");
    }
  };

  // ═══════════════════════════════════════════════════════
  // 課程卡片
  // ═══════════════════════════════════════════════════════
  const renderClassCard = (cls, type = "normal") => {
    const dateStr = cls.class_date.split("T")[0];
    const isPast = type === "past";
    const isUpcoming = type === "upcoming";
    const now = new Date();
    const deadline = new Date(`${dateStr}T23:59:59`);
    const isSigned = !!cls.tutee_signed_at;
    const isDeadlinePassed = now > deadline;
    const classStart = new Date(`${dateStr}T${cls.start_time}`);
    const windowStart = new Date(classStart.getTime() - 30 * 60 * 1000);
    const canCheckin = now >= windowStart && !isDeadlinePassed;
    const [y, m, d] = dateStr.split("-").map(Number);
    const displayDate = new Date(y, m - 1, d);

    return (
      <div
        key={cls.id}
        className={`p-5 rounded-xl border flex flex-col gap-4 transition ${isPast ? "bg-slate-50 border-slate-200 opacity-80" : "bg-white border-slate-100 shadow-sm hover:border-primary/30 hover:shadow-md"}`}
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
                Tutor:{" "}
                {cls.tutor_english_name ||
                  cls.tutor_chinese_name ||
                  "載入中..."}
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
            const canFillNote = now >= classStart;
            const isNoteDeadlinePassed = now > deadline;
            if (cls.has_note)
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
            if (isNoteDeadlinePassed)
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
            if (canFillNote)
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
          })()}
          {isSigned ? (
            <button
              disabled
              className="flex flex-col items-center justify-center py-2 rounded-lg text-green-600 bg-green-50 cursor-default"
            >
              <CheckSquare size={16} className="mb-1" />
              <span className="text-xs font-bold">已簽到 ✓</span>
            </button>
          ) : isDeadlinePassed ? (
            <button
              onClick={() => setMakeupModal({ isOpen: true, classId: cls.id })}
              className="flex flex-col items-center justify-center py-2 rounded-lg text-red-500 hover:bg-red-50 transition"
            >
              <CheckSquare size={16} className="mb-1" />
              <span className="text-xs font-bold">補簽到</span>
            </button>
          ) : (
            <button
              onClick={() => handleCheckin(cls.id)}
              disabled={!canCheckin}
              className={`flex flex-col items-center justify-center py-2 rounded-lg transition ${canCheckin ? "text-slate-500 hover:bg-orange-50 hover:text-orange-600" : "text-slate-300 cursor-not-allowed"}`}
            >
              <CheckSquare size={16} className="mb-1" />
              <span className="text-xs font-bold text-center leading-tight">
                學生簽到
                <br />
                Check-in
              </span>
            </button>
          )}
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

  // ═══════════════════════════════════════════════════════
  // 渲染：首頁（只顯示未來課程）
  // ═══════════════════════════════════════════════════════
  const renderHome = () => {
    const now = new Date();
    const upcomingAndFuture = classes
      .filter((cls) => {
        const dateStr = cls.class_date.split("T")[0];
        return new Date(`${dateStr}T${cls.end_time}`) >= now;
      })
      .sort((a, b) => new Date(a.class_date) - new Date(b.class_date));
    const upcomingClass = upcomingAndFuture[0] || null;
    const futureClasses = upcomingAndFuture.slice(1);

    return (
      <main className="flex-grow flex flex-col gap-6 animate-fade-in max-w-3xl">
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
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm text-slate-500 flex items-center gap-3">
          <Calendar size={18} className="text-slate-400 flex-shrink-0" />
          過去的上課紀錄，請前往「
          <button
            onClick={() => setActiveTab("history")}
            className="text-primary font-bold hover:underline"
          >
            上課紀錄
          </button>
          」查看。
        </div>
      </main>
    );
  };

  // ═══════════════════════════════════════════════════════
  // 渲染：我的老師（含解除配對）
  // ═══════════════════════════════════════════════════════
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
                <p className="font-medium text-primary hover:underline cursor-pointer mb-4">
                  {matchedTutor.email || "未提供 Email"}
                </p>
                <button
                  onClick={() => {
                    setActiveChat(matchedTutor);
                    setChatOpen(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl shadow-sm hover:bg-primary-dark transition"
                >
                  <MessageSquare size={18} /> 傳送私訊
                </button>

                {/* ── 解除配對（放在我的老師頁面） ── */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  {unmatchStatus?.status === "pending" ? (
                    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-bold">
                      <Clock size={16} /> 解除配對申請審核中，請靜候通知
                    </div>
                  ) : unmatchStatus?.status === "rejected" ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">
                        <AlertCircle size={16} /> 解除申請已被駁回
                      </div>
                      <button
                        onClick={() => setUnmatchModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 font-bold rounded-xl hover:bg-red-50 transition text-sm"
                      >
                        重新申請解除配對
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setUnmatchModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-500 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition text-sm"
                    >
                      申請解除配對
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-700 flex items-center mb-3">
                  <Clock size={18} className="mr-2 text-primary" />{" "}
                  老師可上課時間 Available Times
                </h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(times.days || []).map((d) => (
                    <span
                      key={d}
                      className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-md"
                    >
                      {DAYS_MAP[d] || d}
                    </span>
                  ))}
                  {(times.slots || []).map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-md"
                    >
                      {s}
                    </span>
                  ))}
                  {(!times.days || times.days.length === 0) &&
                    (!times.slots || times.slots.length === 0) && (
                      <span className="text-slate-400 text-sm italic">
                        未設定
                      </span>
                    )}
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
                          {(times.days || []).map((d) => (
                            <span
                              key={d}
                              className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded"
                            >
                              {DAYS_MAP[d]}
                            </span>
                          ))}
                          {(times.slots || []).map((s) => (
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

  // ═══════════════════════════════════════════════════════
  // 渲染：上課紀錄（類似 tutor 的輔導時數，拔掉時數和申請證明）
  // ═══════════════════════════════════════════════════════
  const renderHistory = () => {
    const rows = classHistory.map((r) => {
      const [y, m, d] = r.class_date.split("-").map(Number);
      return {
        ...r,
        hasSigned: !!r.tutee_signed_at,
        hasNote: !!r.note_id,
        displayDate: new Date(y, m - 1, d),
      };
    });

    return (
      <main className="flex-grow w-full flex flex-col gap-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Calendar size={18} className="text-primary" /> 上課紀錄 Class
              History
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              共 {rows.length} 堂課
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-medium">
              <Calendar size={40} className="mx-auto mb-3 text-slate-200" />
              尚無任何上課紀錄
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* 表頭 */}
              <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr] px-6 py-3 bg-slate-50/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>日期 / 時間</span>
                <span>老師</span>
                <span>學生簽到</span>
                <span>課堂紀錄</span>
              </div>

              {rows.map((row) => {
                const isExpanded = expandedRow === row.class_id;
                const dateStr = row.class_date;
                const now = new Date();
                const deadline = new Date(`${dateStr}T23:59:59`);
                const isDeadlinePassed = now > deadline;
                const classStart = new Date(`${dateStr}T${row.start_time}`);
                const windowStart = new Date(
                  classStart.getTime() - 30 * 60 * 1000,
                );
                const canCheckin =
                  now >= windowStart && !isDeadlinePassed && !row.hasSigned;
                const canFillNote = now >= classStart && !row.hasNote;

                return (
                  <div key={row.class_id}>
                    <div
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : row.class_id)
                      }
                      className={`grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr] px-6 py-4 items-center gap-3 cursor-pointer transition ${isExpanded ? "bg-blue-50/40" : "hover:bg-slate-50"}`}
                    >
                      {/* 日期 */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-slate-100 text-slate-500 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
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
                        <ChevronRight
                          size={14}
                          className={`text-slate-300 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </div>

                      {/* 老師 */}
                      <div>
                        <p className="text-sm font-bold text-slate-700 truncate">
                          {row.tutor_chinese_name ||
                            row.tutor_english_name ||
                            "—"}
                        </p>
                        {row.tutor_chinese_name && row.tutor_english_name && (
                          <p className="text-xs text-slate-400 truncate">
                            {row.tutor_english_name}
                          </p>
                        )}
                      </div>

                      {/* 學生簽到 */}
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
                    </div>

                    {/* 展開操作區 */}
                    {isExpanded && (
                      <div className="bg-blue-50/30 border-t border-blue-100 px-6 py-4">
                        <div className="flex flex-wrap gap-3 items-center">
                          <span className="text-xs font-bold text-slate-500">
                            快速操作：
                          </span>

                          {/* 簽到 */}
                          {row.hasSigned ? (
                            <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1">
                              <CheckCircle size={13} /> 已完成簽到
                            </span>
                          ) : isDeadlinePassed ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMakeupModal({
                                  isOpen: true,
                                  classId: row.class_id,
                                });
                              }}
                              className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition flex items-center gap-1"
                            >
                              <CheckSquare size={13} /> 補簽到申請
                            </button>
                          ) : canCheckin ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckin(row.class_id);
                              }}
                              className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-200 transition flex items-center gap-1"
                            >
                              <CheckSquare size={13} /> 立即簽到
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-lg">
                              尚未到簽到時間
                            </span>
                          )}

                          {/* 課堂紀錄 */}
                          {row.hasNote ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenNotesModal({
                                  id: row.class_id,
                                  class_date: row.class_date,
                                  start_time: row.start_time,
                                  end_time: row.end_time,
                                });
                              }}
                              className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg hover:bg-green-200 transition flex items-center gap-1"
                            >
                              <FileText size={13} /> 查看 / 編輯紀錄
                            </button>
                          ) : isDeadlinePassed ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenNotesModal({
                                  id: row.class_id,
                                  class_date: row.class_date,
                                  start_time: row.start_time,
                                  end_time: row.end_time,
                                });
                              }}
                              className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition flex items-center gap-1"
                            >
                              <FileText size={13} /> 補填紀錄申請
                            </button>
                          ) : canFillNote ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenNotesModal({
                                  id: row.class_id,
                                  class_date: row.class_date,
                                  start_time: row.start_time,
                                  end_time: row.end_time,
                                });
                              }}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 transition flex items-center gap-1"
                            >
                              <FileText size={13} /> 填寫課堂紀錄
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-lg">
                              上課開始後才能填寫
                            </span>
                          )}

                          {/* 異常回報 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportModal({
                                isOpen: true,
                                classId: row.class_id,
                                classDate: row.class_date,
                                startTime: row.start_time.substring(0, 5),
                                endTime: row.end_time.substring(0, 5),
                              });
                            }}
                            className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg hover:bg-red-100 hover:text-red-600 transition flex items-center gap-1"
                          >
                            <Flag size={13} /> 異常回報
                          </button>
                        </div>

                        {/* 紀錄內容預覽 */}
                        {row.hasNote && row.note_content && (
                          <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
                            <span className="font-bold text-slate-400 block mb-1">
                              上課內容摘要：
                            </span>
                            <p className="leading-relaxed line-clamp-2">
                              {row.note_content}
                            </p>
                            {row.note_location && (
                              <p className="text-slate-400 mt-1">
                                📍 {row.note_location}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    );
  };

  // ═══════════════════════════════════════════════════════
  // JSX
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center pl-2">
          <img
            src={logoImg}
            alt="Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
        <div className="flex items-center space-x-5">
          {/* 私訊下拉 */}
          <div className="relative" data-msg-dropdown>
            <button
              onClick={() => {
                setMsgDropdownOpen((prev) => !prev);
                if (userInfo.user_id) fetchContacts(userInfo.user_id);
              }}
              className="relative text-slate-400 hover:text-primary transition"
            >
              <MessageSquare size={20} />
              {unreadMsg > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {unreadMsg > 9 ? "9+" : unreadMsg}
                </span>
              )}
            </button>
            {msgDropdownOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <MessageSquare size={15} className="text-primary" /> 訊息
                    Messages
                  </span>
                  <button
                    onClick={() => setMsgDropdownOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {contacts.length > 0 ? (
                    contacts.map((contact) => (
                      <button
                        key={contact.user_id}
                        onClick={() => {
                          setActiveChat(contact);
                          setChatOpen(true);
                          setMsgDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left"
                      >
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {(contact.english_name || contact.chinese_name || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800 text-sm truncate">
                              {contact.chinese_name || contact.english_name}
                            </p>
                            {contact.is_active ? (
                              <span className="text-[10px] bg-green-100 text-green-600 font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                                配對中
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-400 font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                                已結束
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {contact.last_message || "尚無訊息"}
                          </p>
                        </div>
                        {parseInt(contact.unread_count) > 0 && (
                          <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                            {contact.unread_count > 9
                              ? "9+"
                              : contact.unread_count}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">
                      <MessageSquare
                        size={28}
                        className="mx-auto mb-2 text-slate-200"
                      />
                      尚無配對紀錄
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 通知鈴鐺 */}
          <div className="relative" data-notif-dropdown>
            <button
              onClick={() => setNotifDropdownOpen((prev) => !prev)}
              className="relative text-slate-400 hover:text-primary transition"
            >
              <Bell size={20} />
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <Bell size={15} className="text-primary" /> 通知
                  </span>
                  <button
                    onClick={() => setNotifDropdownOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                  <Bell size={28} className="mx-auto mb-2 text-slate-200" />
                  通知功能即將上線
                </div>
              </div>
            )}
          </div>

          {/* 個人選單 */}
          <div className="relative">
            <div
              className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <User size={18} />
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p
                    className="font-bold text-slate-800 truncate"
                    title={displayName}
                  >
                    {displayName}
                  </p>
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
                    學生
                  </span>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => navigate("/profile")}
                    className="w-full flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary transition"
                  >
                    <User size={16} className="mr-3" /> 個人資訊
                  </button>
                  <button
                    onClick={() => alert("使用手冊說明內容即將上線！")}
                    className="w-full flex items-center px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary transition"
                  >
                    <BookOpen size={16} className="mr-3" /> 使用手冊說明
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

      {/* 主內容 */}
      <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-6 gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex flex-col gap-6 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center text-lg">
              快速連結 Quick Links
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
                首頁
              </li>
              <li
                onClick={() => setActiveTab("my-tutor")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === "my-tutor" ? "bg-primary/10 text-primary font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-primary"}`}
              >
                <UserCheck
                  size={20}
                  className={`mr-4 ${activeTab === "my-tutor" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                />{" "}
                我的老師
              </li>
              <li
                onClick={() => setActiveTab("history")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === "history" ? "bg-primary/10 text-primary font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-primary"}`}
              >
                <Calendar
                  size={20}
                  className={`mr-4 ${activeTab === "history" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                />{" "}
                上課紀錄
              </li>
            </ul>
          </div>
        </aside>

        {activeTab === "home"
          ? renderHome()
          : activeTab === "my-tutor"
            ? renderMyTutor()
            : activeTab === "history"
              ? renderHistory()
              : renderHome()}
      </div>

      {/* ── Modals ── */}

      {/* 補簽到 */}
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

      {/* 課堂紀錄 */}
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
                onClick={() => setNotesModal({ ...notesModal, isOpen: false })}
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
                  上課時間
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
                  附件{" "}
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
                    setNotesModal({ ...notesModal, isOpen: false })
                  }
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition shadow-sm"
                >
                  {existingNote ? "更新紀錄" : "儲存紀錄"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 異常回報 */}
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
                  上課時間
                </label>
                <div className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-500 text-sm">
                  {reportModal.classDate}　{reportModal.startTime} ~{" "}
                  {reportModal.endTime}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  回報類型 <span className="text-red-500">*</span>
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
                  <option value="student_absent">學生未出席</option>
                  <option value="tutor_absent">老師未出席</option>
                  <option value="venue_issue">場地問題</option>
                  <option value="learning_issue">學習進度問題</option>
                  <option value="safety">人身安全</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  地點
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
                  回報內容 <span className="text-red-500">*</span>
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
                  附件{" "}
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
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition shadow-sm"
                >
                  送出回報
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 解除配對 Modal */}
      {unmatchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-red-50">
              <h3 className="font-bold text-lg text-red-700">申請解除配對</h3>
              <button
                onClick={() => {
                  setUnmatchModal(false);
                  setUnmatchReason("");
                }}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUnmatchSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 leading-relaxed">
                ⚠️ 解除配對後，<strong>未來</strong>
                的課程將全部取消。過去的上課紀錄不受影響。
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  解除原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={unmatchReason}
                  onChange={(e) => setUnmatchReason(e.target.value)}
                  placeholder="請說明申請解除配對的原因..."
                  required
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-red-400 text-sm resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUnmatchModal(false);
                    setUnmatchReason("");
                  }}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition shadow-sm"
                >
                  送出申請
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 聊天視窗 */}
      {chatOpen && activeChat && (
        <ChatWindow
          myUserId={userInfo.user_id}
          myAccount={userInfo.account}
          partner={activeChat}
          onClose={() => {
            setChatOpen(false);
            fetchUnreadMsg(userInfo.user_id);
            fetchContacts(userInfo.user_id);
          }}
          wsRef={wsRef}
          onRead={() => {
            fetchUnreadMsg(userInfo.user_id);
            fetchContacts(userInfo.user_id);
          }}
        />
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

export default TuteeDashboard;
