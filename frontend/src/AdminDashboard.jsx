import React, { useState, useEffect } from "react";
import {
  User,
  Users,
  Globe,
  FileCheck,
  Bell,
  MessageSquare,
  ChevronDown,
  LogOut,
  Clock,
  CheckCircle,
  Search,
  LayoutGrid,
  List,
  ArrowLeft,
  ClipboardList,
  Eye,
  FileText,
  X,
  AlertTriangle,
  Download,
  CheckSquare,
  XCircle,
  ClipboardCheck,
  BookOpen,
  ChevronRight,
  BadgeCheck,
  UserCheck,
  AlertCircle,
  Award,
  FolderOpen,
  Calendar,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoImg from "./assets/csl-Logo.png";

function AdminDashboard() {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("adminActiveTab") || "home",
  );
  const [viewMode, setViewMode] = useState("grid");
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [pendingReviews, setPendingReviews] = useState([]);
  const [approvedReviews, setApprovedReviews] = useState([]);
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    student: null,
  });
  const [previewFileUrl, setPreviewFileUrl] = useState(null);

  // 緊急通報
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [alertDetailModal, setAlertDetailModal] = useState({
    isOpen: false,
    alert: null,
  });

  // ── 簽到管理相關 state ──────────────────────────────────
  const [checkinSubTab, setCheckinSubTab] = useState("checkin-records");
  const [checkinRecords, setCheckinRecords] = useState([]);
  const [makeupCheckins, setMakeupCheckins] = useState([]);
  const [classNotes, setClassNotes] = useState([]);
  const [makeupNotes, setMakeupNotes] = useState([]);
  const [pendingCounts, setPendingCounts] = useState({
    makeupCheckinCount: 0,
    makeupNotesCount: 0,
    total: 0,
  });
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    data: null,
    type: "",
  });
  const [certActiveTab, setCertActiveTab] = useState("cert");
  const [certApps, setCertApps] = useState([]);
  const fetchCertApps = () => {
    fetch("http://localhost:3001/api/admin/certificate-applications")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setCertApps(result.data);
      });
  };

  const handleCertReview = async (id, action) => {
    const msg =
      action === "issued"
        ? "確定要核發這張證書給該學生嗎？"
        : "確定要駁回此申請？";
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch(
        `http://localhost:3001/api/admin/certificate-applications/${id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) fetchCertApps(); // 成功後重新撈取列表
    } catch {
      alert("連線錯誤");
    }
  };

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const [userInfo, setUserInfo] = useState({
    chineseName: "管理員",
    englishName: "Admin",
    role: "admin",
  });

  const [unmatchRequests, setUnmatchRequests] = useState([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  // 管理員手動新增時數
  const [addHoursModal, setAddHoursModal] = useState(false);
  const [addHoursSlots, setAddHoursSlots] = useState([
    { date: "", startTime: "", endTime: "" },
  ]);

  useEffect(() => {
    const account = localStorage.getItem("loggedInAccount");
    if (account) {
      fetch(`http://localhost:3001/api/user/${account}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success) setUserInfo(result.data);
        });
    } else navigate("/");
  }, [navigate]);

  const fetchEmergencyAlerts = () => {
    fetch("http://localhost:3001/api/admin/emergency-alerts")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setEmergencyAlerts(result.data);
          setUnreadCount(result.data.filter((a) => !a.is_read).length);
        }
      });
  };

  const fetchPendingCounts = () => {
    fetch("http://localhost:3001/api/admin/pending-counts")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setPendingCounts(result);
      });
  };

  const fetchCheckinRecords = () => {
    fetch("http://localhost:3001/api/admin/checkin-records")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setCheckinRecords(result.data);
      });
  };

  const fetchMakeupCheckins = () => {
    fetch("http://localhost:3001/api/admin/makeup-checkins")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setMakeupCheckins(result.data);
      });
  };

  const fetchClassNotes = () => {
    fetch("http://localhost:3001/api/admin/class-notes")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setClassNotes(result.data);
      });
  };

  const fetchMakeupNotes = () => {
    fetch("http://localhost:3001/api/admin/makeup-notes")
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setMakeupNotes(result.data);
      });
  };

  const fetchStudents = () => {
    if (
      activeTab === "tutors" ||
      activeTab === "tutees" ||
      activeTab === "home" ||
      activeTab === "review-data"
    ) {
      fetch(`http://localhost:3001/api/admin/users/tutor`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            if (activeTab === "tutors" || activeTab === "review-data")
              setStudentsList(result.data);
            setPendingReviews(
              result.data.filter(
                (s) =>
                  s.certification_file && s.certification_status === "pending",
              ),
            );
            setApprovedReviews(
              result.data.filter(
                (s) =>
                  s.certification_file && s.certification_status === "approved",
              ),
            );
          }
        });

      if (activeTab === "tutees") {
        fetch(`http://localhost:3001/api/admin/users/tutee`)
          .then((res) => res.json())
          .then((result) => {
            if (result.success) setStudentsList(result.data);
          });
      }
    }
  };

  const fetchUnmatchRequests = () =>
    fetch("http://localhost:3001/api/admin/unmatch-requests")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setUnmatchRequests(res.data);
      });

  useEffect(() => {
    fetchStudents();
    setSelectedStudent(null);
  }, [activeTab]);

  useEffect(() => {
    fetchEmergencyAlerts();
    fetchPendingCounts();
    const interval = setInterval(() => {
      fetchEmergencyAlerts();
      fetchPendingCounts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "checkin-mgmt") {
      fetchCheckinRecords();
      fetchMakeupCheckins();
      fetchClassNotes();
      fetchMakeupNotes();
      fetchUnmatchRequests();
    }
    if (activeTab === "cert-apps") {
      fetchCertApps();
    }
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem("adminActiveTab", activeTab);
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("loggedInAccount");
    navigate("/");
  };

  const handleReviewSubmit = async (status) => {
    try {
      const response = await fetch(
        "http://localhost:3001/api/admin/review-cert",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: reviewModal.student.student_id,
            status,
          }),
        },
      );
      const result = await response.json();
      if (result.success) {
        alert(
          status === "approved" ? "✅ 已通過審查！" : "⚠️ 已通知學生補件！",
        );
        setReviewModal({ isOpen: false, student: null });
        fetchStudents();
      }
    } catch (error) {
      alert("連線錯誤");
    }
  };

  const handleOpenAlert = async (alert) => {
    setAlertDetailModal({ isOpen: true, alert });
    if (!alert.is_read) {
      try {
        await fetch(
          `http://localhost:3001/api/admin/emergency-alerts/${alert.id}/read`,
          { method: "POST" },
        );
        fetchEmergencyAlerts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleMakeupCheckinReview = async (id, action) => {
    const msg = action === "approved" ? "核准此補簽到申請？" : "駁回此申請？";
    if (!window.confirm(`確認${msg}`)) return;
    try {
      const res = await fetch(
        `http://localhost:3001/api/admin/makeup-checkins/${id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        fetchMakeupCheckins();
        fetchPendingCounts();
        setDetailModal({ isOpen: false, data: null, type: "" });
      }
    } catch {
      alert("連線錯誤");
    }
  };

  const handleMakeupNotesReview = async (id, action) => {
    const msg = action === "approved" ? "核准此補填申請？" : "駁回此申請？";
    if (!window.confirm(`確認${msg}`)) return;
    try {
      const res = await fetch(
        `http://localhost:3001/api/admin/makeup-notes/${id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        fetchMakeupNotes();
        fetchPendingCounts();
        setDetailModal({ isOpen: false, data: null, type: "" });
      }
    } catch {
      alert("連線錯誤");
    }
  };

  const handleUnmatchReview = async (id, action) => {
    const msg =
      action === "approved"
        ? "確認核准解除配對？未來課程將全部取消。"
        : "確認駁回此申請？";
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch(
        `http://localhost:3001/api/admin/unmatch-requests/${id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const data = await res.json();
      alert(data.message);
      if (data.success) fetchUnmatchRequests();
    } catch {
      alert("連線錯誤");
    }
  };

  // ─── 手動新增時數相關函式 ───
  const handleAddHoursSlotChange = (index, field, value) => {
    const newSlots = [...addHoursSlots];
    newSlots[index][field] = value;
    setAddHoursSlots(newSlots);
  };

  const handleAddNewHoursSlot = () => {
    // 貼心設計：自動複製最後一筆的時間，讓管理員只需改日期
    const lastSlot = addHoursSlots[addHoursSlots.length - 1];
    setAddHoursSlots([
      ...addHoursSlots,
      {
        date: "",
        startTime: lastSlot?.startTime || "",
        endTime: lastSlot?.endTime || "",
      },
    ]);
  };

  const handleRemoveHoursSlot = (index) => {
    setAddHoursSlots(addHoursSlots.filter((_, i) => i !== index));
  };

  // 試算本次新增的總時數
  const calculateTotalNewHours = () => {
    let total = 0;
    addHoursSlots.forEach((s) => {
      if (s.startTime && s.endTime) {
        const diff =
          (new Date(`1970-01-01T${s.endTime}`) -
            new Date(`1970-01-01T${s.startTime}`)) /
          3600000;
        if (diff > 0) total += diff;
      }
    });
    return total.toFixed(1);
  };

  const handleAddHoursSubmit = async (e) => {
    e.preventDefault();
    // 檢查是否每一筆都有填寫完整
    for (const s of addHoursSlots) {
      if (!s.date || !s.startTime || !s.endTime) {
        return alert("請確認所有欄位都已填寫完整！");
      }
      if (s.startTime >= s.endTime) {
        return alert("時間設定有誤：結束時間必須晚於開始時間！");
      }
    }

    try {
      const res = await fetch("http://localhost:3001/api/admin/add-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: selectedStudent.account,
          slots: addHoursSlots, // 🌟 傳送整個陣列
        }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setAddHoursModal(false);
        setAddHoursSlots([{ date: "", startTime: "", endTime: "" }]);
      }
    } catch {
      alert("連線錯誤");
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("zh-TW", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatClassDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const ROLE_MAP = { tutor: "老師", tutee: "學生" };
  const TARGET_ROLE_MAP = { tutor: "老師", tutee: "學生" };

  const statusBadge = (status) => {
    if (status === "pending")
      return (
        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1 w-fit">
          <Clock size={11} /> 待審核
        </span>
      );
    if (status === "approved")
      return (
        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1 w-fit">
          <CheckCircle size={11} /> 已核准
        </span>
      );
    if (status === "rejected")
      return (
        <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1 w-fit">
          <XCircle size={11} /> 已駁回
        </span>
      );
    return null;
  };

  const renderReviewData = () => {
    return (
      <main className="flex-grow flex flex-col gap-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <FileCheck size={18} className="text-purple-600" /> 審查資料
            </h2>
          </div>

          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setCertActiveTab("cert")}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap transition border-b-2 ${certActiveTab === "cert" ? "border-primary text-primary bg-primary/5" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
            >
              <Award size={15} /> 資格證明
              {pendingReviews.length > 0 && (
                <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-black rounded-full">
                  {pendingReviews.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setCertActiveTab("hours")}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap transition border-b-2 ${certActiveTab === "hours" ? "border-primary text-primary bg-primary/5" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
            >
              <Clock size={15} /> 時數證明
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-black rounded-full">
                即將開放
              </span>
            </button>
          </div>

          {certActiveTab === "cert" && (
            <div className="p-6">
              {studentsList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-medium">
                  <FileCheck
                    size={40}
                    className="mx-auto mb-3 text-slate-200"
                  />
                  尚無資格證明資料
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {pendingReviews.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-orange-600 flex items-center gap-2 mb-3">
                        <Clock size={15} /> 待審核（{pendingReviews.length} 件）
                      </h3>
                      <div className="flex flex-col gap-3">
                        {pendingReviews.map((student, idx) => (
                          <div
                            key={idx}
                            className="p-5 border border-orange-200 bg-orange-50/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex-grow">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                  小老師
                                </span>
                                <h4 className="font-bold text-slate-800">
                                  {student.chinese_name} ({student.student_id})
                                </h4>
                              </div>
                              {student.certification_file && (
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="text-sm text-slate-500 truncate max-w-xs">
                                    {student.certification_file}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setPreviewFileUrl(
                                        `http://localhost:3001/api/preview/${student.certification_file}`,
                                      )
                                    }
                                    className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg transition"
                                  >
                                    <Eye size={13} className="mr-1" /> 預覽
                                  </button>
                                  <a
                                    href={`http://localhost:3001/api/preview/${student.certification_file}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="flex items-center text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition"
                                  >
                                    <Download size={13} className="mr-1" /> 下載
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() =>
                                  setReviewModal({ isOpen: true, student })
                                }
                                className="px-4 py-2 bg-slate-700 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition shadow-sm"
                              >
                                開始審查
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(() => {
                    const reviewed = studentsList.filter(
                      (s) =>
                        s.certification_file &&
                        s.certification_status !== "pending",
                    );
                    if (reviewed.length === 0) return null;
                    return (
                      <div className="mt-4">
                        <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2 mb-3">
                          <CheckCircle size={15} /> 已審核（{reviewed.length}{" "}
                          件）
                        </h3>
                        <div className="flex flex-col gap-3">
                          {reviewed.map((student, idx) => (
                            <div
                              key={idx}
                              className={`p-5 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${student.certification_status === "approved" ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/20"}`}
                            >
                              <div className="flex-grow">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-bold text-slate-700">
                                    {student.chinese_name} ({student.student_id}
                                    )
                                  </h4>
                                </div>
                                {student.certification_file && (
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-sm text-slate-400 truncate max-w-xs">
                                      {student.certification_file}
                                    </span>
                                    <button
                                      onClick={() =>
                                        setPreviewFileUrl(
                                          `http://localhost:3001/api/preview/${student.certification_file}`,
                                        )
                                      }
                                      className="flex items-center text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition"
                                    >
                                      <Eye size={13} className="mr-1" /> 預覽
                                    </button>
                                    <a
                                      href={`http://localhost:3001/api/preview/${student.certification_file}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                      className="flex items-center text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition"
                                    >
                                      <Download size={13} className="mr-1" />{" "}
                                      下載
                                    </a>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {student.certification_status ===
                                  "approved" && (
                                  <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                    <CheckCircle size={13} /> 已通過
                                  </span>
                                )}
                                {student.certification_status ===
                                  "resubmit" && (
                                  <span className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                                    <XCircle size={13} /> 已退件
                                  </span>
                                )}
                                <button
                                  onClick={() =>
                                    setReviewModal({ isOpen: true, student })
                                  }
                                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:border-slate-300 transition"
                                >
                                  重新審查
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const noFile = studentsList.filter(
                      (s) => !s.certification_file,
                    );
                    if (noFile.length === 0) return null;
                    return (
                      <div className="mt-4">
                        <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-3">
                          尚未上傳（{noFile.length} 人）
                        </h3>
                        <div className="flex flex-col gap-2">
                          {noFile.map((student, idx) => (
                            <div
                              key={idx}
                              className="px-5 py-3 border border-slate-100 rounded-xl flex items-center justify-between bg-slate-50/50"
                            >
                              <span className="text-sm font-medium text-slate-500">
                                {student.chinese_name} ({student.student_id})
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                尚未上傳文件
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {certActiveTab === "hours" && (
            <div className="py-16 text-center text-slate-400 font-medium">
              <Clock size={40} className="mx-auto mb-3 text-slate-200" />
              時數證明審查功能即將開放
            </div>
          )}
        </div>
      </main>
    );
  };

  // ── 介面：簽到管理 ──────────────────────────────────────
  const renderCheckinMgmt = () => {
    const subTabs = [
      {
        id: "checkin-records",
        label: "一般簽到紀錄",
        icon: <CheckSquare size={15} />,
        count: null,
      },
      {
        id: "makeup-checkins",
        label: "補簽到審查",
        icon: <Clock size={15} />,
        count: makeupCheckins.filter((m) => m.status === "pending").length,
      },
      {
        id: "class-notes",
        label: "課堂紀錄",
        icon: <BookOpen size={15} />,
        count: null,
      },
      {
        id: "makeup-notes",
        label: "補填紀錄審查",
        icon: <FileText size={15} />,
        count: makeupNotes.filter((m) => m.status === "pending").length,
      },
    ];

    return (
      <main className="flex-grow flex flex-col gap-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {subTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCheckinSubTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-bold whitespace-nowrap transition border-b-2 ${
                  checkinSubTab === tab.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {checkinSubTab === "checkin-records" && (
            <div className="p-0">
              {checkinRecords.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-medium">
                  尚無任何簽到紀錄
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] px-6 py-3 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>上課日期 / 時間</span>
                    <span>老師</span>
                    <span>學生</span>
                    <span>老師簽到</span>
                    <span>學生簽到</span>
                  </div>
                  {checkinRecords.map((rec) => {
                    const [y, m, d] = rec.class_date.split("-").map(Number);
                    const displayDate = new Date(y, m - 1, d);
                    return (
                      <div
                        key={rec.class_id}
                        className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr] px-6 py-4 items-center gap-2 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-bold uppercase">
                              {displayDate.toLocaleDateString("en-US", {
                                month: "short",
                              })}
                            </span>
                            <span className="text-sm font-black leading-none">
                              {displayDate.getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 text-sm">
                              {rec.class_date}
                            </p>
                            <p className="text-xs text-slate-400">
                              {rec.start_time?.substring(0, 5)} ~{" "}
                              {rec.end_time?.substring(0, 5)}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-slate-700">
                          {rec.tutor_chinese_name || rec.tutor_english_name}
                        </div>
                        <div className="text-sm font-medium text-slate-700">
                          {rec.tutee_chinese_name || rec.tutee_english_name}
                        </div>
                        <div>
                          {rec.tutor_signed_at ? (
                            <div>
                              <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                <CheckCircle size={13} /> 已簽到
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatDateTime(rec.tutor_signed_at)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold">
                              — 未簽到
                            </span>
                          )}
                        </div>
                        <div>
                          {rec.tutee_signed_at ? (
                            <div>
                              <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                <CheckCircle size={13} /> 已簽到
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatDateTime(rec.tutee_signed_at)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold">
                              — 未簽到
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {checkinSubTab === "makeup-checkins" && (
            <div className="p-0">
              {makeupCheckins.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-medium">
                  尚無補簽到申請
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] px-6 py-3 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>上課日期 / 時間</span>
                    <span>申請者</span>
                    <span>身份</span>
                    <span>狀態</span>
                    <span>操作</span>
                  </div>
                  {makeupCheckins.map((item) => {
                    const [y, m, d] = item.class_date.split("-").map(Number);
                    const displayDate = new Date(y, m - 1, d);
                    return (
                      <div
                        key={item.id}
                        className={`grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_auto] px-6 py-4 items-center gap-3 transition ${
                          item.status === "pending"
                            ? "bg-amber-50/30 hover:bg-amber-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${item.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                          >
                            <span className="text-[9px] font-bold uppercase">
                              {displayDate.toLocaleDateString("en-US", {
                                month: "short",
                              })}
                            </span>
                            <span className="text-sm font-black leading-none">
                              {displayDate.getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 text-sm">
                              {item.class_date}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.start_time?.substring(0, 5)} ~{" "}
                              {item.end_time?.substring(0, 5)}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-700 text-sm">
                            {item.chinese_name || item.english_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            申請時間：{formatDateTime(item.created_at)}
                          </p>
                        </div>
                        <div className="text-sm font-bold text-slate-600">
                          {ROLE_MAP[item.role]}
                        </div>
                        <div>{statusBadge(item.status)}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setDetailModal({
                                isOpen: true,
                                data: item,
                                type: "makeup-checkin",
                              })
                            }
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition flex items-center gap-1"
                          >
                            <Eye size={13} /> 查看
                          </button>
                          {item.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleMakeupCheckinReview(item.id, "approved")
                                }
                                className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition"
                              >
                                核准
                              </button>
                              <button
                                onClick={() =>
                                  handleMakeupCheckinReview(item.id, "rejected")
                                }
                                className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition"
                              >
                                駁回
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {checkinSubTab === "class-notes" && (
            <div className="p-0">
              {classNotes.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-medium">
                  尚無課堂紀錄
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] px-6 py-3 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>上課日期 / 時間</span>
                    <span>填寫者</span>
                    <span>身份</span>
                    <span>填寫時間</span>
                    <span>查看</span>
                  </div>
                  {classNotes.map((note) => {
                    const [y, m, d] = note.class_date.split("-").map(Number);
                    const displayDate = new Date(y, m - 1, d);
                    return (
                      <div
                        key={note.id}
                        className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_auto] px-6 py-4 items-center gap-3 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-bold uppercase">
                              {displayDate.toLocaleDateString("en-US", {
                                month: "short",
                              })}
                            </span>
                            <span className="text-sm font-black leading-none">
                              {displayDate.getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 text-sm">
                              {note.class_date}
                            </p>
                            <p className="text-xs text-slate-400">
                              {note.start_time?.substring(0, 5)} ~{" "}
                              {note.end_time?.substring(0, 5)}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-700 text-sm">
                            {note.chinese_name || note.english_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {note.student_id}
                          </p>
                        </div>
                        <div className="text-sm font-bold text-slate-600">
                          {ROLE_MAP[note.role]}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(note.updated_at)}
                        </div>
                        <div>
                          <button
                            onClick={() =>
                              setDetailModal({
                                isOpen: true,
                                data: note,
                                type: "notes",
                              })
                            }
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition flex items-center gap-1"
                          >
                            <Eye size={13} /> 查看
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {checkinSubTab === "makeup-notes" && (
            <div className="p-0">
              {makeupNotes.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-medium">
                  尚無補填申請
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] px-6 py-3 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>上課日期 / 時間</span>
                    <span>申請者</span>
                    <span>身份</span>
                    <span>狀態</span>
                    <span>操作</span>
                  </div>
                  {makeupNotes.map((item) => {
                    const [y, m, d] = item.class_date.split("-").map(Number);
                    const displayDate = new Date(y, m - 1, d);
                    return (
                      <div
                        key={item.id}
                        className={`grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_auto] px-6 py-4 items-center gap-3 transition ${item.status === "pending" ? "bg-amber-50/30 hover:bg-amber-50" : "hover:bg-slate-50"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${item.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                          >
                            <span className="text-[9px] font-bold uppercase">
                              {displayDate.toLocaleDateString("en-US", {
                                month: "short",
                              })}
                            </span>
                            <span className="text-sm font-black leading-none">
                              {displayDate.getDate()}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 text-sm">
                              {item.class_date}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.start_time?.substring(0, 5)} ~{" "}
                              {item.end_time?.substring(0, 5)}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-700 text-sm">
                            {item.chinese_name || item.english_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            申請時間：{formatDateTime(item.created_at)}
                          </p>
                        </div>
                        <div className="text-sm font-bold text-slate-600">
                          {ROLE_MAP[item.role]}
                        </div>
                        <div>{statusBadge(item.status)}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setDetailModal({
                                isOpen: true,
                                data: item,
                                type: "makeup-notes",
                              })
                            }
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition flex items-center gap-1"
                          >
                            <Eye size={13} /> 查看
                          </button>
                          {item.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleMakeupNotesReview(item.id, "approved")
                                }
                                className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition"
                              >
                                核准
                              </button>
                              <button
                                onClick={() =>
                                  handleMakeupNotesReview(item.id, "rejected")
                                }
                                className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition"
                              >
                                駁回
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    );
  };

  // --- 介面：緊急通報列表 ---
  const renderEmergencyAlerts = () => (
    <main className="flex-grow flex flex-col gap-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between items-center">
          <h2 className="font-bold text-red-700 flex items-center">
            <AlertTriangle size={18} className="mr-2" /> 緊急通報列表
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount} 未讀
              </span>
            )}
          </h2>
          <button
            onClick={fetchEmergencyAlerts}
            className="text-xs text-slate-500 hover:text-primary font-bold px-3 py-1.5 bg-white rounded-lg border border-slate-200 transition"
          >
            重新整理
          </button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {emergencyAlerts.length > 0 ? (
            emergencyAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => handleOpenAlert(alert)}
                className={`p-4 rounded-xl border cursor-pointer transition hover:shadow-md flex justify-between items-center gap-4 ${
                  !alert.is_read
                    ? "bg-red-50 border-red-200 hover:border-red-300"
                    : "bg-white border-slate-100 hover:border-slate-200 opacity-75"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${!alert.is_read ? "bg-red-500" : "bg-slate-300"}`}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${!alert.is_read ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}
                      >
                        🚨 緊急通報
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(alert.created_at)}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 text-sm">
                      {alert.sender_role === "tutor"
                        ? `${alert.chinese_name || alert.english_name} 老師回報：找不到 ${alert.target_chinese_name || alert.target_english_name} 學生`
                        : `${alert.chinese_name || alert.english_name} 學生回報：找不到 ${alert.target_chinese_name || alert.target_english_name} 老師`}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      上課時間：{formatClassDate(alert.class_date)}{" "}
                      {alert.start_time?.substring(0, 5)} ~{" "}
                      {alert.end_time?.substring(0, 5)}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  點擊查看 →
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400 font-medium">
              <AlertTriangle
                size={40}
                className="mx-auto mb-3 text-slate-200"
              />
              目前沒有緊急通報
            </div>
          )}
        </div>
      </div>
    </main>
  );

  // --- 介面：首頁儀表板 ---
  const renderHomeDashboard = () => (
    <>
      <main className="flex-grow flex flex-col gap-6">
        {unreadCount > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between items-center">
              <h2 className="font-bold text-red-700 flex items-center">
                <AlertTriangle size={18} className="mr-2 animate-pulse" />{" "}
                緊急通報 ({unreadCount} 則未讀)
              </h2>
              <button
                onClick={() => setActiveTab("emergency")}
                className="text-xs text-red-600 hover:underline font-bold"
              >
                查看全部 →
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {emergencyAlerts
                .filter((a) => !a.is_read)
                .slice(0, 3)
                .map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => handleOpenAlert(alert)}
                    className="p-4 rounded-xl border border-red-100 bg-red-50/50 hover:shadow-md cursor-pointer transition"
                  >
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                      {alert.sender_role === "tutor"
                        ? `${alert.chinese_name || alert.english_name} 老師回報：找不到學生 ${alert.target_chinese_name || alert.target_english_name}`
                        : `${alert.chinese_name || alert.english_name} 學生回報：找不到老師 ${alert.target_chinese_name || alert.target_english_name}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 ml-4">
                      {formatClassDate(alert.class_date)}{" "}
                      {alert.start_time?.substring(0, 5)} ~{" "}
                      {alert.end_time?.substring(0, 5)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {pendingCounts.total > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex justify-between items-center">
              <h2 className="font-bold text-amber-700 flex items-center gap-2">
                <Clock size={18} /> 待審核申請（{pendingCounts.total} 件）
              </h2>
              <button
                onClick={() => setActiveTab("checkin-mgmt")}
                className="text-xs text-amber-600 hover:underline font-bold"
              >
                前往審查 →
              </button>
            </div>
            <div className="p-5 flex gap-4">
              {pendingCounts.makeupCheckinCount > 0 && (
                <div
                  onClick={() => {
                    setActiveTab("checkin-mgmt");
                    setCheckinSubTab("makeup-checkins");
                  }}
                  className="flex-1 p-4 bg-amber-50 border border-amber-100 rounded-xl cursor-pointer hover:shadow-md transition"
                >
                  <p className="text-3xl font-black text-amber-600">
                    {pendingCounts.makeupCheckinCount}
                  </p>
                  <p className="text-sm font-bold text-amber-700 mt-1">
                    補簽到待審
                  </p>
                </div>
              )}
              {pendingCounts.makeupNotesCount > 0 && (
                <div
                  onClick={() => {
                    setActiveTab("checkin-mgmt");
                    setCheckinSubTab("makeup-notes");
                  }}
                  className="flex-1 p-4 bg-blue-50 border border-blue-100 rounded-xl cursor-pointer hover:shadow-md transition"
                >
                  <p className="text-3xl font-black text-blue-600">
                    {pendingCounts.makeupNotesCount}
                  </p>
                  <p className="text-sm font-bold text-blue-700 mt-1">
                    補填紀錄待審
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
          <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
            <h2 className="font-bold text-orange-700 flex items-center">
              <Clock size={18} className="mr-2" /> 待審查資料 (
              {pendingReviews.length})
            </h2>
            {pendingReviews.length > 0 && (
              <button
                onClick={() => setActiveTab("review-data")}
                className="text-xs text-orange-600 hover:underline font-bold"
              >
                前往審查 →
              </button>
            )}
          </div>
          <div className="p-4 flex flex-col gap-3">
            {pendingReviews.length > 0 ? (
              pendingReviews.map((student, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                        小老師
                      </span>
                      <h4 className="font-bold text-slate-800">
                        {student.chinese_name} ({student.student_id})
                      </h4>
                    </div>
                    <div className="flex items-center text-sm text-slate-500 mt-2">
                      <button
                        onClick={() =>
                          window.open(
                            `http://localhost:3001/api/preview/${student.certification_file}`,
                          )
                        }
                        className="flex items-center text-primary hover:underline font-bold bg-primary/5 px-2 py-1 rounded-md"
                      >
                        <Eye size={14} className="mr-1" /> 預覽檔案
                      </button>
                      <span className="ml-3 truncate max-w-[150px]">
                        {student.certification_file}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setReviewModal({ isOpen: true, student })}
                    className="px-5 py-2.5 bg-slate-700 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition shadow-sm"
                  >
                    開始審查
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 font-medium">
                目前沒有待審查的資料 🎉
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-2">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-700 flex items-center">
              <CheckCircle size={18} className="mr-2 text-green-500" />{" "}
              最近已審查
            </h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {approvedReviews.length > 0 ? (
              approvedReviews.map((student, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4"
                >
                  <div>
                    <h4 className="font-bold text-slate-600">
                      {student.chinese_name} ({student.student_id})
                    </h4>
                    <p className="text-sm text-slate-500 mt-1">
                      文件：{student.certification_file}
                    </p>
                  </div>
                  <div className="flex items-center text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-sm font-bold">
                    <CheckCircle size={16} className="mr-1.5" /> 已通過
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 font-medium">
                尚無已審查紀錄
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );

  // --- 介面：學生名單 ---
  const renderStudentDirectory = () => {
    if (selectedStudent) {
      return (
        <main className="flex-grow bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center">
            <button
              onClick={() => setSelectedStudent(null)}
              className="flex items-center text-slate-500 hover:text-primary transition mr-4"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-bold text-slate-800 text-lg">
              {selectedStudent.chinese_name} ({selectedStudent.english_name})
              的詳細資料
            </h2>
          </div>
          <div className="p-8">
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
              <div className="w-24 h-24 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-3xl">
                {selectedStudent.english_name
                  ? selectedStudent.english_name.charAt(0).toUpperCase()
                  : "U"}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 mb-1">
                  {selectedStudent.chinese_name}
                </h3>
                <p className="text-slate-500 font-medium">
                  {selectedStudent.student_id} •{" "}
                  {selectedStudent.department || "未填寫系所"}
                </p>
                <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                  {activeTab === "tutors" ? "小老師 Tutor" : "外籍生 Tutee"}
                </span>
              </div>
              {/* 👇 新增這顆按鈕，只有在看小老師時才顯示 */}
              {activeTab === "tutors" && (
                <button
                  onClick={() => setAddHoursModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition shadow-sm"
                >
                  <Plus size={16} /> 新增輔導時數
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(selectedStudent).map(([key, value]) => {
                if (key === "certification_file" && value) {
                  return (
                    <div
                      key={key}
                      className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:col-span-2"
                    >
                      <span className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                        資格證明文件 Certification
                      </span>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center text-slate-700 font-bold truncate max-w-sm">
                          <FileText
                            size={18}
                            className="mr-2 text-primary flex-shrink-0"
                          />
                          {value}
                        </div>
                        <div className="flex space-x-3 flex-shrink-0">
                          <button
                            onClick={() =>
                              setPreviewFileUrl(
                                `http://localhost:3001/uploads/${value}`,
                              )
                            }
                            className="flex items-center bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition"
                          >
                            <Eye size={16} className="mr-1.5" /> 預覽審查
                          </button>
                          <a
                            href={`http://localhost:3001/uploads/${value}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-300 transition"
                          >
                            <Download size={16} className="mr-1.5" /> 下載檔案
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={key}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col"
                  >
                    <span className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm text-slate-800 font-medium break-words">
                      {value === null || value === "" ? (
                        <span className="text-slate-300 italic">空值</span>
                      ) : typeof value === "object" ? (
                        JSON.stringify(value)
                      ) : (
                        String(value)
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="flex-grow flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-800 text-lg">
            {activeTab === "tutors" ? "本系學生 (小老師) 清單" : "外籍生清單"}
          </h2>
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-slate-400 hover:bg-slate-50"}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto bg-slate-50/30 flex-grow">
          {studentsList.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-medium">
              目前資料庫沒有找到任何相關學生資料
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {studentsList.map((student, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedStudent(student)}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center hover:shadow-md hover:border-primary/30 cursor-pointer transition-all group"
                >
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary rounded-full flex items-center justify-center font-bold text-2xl mb-4 transition-colors">
                    {student.english_name
                      ? student.english_name.charAt(0).toUpperCase()
                      : "S"}
                  </div>
                  <h4 className="font-bold text-slate-800 text-center">
                    {student.chinese_name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {student.student_id}
                  </p>
                </div>
              ))}
            </div>
          ) : (
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
                      {student.english_name
                        ? student.english_name.charAt(0).toUpperCase()
                        : "S"}
                    </div>
                  </div>
                  <div className="flex-1 font-bold text-slate-800">
                    {student.chinese_name}{" "}
                    <span className="text-slate-400 text-sm ml-2 font-normal">
                      {student.english_name}
                    </span>
                  </div>
                  <div className="flex-1 hidden sm:block text-slate-500 text-sm">
                    {student.student_id}
                  </div>
                  <div className="flex-1 hidden md:block text-slate-500 text-sm">
                    {student.department || "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  };

  const renderUnmatchRequests = () => (
    <main className="flex-grow flex flex-col gap-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <UserCheck size={18} className="text-purple-600" /> 解除配對申請審查
          </h2>
          <button
            onClick={fetchUnmatchRequests}
            className="text-xs text-slate-500 hover:text-primary font-bold px-3 py-1.5 bg-white rounded-lg border border-slate-200 transition"
          >
            重新整理
          </button>
        </div>
        <div className="p-0">
          {unmatchRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-medium">
              目前沒有解除配對申請
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto] px-6 py-3 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>申請者</span>
                <span>小老師</span>
                <span>外籍生</span>
                <span>身份</span>
                <span>狀態</span>
                <span>操作</span>
              </div>
              {unmatchRequests.map((item) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto] px-6 py-4 items-center gap-3 transition ${item.status === "pending" ? "bg-amber-50/30 hover:bg-amber-50" : "hover:bg-slate-50"}`}
                >
                  <div>
                    <p className="font-bold text-slate-700 text-sm">
                      {item.requester_chinese_name ||
                        item.requester_english_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      原因：{item.reason}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    {item.tutor_chinese_name || item.tutor_english_name}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">
                    {item.tutee_chinese_name || item.tutee_english_name}
                  </div>
                  <div className="text-sm font-bold text-slate-600">
                    {item.requester_role === "tutor" ? "小老師" : "外籍生"}
                  </div>
                  <div>{statusBadge(item.status)}</div>
                  <div className="flex gap-2">
                    {item.status === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            handleUnmatchReview(item.id, "approved")
                          }
                          className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition"
                        >
                          核准
                        </button>
                        <button
                          onClick={() =>
                            handleUnmatchReview(item.id, "rejected")
                          }
                          className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition"
                        >
                          駁回
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );

  // 新增這個渲染證書申請列表的畫面
  const renderCertApps = () => (
    <main className="flex-grow flex flex-col gap-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <Award size={18} className="text-purple-600" /> 證書申請審查
          </h2>
          <button
            onClick={fetchCertApps}
            className="text-xs text-slate-500 hover:text-primary font-bold px-3 py-1.5 bg-white rounded-lg border border-slate-200 transition"
          >
            重新整理
          </button>
        </div>
        <div className="p-0">
          {certApps.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-medium">
              目前沒有證書申請
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="hidden md:grid grid-cols-[1.5fr_1fr_1.5fr_1fr_auto] px-6 py-3 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>申請者</span>
                <span>已核准時數</span>
                <span>申請時間</span>
                <span>狀態</span>
                <span>操作</span>
              </div>
              {certApps.map((item) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1.5fr_1fr_auto] px-6 py-4 items-center gap-3 transition ${item.status === "pending" ? "bg-amber-50/30 hover:bg-amber-50" : "hover:bg-slate-50"}`}
                >
                  <div>
                    <p className="font-bold text-slate-700 text-sm">
                      {item.chinese_name || item.english_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.student_id}
                    </p>
                  </div>
                  <div className="text-sm font-black text-slate-700">
                    {parseFloat(item.approved_hours).toFixed(1)}{" "}
                    <span className="text-xs font-bold text-slate-400">hr</span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    {formatDateTime(item.created_at)}
                  </div>
                  <div>
                    {item.status === "pending" && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                        待審核
                      </span>
                    )}
                    {item.status === "issued" && (
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        已核發
                      </span>
                    )}
                    {item.status === "rejected" && (
                      <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                        已駁回
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {item.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleCertReview(item.id, "issued")}
                          className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition shadow-sm"
                        >
                          核發證書
                        </button>
                        <button
                          onClick={() => handleCertReview(item.id, "rejected")}
                          className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition"
                        >
                          駁回
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );

  // ── 介面：檔案管理 ──────────────────────────────────────
  const renderFiles = () => {
    const files = [
      {
        name: "輔導時數證書.docx",
        description: "輔導實習時數證明書範本（Certificate of Practicum Hours）",
        path: "輔導時數證書.docx",
      },
    ];

    return (
      <main className="flex-grow flex flex-col gap-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <FolderOpen size={18} className="text-purple-600" /> 檔案管理
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              共 {files.length} 個檔案
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {files.map((file) => (
              <div
                key={file.name}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-purple-200 transition-all flex flex-col gap-4"
              >
                {/* 檔案資訊 */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={22} className="text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm leading-snug break-all">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {file.description}
                    </p>
                  </div>
                </div>

                {/* ✨ 修改這裡：原本的灰色警告拿掉，直接呼叫後端預覽 API 顯示 PDF */}
                <div className="bg-slate-50 rounded-xl border border-slate-100 h-48 overflow-hidden">
                  <iframe
                    src={`http://localhost:3001/api/preview/${file.path}`}
                    className="w-full h-full border-0"
                    title="文件預覽"
                  />
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2 mt-auto">
                  {/* ✨ 修改這裡：開新視窗指向 /api/preview/ 才能在瀏覽器打開 */}
                  <a
                    href={`http://localhost:3001/api/preview/${file.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-200 transition"
                  >
                    <Eye size={13} /> 開新視窗
                  </a>

                  {/* 下載按鈕維持指向 /uploads/，這樣下載下來的才會是真正的 docx 原始檔 */}
                  <a
                    href={`http://localhost:3001/uploads/${file.path}`}
                    download={file.name}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition shadow-sm"
                  >
                    <Download size={13} /> 下載
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 說明提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-700 flex items-start gap-3">
          <span className="text-lg flex-shrink-0 mt-0.5">💡</span>
          <div className="text-xs leading-relaxed">
            如需新增更多範本檔案，請將檔案放置於後端{" "}
            <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">
              uploads/
            </code>{" "}
            資料夾，並在{" "}
            <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">
              renderFiles
            </code>{" "}
            的{" "}
            <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">
              files
            </code>{" "}
            陣列中加入對應項目。
          </div>
        </div>
      </main>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center pl-2">
          <img
            src={logoImg}
            alt="Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
        <div className="flex items-center space-x-5">
          <div className="hidden lg:flex items-center bg-slate-100 px-3 py-1.5 rounded-full">
            <Search size={16} className="text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="搜尋學號或姓名..."
              className="bg-transparent border-none outline-none text-sm text-slate-600 w-40"
            />
          </div>

          <div className="relative" data-notif-dropdown>
            <button
              onClick={() => setNotifDropdownOpen((prev) => !prev)}
              className="relative text-slate-400 hover:text-primary transition"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <Bell size={15} className="text-primary" /> 通知
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      setActiveTab("emergency");
                      setNotifDropdownOpen(false);
                    }}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    查看全部緊急通報 →
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                  {pendingCounts.total > 0 && (
                    <div
                      onClick={() => {
                        setActiveTab("checkin-mgmt");
                        setNotifDropdownOpen(false);
                      }}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-amber-50 cursor-pointer transition"
                    >
                      <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock size={15} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          待審核申請（{pendingCounts.total} 件）
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          補簽到 {pendingCounts.makeupCheckinCount} 件・補填紀錄{" "}
                          {pendingCounts.makeupNotesCount} 件
                        </p>
                      </div>
                    </div>
                  )}
                  {emergencyAlerts
                    .filter((a) => !a.is_read)
                    .slice(0, 5)
                    .map((alert) => (
                      <div
                        key={alert.id}
                        onClick={() => {
                          handleOpenAlert(alert);
                          setNotifDropdownOpen(false);
                        }}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-red-50 cursor-pointer transition bg-red-50/40"
                      >
                        <div className="w-8 h-8 bg-red-100 text-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertTriangle size={15} />
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 animate-pulse" />
                            🚨 緊急通報
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5 truncate">
                            {alert.sender_role === "tutor"
                              ? `${alert.chinese_name || alert.english_name} 老師回報：找不到學生`
                              : `${alert.chinese_name || alert.english_name} 學生回報：找不到老師`}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatDateTime(alert.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  {unreadCount === 0 && pendingCounts.total === 0 && (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">
                      <Bell size={28} className="mx-auto mb-2 text-slate-200" />
                      目前沒有新通知
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <div
              className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                <User size={18} />
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-bold text-slate-800">
                    {userInfo.chineseName || userInfo.englishName || "管理員"}
                  </p>
                  <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
                    Admin
                  </span>
                </div>
                <div className="py-2">
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

      <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-6 gap-8">
        <aside className="w-full md:w-64 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center text-lg">
              快速連結
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 font-medium">
              <li
                onClick={() => setActiveTab("home")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === "home" ? "bg-purple-50 text-purple-600 font-bold" : "hover:bg-slate-50"}`}
              >
                <ClipboardList
                  size={20}
                  className={`mr-4 ${activeTab === "home" ? "text-purple-600" : "text-slate-400"}`}
                />{" "}
                待辦事項
              </li>
              <li
                onClick={() => setActiveTab("tutors")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === "tutors" ? "bg-purple-50 text-purple-600 font-bold" : "hover:bg-slate-50"}`}
              >
                <Users
                  size={20}
                  className={`mr-4 ${activeTab === "tutors" ? "text-purple-600" : "text-slate-400"}`}
                />{" "}
                本系學生
              </li>
              <li
                onClick={() => setActiveTab("tutees")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === "tutees" ? "bg-purple-50 text-purple-600 font-bold" : "hover:bg-slate-50"}`}
              >
                <Globe
                  size={20}
                  className={`mr-4 ${activeTab === "tutees" ? "text-purple-600" : "text-slate-400"}`}
                />{" "}
                外籍生
              </li>
              <li
                onClick={() => setActiveTab("checkin-mgmt")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === "checkin-mgmt" ? "bg-purple-50 text-purple-600 font-bold" : "hover:bg-slate-50"}`}
              >
                <div className="relative mr-4">
                  <ClipboardCheck
                    size={20}
                    className={
                      activeTab === "checkin-mgmt"
                        ? "text-purple-600"
                        : "text-slate-400"
                    }
                  />
                  {pendingCounts.total > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {pendingCounts.total > 9 ? "9+" : pendingCounts.total}
                    </span>
                  )}
                </div>
                簽到管理
              </li>
              <li
                onClick={() => setActiveTab("emergency")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === "emergency" ? "bg-red-50 text-red-600 font-bold" : "hover:bg-slate-50"}`}
              >
                <div className="relative mr-4">
                  <AlertTriangle
                    size={20}
                    className={
                      activeTab === "emergency"
                        ? "text-red-600"
                        : "text-slate-400"
                    }
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                緊急通報
              </li>
              <li
                onClick={() => setActiveTab("review-data")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === "review-data" ? "bg-purple-50 text-purple-600 font-bold" : "hover:bg-slate-50"}`}
              >
                <FileCheck
                  size={20}
                  className={`mr-4 ${activeTab === "review-data" ? "text-purple-600" : "text-slate-400"}`}
                />
                審查資料
                {pendingReviews.length > 0 && (
                  <span className="ml-auto text-[10px] bg-orange-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                    {pendingReviews.length}
                  </span>
                )}
              </li>
              <li
                onClick={() => setActiveTab("unmatch")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === "unmatch" ? "bg-purple-50 text-purple-600 font-bold" : "hover:bg-slate-50"}`}
              >
                <UserCheck
                  size={20}
                  className={`mr-4 ${activeTab === "unmatch" ? "text-purple-600" : "text-slate-400"}`}
                />
                解除配對審查
                {unmatchRequests.filter((r) => r.status === "pending").length >
                  0 && (
                  <span className="ml-auto text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                    {
                      unmatchRequests.filter((r) => r.status === "pending")
                        .length
                    }
                  </span>
                )}
              </li>
              {/* 審查資料下方加入這段 */}
              <li
                onClick={() => setActiveTab("cert-apps")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === "cert-apps" ? "bg-purple-50 text-purple-600 font-bold" : "hover:bg-slate-50"}`}
              >
                <Award
                  size={20}
                  className={`mr-4 ${activeTab === "cert-apps" ? "text-purple-600" : "text-slate-400"}`}
                />
                證書申請
                {/* 顯示紅色的未處理數字提示 */}
                {certApps.filter((a) => a.status === "pending").length > 0 && (
                  <span className="ml-auto text-[10px] bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                    {certApps.filter((a) => a.status === "pending").length}
                  </span>
                )}
              </li>
              {/* ── 新增：檔案管理 ── */}
              <li
                onClick={() => setActiveTab("files")}
                className={`flex items-center p-3 rounded-xl cursor-pointer transition ${activeTab === "files" ? "bg-purple-50 text-purple-600 font-bold" : "hover:bg-slate-50"}`}
              >
                <FolderOpen
                  size={20}
                  className={`mr-4 ${activeTab === "files" ? "text-purple-600" : "text-slate-400"}`}
                />
                檔案
              </li>
            </ul>
          </div>
        </aside>

        {activeTab === "home"
          ? renderHomeDashboard()
          : activeTab === "emergency"
            ? renderEmergencyAlerts()
            : activeTab === "checkin-mgmt"
              ? renderCheckinMgmt()
              : activeTab === "unmatch"
                ? renderUnmatchRequests()
                : activeTab === "review-data"
                  ? renderReviewData()
                  : activeTab === "files"
                    ? renderFiles()
                    : activeTab === "cert-apps" // 👈 加上這行
                      ? renderCertApps() // 👈 加上這行
                      : renderStudentDirectory()}
      </div>

      {/* 詳細內容 Modal */}
      {detailModal.isOpen && detailModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-800">
                {detailModal.type === "makeup-checkin"
                  ? "補簽到申請詳情"
                  : detailModal.type === "makeup-notes"
                    ? "補填紀錄申請詳情"
                    : "課堂紀錄詳情"}
              </h3>
              <button
                onClick={() =>
                  setDetailModal({ isOpen: false, data: null, type: "" })
                }
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-grow">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-xs font-bold text-slate-400 block mb-1">
                    申請者
                  </span>
                  <span className="font-bold text-slate-700 text-sm">
                    {detailModal.data.chinese_name ||
                      detailModal.data.english_name}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-xs font-bold text-slate-400 block mb-1">
                    身份
                  </span>
                  <span className="font-bold text-slate-700 text-sm">
                    {ROLE_MAP[detailModal.data.role]}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-xs font-bold text-slate-400 block mb-1">
                    上課日期
                  </span>
                  <span className="font-bold text-slate-700 text-sm">
                    {detailModal.data.class_date}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-xs font-bold text-slate-400 block mb-1">
                    上課時間
                  </span>
                  <span className="font-bold text-slate-700 text-sm">
                    {detailModal.data.start_time?.substring(0, 5)} ~{" "}
                    {detailModal.data.end_time?.substring(0, 5)}
                  </span>
                </div>
              </div>
              {detailModal.type === "makeup-checkin" && (
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-2">
                    說明原因
                  </span>
                  <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 leading-relaxed border border-slate-100">
                    {detailModal.data.reason || "（未填寫）"}
                  </div>
                </div>
              )}
              {(detailModal.type === "notes" ||
                detailModal.type === "makeup-notes") && (
                <>
                  {detailModal.data.location && (
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-2">
                        上課地點
                      </span>
                      <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-700 border border-slate-100">
                        {detailModal.data.location}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-2">
                      上課內容
                    </span>
                    <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 leading-relaxed border border-slate-100">
                      {detailModal.data.content || "（未填寫）"}
                    </div>
                  </div>
                  {detailModal.data.remarks && (
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-2">
                        備註
                      </span>
                      <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-700 border border-slate-100">
                        {detailModal.data.remarks}
                      </div>
                    </div>
                  )}
                </>
              )}
              {detailModal.data.attachment_file && (
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-2">
                    附件
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setPreviewFileUrl(
                          `http://localhost:3001/uploads/${detailModal.data.attachment_file}`,
                        )
                      }
                      className="flex items-center bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition"
                    >
                      <Eye size={15} className="mr-1.5" /> 預覽
                    </button>
                    <span className="text-sm text-slate-500 truncate">
                      {detailModal.data.attachment_file}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400">狀態：</span>
                {statusBadge(detailModal.data.status)}
              </div>
            </div>
            {detailModal.data.status === "pending" &&
              detailModal.type !== "notes" && (
                <div className="px-6 pb-6 flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => {
                      if (detailModal.type === "makeup-checkin")
                        handleMakeupCheckinReview(
                          detailModal.data.id,
                          "rejected",
                        );
                      else
                        handleMakeupNotesReview(
                          detailModal.data.id,
                          "rejected",
                        );
                    }}
                    className="flex-1 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition border border-red-200"
                  >
                    駁回申請
                  </button>
                  <button
                    onClick={() => {
                      if (detailModal.type === "makeup-checkin")
                        handleMakeupCheckinReview(
                          detailModal.data.id,
                          "approved",
                        );
                      else
                        handleMakeupNotesReview(
                          detailModal.data.id,
                          "approved",
                        );
                    }}
                    className="flex-1 py-2.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition shadow-sm"
                  >
                    ✅ 核准申請
                  </button>
                </div>
              )}
          </div>
        </div>
      )}

      {/* 緊急通報詳細視窗 */}
      {alertDetailModal.isOpen && alertDetailModal.alert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-red-100 bg-red-50">
              <h3 className="font-bold text-lg text-red-700 flex items-center">
                <AlertTriangle className="mr-2" size={20} /> 緊急通報詳情
              </h3>
              <button
                onClick={() =>
                  setAlertDetailModal({ isOpen: false, alert: null })
                }
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="font-bold text-red-700 text-base leading-relaxed">
                  {alertDetailModal.alert.sender_role === "tutor"
                    ? `${alertDetailModal.alert.chinese_name || alertDetailModal.alert.english_name} 老師未能聯絡到學生`
                    : `${alertDetailModal.alert.chinese_name || alertDetailModal.alert.english_name} 學生未能聯絡到老師`}
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-500">
                    上課日期
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatClassDate(alertDetailModal.alert.class_date)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-500">
                    上課時間
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {alertDetailModal.alert.start_time?.substring(0, 5)} ~{" "}
                    {alertDetailModal.alert.end_time?.substring(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-500">
                    回報者
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {alertDetailModal.alert.chinese_name ||
                      alertDetailModal.alert.english_name}
                    （{ROLE_MAP[alertDetailModal.alert.sender_role]}）
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-500">
                    聯絡不到
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    {alertDetailModal.alert.target_chinese_name ||
                      alertDetailModal.alert.target_english_name}
                    （{TARGET_ROLE_MAP[alertDetailModal.alert.target_role]}）
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-bold text-slate-500">
                    通報時間
                  </span>
                  <span className="text-sm text-slate-600">
                    {formatDateTime(alertDetailModal.alert.created_at)}
                  </span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-2">
                <p className="text-sm text-amber-700 font-medium">
                  📋 目前聯絡不到此人，請助教盡快聯繫雙方確認狀況。
                </p>
              </div>
              <button
                onClick={() =>
                  setAlertDetailModal({ isOpen: false, alert: null })
                }
                className="w-full py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition mt-2"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 檔案預覽 Modal */}
      {previewFileUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-8 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                <Eye className="mr-2 text-primary" size={20} /> 檔案預覽與審查
              </h3>
              <button
                onClick={() => setPreviewFileUrl(null)}
                className="text-slate-400 hover:text-red-500 transition p-1 bg-white rounded-md shadow-sm border border-slate-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-grow overflow-auto bg-slate-100 flex items-center justify-center p-4">
              {previewFileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                <img
                  src={previewFileUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                />
              ) : previewFileUrl.match(/\.(pdf|docx|doc)$/i) ? (
                <iframe
                  src={previewFileUrl}
                  className="w-full h-[70vh] border-0 rounded-lg shadow-sm"
                  title="PDF Preview"
                />
              ) : (
                <div className="text-center p-12">
                  <FileText size={64} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium">
                    此檔案格式不支援直接預覽，請關閉視窗並點擊「下載」查看。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 資格審查 Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                <FileCheck className="mr-2 text-primary" size={20} /> 資格審查
              </h3>
              <button
                onClick={() => setReviewModal({ isOpen: false, student: null })}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6 leading-relaxed">
                正在審查 <b>{reviewModal.student.chinese_name}</b> (
                {reviewModal.student.student_id}) 的資格證明。
                <br />
                <br />
                請確認其上傳之檔案{" "}
                <b>{reviewModal.student.certification_file}</b>{" "}
                是否符合本系擔任小老師之標準。
              </p>
              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={() => handleReviewSubmit("resubmit")}
                  className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition border border-red-200"
                >
                  退回 / 要求補件
                </button>
                <button
                  onClick={() => handleReviewSubmit("approved")}
                  className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition shadow-sm"
                >
                  ✅ 審查通過
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新增輔導時數 Modal */}
      {addHoursModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                <Clock className="mr-2 text-primary" size={20} /> 手動新增時數
              </h3>
              <button
                onClick={() => {
                  setAddHoursModal(false);
                  setAddHoursSlots([{ date: "", startTime: "", endTime: "" }]);
                }}
                className="text-slate-400 hover:text-red-500 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleAddHoursSubmit}
              className="p-6 overflow-y-auto flex-grow"
            >
              <p className="text-sm text-slate-500 mb-4">
                為 <b>{selectedStudent?.chinese_name}</b> 新增已核准的輔導紀錄：
              </p>

              <div className="space-y-4">
                {addHoursSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group"
                  >
                    {/* 刪除按鈕 (大於一筆時才顯示) */}
                    {addHoursSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveHoursSlot(index)}
                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1"
                      >
                        <X size={16} />
                      </button>
                    )}

                    <div className="mb-3">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        日期 Date
                      </label>
                      <input
                        type="date"
                        value={slot.date}
                        onChange={(e) =>
                          handleAddHoursSlotChange(
                            index,
                            "date",
                            e.target.value,
                          )
                        }
                        required
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          開始時間 Start
                        </label>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) =>
                            handleAddHoursSlotChange(
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
                          結束時間 End
                        </label>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) =>
                            handleAddHoursSlotChange(
                              index,
                              "endTime",
                              e.target.value,
                            )
                          }
                          required
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 新增列按鈕 */}
              <button
                type="button"
                onClick={handleAddNewHoursSlot}
                className="mt-4 flex items-center justify-center gap-1 w-full py-2.5 rounded-xl border border-dashed border-primary/30 text-primary text-sm font-bold bg-primary/5 hover:bg-primary/10 transition"
              >
                <Plus size={16} /> 新增一筆
              </button>

              <div className="mt-8 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">
                  本次預計新增：
                  <span className="text-lg text-green-600 ml-1">
                    {calculateTotalNewHours()}
                  </span>{" "}
                  小時
                </span>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAddHoursModal(false);
                    setAddHoursSlots([
                      { date: "", startTime: "", endTime: "" },
                    ]);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition shadow-sm"
                >
                  確認新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
