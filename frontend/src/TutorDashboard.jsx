import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  UserCheck,
  FileText,
  Bell,
  MessageSquare,
  ChevronDown,
  User,
  LogOut,
  FileCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  Award,
  Search,
  Filter,
  Send,
  Calendar,
  Plus,
  X,
  Edit,
  CheckSquare,
  Flag,
  ChevronRight,
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
          <div className="w-8 h-8 bg-green-400 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
            {partnerInitial}
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              {partnerName}
            </p>
            <p className="text-green-300 text-[10px] font-medium">已配對</p>
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
  const [matchedTutee, setMatchedTutee] = useState(null);

  // 篩選
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterGender, setFilterGender] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [filterSkills, setFilterSkills] = useState([]);
  const [filterDays, setFilterDays] = useState([]);
  const [filterSlots, setFilterSlots] = useState([]);
  const FILTER_DAYS = [
    { id: "Mon", label: "一" },
    { id: "Tue", label: "二" },
    { id: "Wed", label: "三" },
    { id: "Thu", label: "四" },
    { id: "Fri", label: "五" },
  ];
  const FILTER_SLOTS = [
    "09:00-11:00",
    "11:00-13:00",
    "13:00-15:00",
    "15:00-17:00",
  ];
  const toggleArr = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  const resetFilters = () => {
    setFilterGender("All");
    setFilterLevel("All");
    setFilterSkills([]);
    setFilterDays([]);
    setFilterSlots([]);
  };
  const activeFilterCount = [
    filterGender !== "All",
    filterLevel !== "All",
    filterSkills.length > 0,
    filterDays.length > 0 || filterSlots.length > 0,
  ].filter(Boolean).length;

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

  // 課程
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

  // 輔導時數
  const [hoursData, setHoursData] = useState([]);
  const [approvedHours, setApprovedHours] = useState(0);
  const [certStatus, setCertStatus] = useState(null);
  // 展開的課堂 id（點擊展開詳情）
  const [expandedRow, setExpandedRow] = useState(null);

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

  // 解除配對
  const [unmatchModal, setUnmatchModal] = useState(false);
  const [unmatchReason, setUnmatchReason] = useState("");
  const [unmatchStatus, setUnmatchStatus] = useState(null);

  // 私訊
  const [chatOpen, setChatOpen] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [msgDropdownOpen, setMsgDropdownOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const wsRef = useRef(null);

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
  const fetchHours = (userId) =>
    fetch(`http://localhost:3001/api/tutor/hours/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setHoursData(res.data);
          setApprovedHours(res.approvedHours || 0);
        }
      });
  const fetchCertStatus = (userId) =>
    fetch(`http://localhost:3001/api/tutor/certificate-status/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) setCertStatus(res.data.status);
      });
  const fetchUnreadMsg = (userId) =>
    fetch(`http://localhost:3001/api/messages/unread/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setUnreadMsg(res.count);
      });
  const fetchContacts = (userId) =>
    fetch(`http://localhost:3001/api/messages/contacts/tutor/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setContacts(res.data);
      });
  const fetchTutees = () =>
    fetch("http://localhost:3001/api/match/tutees")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setTuteesList(res.data);
      });
  const fetchMatchedTutee = (tuteeId) =>
    fetch(`http://localhost:3001/api/match/tutee-info/${tuteeId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setMatchedTutee(res.data);
      });
  const fetchClasses = (userId) =>
    fetch(`http://localhost:3001/api/classes/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setClasses(res.data);
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
              matched_tutee_id: result.data.matched_tutee_id,
            });
            if (result.data.matched_tutee_id)
              fetchMatchedTutee(result.data.matched_tutee_id);
            if (result.data.user_id) {
              fetchClasses(result.data.user_id);
              fetchMakeupRemaining(result.data.user_id);
              fetchNotesRemaining(result.data.user_id);
              fetchHours(result.data.user_id);
              fetchCertStatus(result.data.user_id);
              fetchUnreadMsg(result.data.user_id);
              fetchContacts(result.data.user_id);
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
      fetchTutees();
    } else {
      navigate("/");
    }
    return () => wsRef.current?.close();
  }, [navigate]);

  useEffect(() => {
    sessionStorage.setItem("tutorActiveTab", activeTab);
  }, [activeTab]);

  // 點外部關閉訊息下拉
  useEffect(() => {
    if (!msgDropdownOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest("[data-msg-dropdown]")) setMsgDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [msgDropdownOpen]);

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

  // ─── 各種操作 ───
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
    } catch {
      alert("連線錯誤");
    }
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
          body: JSON.stringify({ role: "tutor" }),
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        fetchClasses(userInfo.user_id);
        fetchHours(userInfo.user_id);
      }
    } catch {
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
        fetchHours(userInfo.user_id);
      }
    } catch {
      alert("連線錯誤");
    }
  };

  const handleOpenNotesModal = async (cls) => {
    const dateStr =
      typeof cls.class_date === "string"
        ? cls.class_date.split("T")[0]
        : cls.class_date;
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
        fetchHours(userInfo.user_id);
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
          role: "tutor",
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

  const handleAddSlot = () =>
    setSlots([...slots, { date: "", startTime: "14:00", endTime: "15:00" }]);
  const handleRemoveSlot = (i) => setSlots(slots.filter((_, idx) => idx !== i));
  const handleSlotChange = (i, field, value) => {
    const s = [...slots];
    s[i][field] = value;
    setSlots(s);
  };
  const getWeekdayString = (dateString) => {
    if (!dateString) return "";
    const [y, m, d] = dateString.split("-");
    return ["日", "一", "二", "三", "四", "五", "六"][
      new Date(y, m - 1, d).getDay()
    ];
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    for (const s of slots)
      if (!s.date || !s.startTime || !s.endTime)
        return alert("請填寫所有時段的日期與時間！");
    if (isRecurring && !endDate) return alert("請選擇重複結束的日期！");
    let totalHours = 0;
    slots.forEach((s) => {
      const diff =
        (new Date(`1970-01-01T${s.endTime}`) -
          new Date(`1970-01-01T${s.startTime}`)) /
        3600000;
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
    } catch {
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

  // ═══════════════════════════════════════════════════════
  // 課程卡片（首頁用，只顯示未來課程）
  // ═══════════════════════════════════════════════════════
  const renderClassCard = (cls, type = "normal") => {
    const dateStr = cls.class_date.split("T")[0];
    const [year, month, day] = dateStr.split("-").map(Number);
    const displayDate = new Date(year, month - 1, day);
    const isUpcoming = type === "upcoming";
    const now = new Date();
    const deadline = new Date(`${dateStr}T23:59:59`);
    const isSigned = !!cls.tutor_signed_at;
    const isDeadlinePassed = now > deadline;
    const classStart = new Date(`${dateStr}T${cls.start_time}`);
    const windowStart = new Date(classStart.getTime() - 30 * 60 * 1000);
    const canCheckin = now >= windowStart && !isDeadlinePassed;

    return (
      <div
        key={cls.id}
        className="p-5 rounded-xl border flex flex-col gap-4 transition bg-white border-slate-100 shadow-sm hover:border-primary/30 hover:shadow-md"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center mr-4 flex-shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
              <span className="text-[10px] font-bold uppercase">
                {displayDate.toLocaleDateString("en-US", { month: "short" })}
              </span>
              <span className="text-lg font-black leading-none">
                {displayDate.getDate()}
              </span>
            </div>
            <div>
              <p className="font-bold text-slate-800 text-lg">
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
              <span className="text-xs font-bold">老師簽到</span>
            </button>
          )}
          {(() => {
            const canFillNote = now >= classStart;
            if (cls.has_note)
              return (
                <button
                  onClick={() => handleOpenNotesModal(cls)}
                  className="flex flex-col items-center justify-center py-2 rounded-lg text-green-600 bg-green-50 transition"
                >
                  <FileText size={16} className="mb-1" />
                  <span className="text-xs font-bold">已填寫 ✓</span>
                </button>
              );
            if (isDeadlinePassed)
              return (
                <button
                  onClick={() => handleOpenNotesModal(cls)}
                  className="flex flex-col items-center justify-center py-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                >
                  <FileText size={16} className="mb-1" />
                  <span className="text-xs font-bold">補填紀錄</span>
                </button>
              );
            if (canFillNote)
              return (
                <button
                  onClick={() => handleOpenNotesModal(cls)}
                  className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-500 hover:bg-green-50 hover:text-green-600 transition"
                >
                  <FileText size={16} className="mb-1" />
                  <span className="text-xs font-bold">課堂紀錄</span>
                </button>
              );
            return (
              <button
                disabled
                className="flex flex-col items-center justify-center py-2 rounded-lg text-slate-300 cursor-not-allowed"
              >
                <FileText size={16} className="mb-1" />
                <span className="text-xs font-bold">課堂紀錄</span>
              </button>
            );
          })()}
          <button
            onClick={() =>
              setReportModal({
                isOpen: true,
                classId: cls.id,
                classDate: dateStr,
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
          {/* 過去課程提示 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm text-slate-500 flex items-center gap-3">
            <Award size={18} className="text-slate-400 flex-shrink-0" />
            過去的上課紀錄與時數，請前往「
            <button
              onClick={() => setActiveTab("hours")}
              className="text-primary font-bold hover:underline"
            >
              輔導時數
            </button>
            」查看。
          </div>
        </main>
        <aside className="hidden xl:flex w-72 flex-col gap-6 flex-shrink-0" />
      </>
    );
  };

  // ═══════════════════════════════════════════════════════
  // 渲染：審查結果
  // ═══════════════════════════════════════════════════════
  const renderReviews = () => (
    <main className="flex-grow w-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
      <div className="bg-slate-50 px-8 py-5 border-b border-slate-100">
        <h2 className="font-bold text-lg text-slate-800 flex items-center">
          <FileCheck size={22} className="mr-2 text-primary" /> 審查結果追蹤
        </h2>
      </div>
      <div className="p-8">
        <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
          <h3 className="font-bold text-slate-700 flex items-center text-lg">
            <Award className="mr-2 text-orange-500" size={20} /> 1. 資格證明
          </h3>
        </div>
        {userInfo.certification_file ? (
          <div className="p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between bg-white hover:shadow-md transition gap-4">
            <div className="flex items-center overflow-hidden">
              <FileText
                className="text-slate-400 mr-3 flex-shrink-0"
                size={24}
              />
              <p className="font-bold text-slate-700 truncate max-w-xs">
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
    </main>
  );

  // ═══════════════════════════════════════════════════════
  // 渲染：尋找學生
  // ═══════════════════════════════════════════════════════
  const renderFindStudents = () => {
    const filteredTutees = tuteesList.filter((tutee) => {
      const skills =
        typeof tutee.target_skills === "string"
          ? JSON.parse(tutee.target_skills)
          : tutee.target_skills || {};
      const times =
        typeof tutee.available_times === "string"
          ? JSON.parse(tutee.available_times)
          : tutee.available_times || { days: [], slots: [] };
      if (filterGender !== "All" && tutee.gender !== filterGender) return false;
      if (filterLevel !== "All" && tutee.overall_level !== filterLevel)
        return false;
      if (filterSkills.length > 0 && !filterSkills.every((s) => skills[s]))
        return false;
      if (
        filterDays.length > 0 &&
        !filterDays.some((d) => (times.days || []).includes(d))
      )
        return false;
      if (
        filterSlots.length > 0 &&
        !filterSlots.some((s) => (times.slots || []).includes(s))
      )
        return false;
      return true;
    });
    return (
      <main className="flex-grow flex flex-col gap-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-lg text-slate-800 flex items-center">
              <Search size={22} className="mr-2 text-primary" /> 尋找外籍生{" "}
              <span className="ml-3 text-sm font-normal text-slate-400">
                共 {filteredTutees.length} 人
              </span>
            </h2>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition ${activeFilterCount > 0 ? "bg-primary/10 text-primary border-primary/30" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
            >
              <Filter size={15} /> 篩選條件
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-primary text-white text-[10px] font-black rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
          {filterOpen && (
            <div className="border-b border-slate-100 bg-slate-50/60 px-8 py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    👤 性別
                  </label>
                  <div className="flex gap-2">
                    {[
                      { val: "All", label: "全部" },
                      { val: "male", label: "男" },
                      { val: "female", label: "女" },
                      { val: "other", label: "其他" },
                    ].map((g) => (
                      <button
                        key={g.val}
                        onClick={() => setFilterGender(g.val)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${filterGender === g.val ? "bg-primary/10 text-primary border-primary/40" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    📊 華語程度
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="All">全部程度</option>
                    {[
                      "不知道 (Unknown)",
                      "N",
                      "A1",
                      "A2",
                      "B1",
                      "B2",
                      "C1",
                      "C2",
                    ].map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    ✏️ 想加強的技能
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(SKILL_MAP).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() =>
                          toggleArr(filterSkills, setFilterSkills, k)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${filterSkills.includes(k) ? "bg-orange-100 text-orange-600 border-orange-300" : "bg-white text-slate-500 border-slate-200 hover:border-orange-200"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    📅 星期（可複選）
                  </label>
                  <div className="flex gap-2">
                    {FILTER_DAYS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() =>
                          toggleArr(filterDays, setFilterDays, d.id)
                        }
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${filterDays.includes(d.id) ? "bg-blue-100 text-blue-600 border-blue-300" : "bg-white text-slate-500 border-slate-200 hover:border-blue-200"}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    ⏰ 時段（可複選）
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FILTER_SLOTS.map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          toggleArr(filterSlots, setFilterSlots, s)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${filterSlots.includes(s) ? "bg-blue-100 text-blue-600 border-blue-300" : "bg-white text-slate-500 border-slate-200 hover:border-blue-200"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={resetFilters}
                    className="text-xs font-bold text-slate-500 hover:text-red-500 transition flex items-center gap-1"
                  >
                    <X size={13} /> 清除所有篩選
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 bg-slate-50/30 flex-grow content-start">
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
                const genderLabel =
                  tutee.gender === "male"
                    ? "男 Male"
                    : tutee.gender === "female"
                      ? "女 Female"
                      : tutee.gender === "other"
                        ? "其他"
                        : "未提供";
                return (
                  <div
                    key={tutee.tutee_user_id}
                    className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
                      <div className="flex flex-col gap-1.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded w-fit ${tutee.gender === "female" ? "bg-pink-100 text-pink-600" : tutee.gender === "male" ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-500"}`}
                        >
                          {genderLabel}
                        </span>
                        <p className="text-xs text-slate-400 font-medium">
                          {tutee.student_id}
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
                                className="px-2.5 py-1 text-xs font-bold border rounded-md bg-orange-50 text-orange-600 border-orange-100"
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
                          {(times.days || []).map((d) => (
                            <span
                              key={d}
                              className="px-2 py-1 text-xs font-bold rounded bg-slate-100 text-slate-600"
                            >
                              {DAYS_MAP[d]}
                            </span>
                          ))}
                          {(times.days || []).length > 0 &&
                            (times.slots || []).length > 0 && (
                              <span className="text-slate-300 font-bold px-1">
                                |
                              </span>
                            )}
                          {(times.slots || []).map((s) => (
                            <span
                              key={s}
                              className="px-2 py-1 text-xs font-bold rounded bg-slate-100 text-slate-600"
                            >
                              {s}
                            </span>
                          ))}
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
                              tutee.english_name,
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
                目前沒有符合條件的外籍生
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="mt-4 text-sm text-primary font-bold hover:underline"
                  >
                    清除篩選條件試試看
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  };

  // ═══════════════════════════════════════════════════════
  // 渲染：我的學生
  // ═══════════════════════════════════════════════════════
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
                  性別 Gender
                </h4>
                <p className="font-medium text-slate-700 mb-4">
                  {matchedTutee.gender === "male"
                    ? "男 Male"
                    : matchedTutee.gender === "female"
                      ? "女 Female"
                      : matchedTutee.gender === "other"
                        ? "非二元性別 Non-binary"
                        : "未提供"}
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
                <p className="font-medium text-primary hover:underline cursor-pointer mb-4">
                  {matchedTutee.email || "未提供 Email"}
                </p>
                <button
                  onClick={() => {
                    setActiveChat(matchedTutee);
                    setChatOpen(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl shadow-sm hover:bg-primary-dark transition"
                >
                  <MessageSquare size={18} /> 傳送私訊
                </button>
                {/* 解除配對 */}
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
                      {(times.days || []).map((d) => (
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
                      {(times.slots || []).map((s) => (
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

  // ═══════════════════════════════════════════════════════
  // 渲染：課表
  // ═══════════════════════════════════════════════════════
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
                  {matchedTutee.english_name?.charAt(0).toUpperCase() || "S"}
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
          {classes.filter(
            (cls) =>
              new Date(`${cls.class_date.split("T")[0]}T${cls.end_time}`) >=
              new Date(),
          ).length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Calendar size={48} className="mb-3 text-slate-300" />
              <p className="font-bold text-slate-600">目前沒有未來課程</p>
              <p className="text-sm mt-1">
                請點擊上方「安排上課」按鈕為學生排課
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {classes
                .filter(
                  (cls) =>
                    new Date(
                      `${cls.class_date.split("T")[0]}T${cls.end_time}`,
                    ) >= new Date(),
                )
                .sort((a, b) => new Date(a.class_date) - new Date(b.class_date))
                .map((cls, index) => {
                  const dateStr = cls.class_date.split("T")[0];
                  const [y, m, d] = dateStr.split("-").map(Number);
                  const displayDate = new Date(y, m - 1, d);
                  return (
                    <div
                      key={cls.id}
                      className="flex items-center p-4 border rounded-xl shadow-sm bg-white border-slate-100 hover:bg-slate-50 transition"
                    >
                      <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center mr-6 flex-shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
                        <span className="text-xs font-bold uppercase">
                          {displayDate.toLocaleDateString("en-US", {
                            month: "short",
                          })}
                        </span>
                        <span className="text-xl font-black">
                          {displayDate.getDate()}
                        </span>
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
                          className="p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition"
                        >
                          <Edit size={18} />
                        </button>
                        <div className="px-4 py-1.5 bg-amber-50 text-amber-600 font-bold text-sm rounded-lg border border-amber-200">
                          即將到來
                        </div>
                      </div>
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
                {slots.map((slot, index) => (
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
                        {getWeekdayString(slot.date) && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] tracking-widest shadow-sm">
                            星期{getWeekdayString(slot.date)}
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
                            handleSlotChange(index, "startTime", e.target.value)
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
                ))}
                {slots.length < 2 && (
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="flex items-center text-sm font-bold text-primary hover:text-primary-dark transition bg-primary/10 px-4 py-2 rounded-lg w-full justify-center border border-primary/20"
                  >
                    <Plus size={16} className="mr-1" /> 新增一天
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
                        重複直到哪一天？ <span className="text-red-500">*</span>
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

  // ═══════════════════════════════════════════════════════
  // 渲染：輔導時數（可直接簽到/填紀錄、點擊展開詳情）
  // ═══════════════════════════════════════════════════════
  const renderHours = () => {
    const TARGET_HOURS = 100;
    const pct = Math.min((approvedHours / TARGET_HOURS) * 100, 100);
    const rows = hoursData.map((r) => {
      const [y, m, d] = r.class_date.split("-").map(Number);
      return {
        ...r,
        hasSigned: !!r.tutor_signed_at,
        hasNote: !!r.note_id,
        hrs: parseFloat(r.hours || 0),
        displayDate: new Date(y, m - 1, d),
      };
    });

    const statusBadge = (row) => {
      if (row.hasSigned && row.hasNote)
        return (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1 w-fit">
            <CheckCircle size={12} /> 已計入
          </span>
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
          className={`px-6 py-3 font-bold rounded-xl transition shadow-md flex items-center gap-2 ${approvedHours >= TARGET_HOURS ? "bg-primary text-white hover:bg-primary-dark" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
        >
          <Award size={18} /> 申請實習時數證明
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
              畢業條件：累積 100 小時輔導時數（完成簽到＋課堂紀錄即自動計入）
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
                className={`ml-auto text-sm font-bold px-3 py-1.5 rounded-full ${pct >= 100 ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
              >
                {pct >= 100 ? "🎉 已達標！" : `${pct.toFixed(1)}%`}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden">
              <div
                className={`h-5 rounded-full transition-all duration-700 ${pct >= 100 ? "bg-green-500" : "bg-primary"}`}
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
              {/* 表頭 */}
              <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1.5fr] px-6 py-3 bg-slate-50/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>日期 / 時間</span>
                <span>學生</span>
                <span>時長</span>
                <span>老師簽到</span>
                <span>課堂紀錄</span>
                <span>審查狀態</span>
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
                    {/* 主列（點擊展開） */}
                    <div
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : row.class_id)
                      }
                      className={`grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1.5fr] px-6 py-4 items-center gap-3 cursor-pointer transition ...`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${row.hasSigned && row.hasNote ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
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
                        <ChevronRight
                          size={14}
                          className={`text-slate-300 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                      </div>
                      {/* 學生姓名 */}
                      <div className="hidden md:block">
                        <p className="text-sm font-bold text-slate-700 truncate">
                          {row.tutee_chinese_name ||
                            row.tutee_english_name ||
                            "—"}
                        </p>
                        {row.tutee_chinese_name && row.tutee_english_name && (
                          <p className="text-xs text-slate-400 truncate">
                            {row.tutee_english_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`font-black text-xl ${row.hasSigned && row.hasNote ? "text-green-600" : "text-slate-700"}`}
                        >
                          {row.hrs.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          hr
                        </span>
                      </div>
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
                      <div>{statusBadge(row)}</div>
                    </div>

                    {/* 展開的操作區 */}
                    {isExpanded && (
                      <div className="bg-blue-50/30 border-t border-blue-100 px-6 py-4">
                        <div className="flex flex-wrap gap-3 items-center">
                          <span className="text-xs font-bold text-slate-500">
                            快速操作：
                          </span>

                          {/* 簽到按鈕 */}
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

                          {/* 課堂紀錄按鈕 */}
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 申請證書 */}
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

  // ═══════════════════════════════════════════════════════
  // JSX
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center space-x-8">
          <img src={logoImg} alt="Logo" className="h-8 w-auto object-contain" />
          <nav className="hidden md:flex space-x-1 bg-slate-100 p-1 rounded-lg">
            {[
              ["home", "首頁"],
              ["find-students", "尋找學生"],
              ["schedule", "課表"],
              ["hours", "輔導時數"],
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-1.5 font-bold rounded-md shadow-sm text-sm transition ${activeTab === tab ? "bg-white text-primary" : "text-slate-500 hover:text-primary"}`}
              >
                {label}
              </button>
            ))}
          </nav>
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
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
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
              {[
                { tab: "home", icon: <Home size={20} />, label: "首頁主控台" },
                {
                  tab: "profile-nav",
                  icon: <User size={20} />,
                  label: "個人資訊",
                  isNav: true,
                },
                {
                  tab: "my-student",
                  icon: <UserCheck size={20} />,
                  label: "我的學生",
                },
                {
                  tab: "schedule",
                  icon: <Calendar size={20} />,
                  label: "課表",
                },
              ].map(({ tab, icon, label, isNav }) => (
                <li
                  key={tab}
                  onClick={() =>
                    isNav ? navigate("/profile") : setActiveTab(tab)
                  }
                  className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === tab ? "bg-primary/10 text-primary font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-primary"}`}
                >
                  <span
                    className={`mr-4 ${activeTab === tab ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                  >
                    {icon}
                  </span>
                  {label}
                </li>
              ))}
              <li
                onClick={() => setActiveTab("hours")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition group ${activeTab === "hours" ? "bg-primary/10 text-primary font-bold" : "text-slate-600 hover:bg-slate-50 hover:text-primary"}`}
              >
                <Award
                  size={20}
                  className={`mr-4 ${activeTab === "hours" ? "text-primary" : "text-slate-400 group-hover:text-primary"}`}
                />
                輔導時數
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
                />
                審查結果
                {userInfo.certification_status === "resubmit" && (
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full shadow-sm" />
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

      {/* ── Modals ── */}

      {/* 編輯課程 */}
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
                    上課日期
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
                      開始
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
                      結束
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
                的課程將全部取消。過去已完成的輔導時數不受影響。
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

export default TutorDashboard;
