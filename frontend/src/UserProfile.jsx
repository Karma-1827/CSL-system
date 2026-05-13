import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Shield,
  BookOpen,
  Bell,
  Camera,
  ArrowLeft,
  Save,
  Edit2,
  X,
  Globe,
  Target,
  Clock,
  Plus,
  Trash2,
  Award,
  FileText,
  UploadCloud,
  Eye,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ✨ 新增：星期的常數陣列
const DAYS = [
  { id: "Mon", label: "星期一" },
  { id: "Tue", label: "星期二" },
  { id: "Wed", label: "星期三" },
  { id: "Thu", label: "星期四" },
  { id: "Fri", label: "星期五" },
];
const TIME_SLOTS = ["09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00"];

const skillMap = {
  listening: "聽力",
  speaking: "口說",
  reading: "閱讀",
  writing: "寫作",
};
const countryList = [
  "台灣 (Taiwan)",
  "美國 (USA)",
  "日本 (Japan)",
  "韓國 (South Korea)",
  "越南 (Vietnam)",
  "印尼 (Indonesia)",
  "泰國 (Thailand)",
  "菲律賓 (Philippines)",
  "馬來西亞 (Malaysia)",
  "其他 (Other)",
];

function UserProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("general");

  // ✨ 控制各區塊編輯狀態的開關
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [isEditingLang, setIsEditingLang] = useState(false);
  const [isEditingNeeds, setIsEditingNeeds] = useState(false);
  const [isEditingTimes, setIsEditingTimes] = useState(false);

  const [userInfo, setUserInfo] = useState({
    account: "",
    chineseName: "",
    englishName: "",
    department: "",
    phone: "",
    role: "",
    avatarUrl: "",
    email: "",
    nationality: "",
    gender: "",
    overallLevel: "N/A",
    levelListening: 0,
    levelSpeaking: 0,
    levelReading: 0,
    levelWriting: 0,
    targetSkills: {},
    skillsToImprove: "無備註",
    availableTimes: { days: [], slots: [] }, // ✨ 預設為物件格式
    teachingNotes: "",
    certificationFile: "",
    certificationStatus: "pending",
    learningDuration: "",
  });

  const [editForm, setEditForm] = useState({ ...userInfo });
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [actualFile, setActualFile] = useState(null);

  useEffect(() => {
    const account = localStorage.getItem("loggedInAccount");
    if (account) {
      fetch(`http://localhost:3001/api/profile/${account}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            // ✨ 確保 availableTimes 從資料庫出來時，如果沒有值，預設為空物件
            const fetchedTimes = result.data.available_times || {
              days: [],
              slots: [],
            };
            // 如果資料庫裡存的還是舊版的陣列，我們做一個安全轉換防呆
            const safeTimes = Array.isArray(fetchedTimes)
              ? { days: [], slots: [] }
              : fetchedTimes;

            const data = {
              account: result.data.account,
              chineseName: result.data.chinese_name || "",
              englishName: result.data.english_name || "",
              department: result.data.department || "尚未填寫",
              phone: result.data.phone || "尚未填寫",
              role: result.data.role,
              email: result.data.email || "尚未填寫",
              nationality: result.data.nationality || "尚未填寫",
              avatarUrl: "",
              gender: result.data.gender || "",
              overallLevel: result.data.overall_level || "N/A",
              levelListening: result.data.level_listening || 0,
              levelSpeaking: result.data.level_speaking || 0,
              levelReading: result.data.level_reading || 0,
              levelWriting: result.data.level_writing || 0,
              targetSkills: result.data.target_skills || {},
              skillsToImprove: result.data.skills_to_improve || "無備註",
              availableTimes: safeTimes, // ✨ 套用安全的時間格式
              teachingNotes: result.data.teaching_notes || "無備註",
              certificationFile: result.data.certification_file || "",
              certificationStatus:
                result.data.certification_status || "pending",
              learningDuration: result.data.learning_duration || "尚未填寫",
            };
            setUserInfo(data);
            setEditForm(data);
          }
        });
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file)
      setUserInfo({ ...userInfo, avatarUrl: URL.createObjectURL(file) });
  };

  const handleInputChange = (e) =>
    setEditForm({ ...editForm, [e.target.name]: e.target.value });

  // ✨ 補回被誤刪的通用儲存函式
  const handleSave = async (section) => {
    try {
      const res = await fetch("http://localhost:3001/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: userInfo.account,
          chineseName: editForm.chineseName,
          englishName: editForm.englishName,
          department: editForm.department,
          phone: editForm.phone,
          email: editForm.email,
          nationality: editForm.nationality,
          gender: editForm.gender,
          levelListening: editForm.levelListening,
          levelSpeaking: editForm.levelSpeaking,
          levelReading: editForm.levelReading,
          levelWriting: editForm.levelWriting,
          teachingNotes: editForm.teachingNotes,
          availableTimes: editForm.availableTimes,
          overallLevel: editForm.overallLevel,
          learningDuration: editForm.learningDuration,
          targetSkills: editForm.targetSkills,
          skillsToImprove: editForm.skillsToImprove,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUserInfo({ ...editForm });
        handleCancel(section);
        alert("✅ 資料已成功更新！");
      } else {
        alert(`❌ 更新失敗：${data.message}`);
      }
    } catch (error) {
      alert("無法連線到伺服器！");
    }
  };

  // ✨ 專為「輔導需求 / 資格證明」寫的儲存函式
  const handleSaveNeeds = async () => {
    if (userInfo.role === "tutor" && actualFile) {
      const formData = new FormData();
      formData.append("account", userInfo.account);
      formData.append("certificationFile", actualFile);

      try {
        const res = await fetch(
          "http://localhost:3001/api/tutor/reupload-cert",
          { method: "POST", body: formData },
        );
        const data = await res.json();
        if (data.success) {
          alert("✅ 檔案已重新上傳！狀態已轉為「審查中」。");
          window.location.reload();
        }
      } catch (error) {
        alert("上傳失敗");
      }
    } else {
      handleSave("needs");
    }
  };

  const handleCancel = (section) => {
    setEditForm({ ...userInfo });
    if (section === "general") setIsEditingGeneral(false);
    if (section === "lang") setIsEditingLang(false);
    if (section === "needs") setIsEditingNeeds(false);
    if (section === "times") setIsEditingTimes(false);
  };

  const handleTargetSkillToggle = (skillId) => {
    setEditForm((prev) => ({
      ...prev,
      targetSkills: {
        ...prev.targetSkills,
        [skillId]: !prev.targetSkills[skillId],
      },
    }));
  };

  // ✨ 全新：處理星期幾的點擊切換
  const handleDayToggle = (dayId) => {
    setEditForm((prev) => ({
      ...prev,
      availableTimes: {
        ...prev.availableTimes,
        days: prev.availableTimes?.days?.includes(dayId)
          ? prev.availableTimes.days.filter((d) => d !== dayId)
          : [...(prev.availableTimes?.days || []), dayId],
      },
    }));
  };

  // ✨ 全新：處理時段的點擊切換
  const handleTimeSlotToggle = (slot) => {
    setEditForm((prev) => ({
      ...prev,
      availableTimes: {
        ...prev.availableTimes,
        slots: prev.availableTimes?.slots?.includes(slot)
          ? prev.availableTimes.slots.filter((s) => s !== slot)
          : [...(prev.availableTimes?.slots || []), slot],
      },
    }));
  };

  const handleCertUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditForm({ ...editForm, certificationFile: file.name });
      setActualFile(file);
    }
  };

  const renderSkillDots = (level) => (
    <div className="flex space-x-1.5">
      {[1, 2, 3, 4, 5].map((num) => (
        <div
          key={num}
          className={`w-3.5 h-3.5 rounded-full ${num <= level ? "bg-slate-600 shadow-sm" : "bg-slate-200"}`}
        />
      ))}
    </div>
  );

  const renderEditSkillDots = (skillName, currentValue) => (
    <div className="flex space-x-2">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          type="button"
          key={num}
          onClick={() => setEditForm({ ...editForm, [skillName]: num })}
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${num <= currentValue ? "bg-slate-600 text-white shadow-md transform scale-110" : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"}`}
        >
          {num}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <header className="bg-white shadow-sm h-16 flex items-center px-6 sticky top-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-slate-500 hover:text-slate-700 transition font-medium"
        >
          <ArrowLeft size={20} className="mr-2" /> 返回主畫面
        </button>
      </header>

      <div className="max-w-6xl mx-auto mt-8 px-4 sm:px-6 flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 flex-shrink-0">
          <h1 className="text-2xl font-black text-slate-800 mb-6 px-2">
            個人資訊
          </h1>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("general")}
              className={`w-full flex items-center px-4 py-3 rounded-xl font-medium transition ${activeTab === "general" ? "bg-slate-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <User size={18} className="mr-3" /> 基本資料
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`w-full flex items-center px-4 py-3 rounded-xl font-medium transition ${activeTab === "preferences" ? "bg-slate-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <BookOpen size={18} className="mr-3" />{" "}
              {userInfo.role === "tutor" ? "教學能力" : "輔導需求"}
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center px-4 py-3 rounded-xl font-medium transition ${activeTab === "security" ? "bg-slate-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Shield size={18} className="mr-3" /> 帳號安全
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`w-full flex items-center px-4 py-3 rounded-xl font-medium transition ${activeTab === "notifications" ? "bg-slate-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Bell size={18} className="mr-3" /> 通知設定
            </button>
          </nav>
        </aside>

        <main className="flex-grow">
          {activeTab === "general" && (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center gap-8">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current.click()}
                >
                  <div className="w-28 h-28 rounded-full border-4 border-slate-50 bg-slate-400 flex items-center justify-center overflow-hidden shadow-sm text-white">
                    {userInfo.avatarUrl ? (
                      <img
                        src={userInfo.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera size={32} />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="text-center sm:text-left flex-grow">
                  <h2 className="text-2xl font-bold text-slate-800">
                    {userInfo.chineseName} {userInfo.englishName}
                  </h2>
                  <p className="text-slate-500 mt-1">@{userInfo.account}</p>
                  <div className="mt-3 inline-block px-3 py-1 bg-slate-100 text-slate-600 font-bold text-sm rounded-full capitalize">
                    {userInfo.role === "tutee"
                      ? "外籍生 Tutee"
                      : "小老師 Tutor"}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-lg text-slate-800">詳細資訊</h3>
                  {!isEditingGeneral ? (
                    <button
                      onClick={() => setIsEditingGeneral(true)}
                      className="flex items-center text-sm font-medium text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                    >
                      <Edit2 size={16} className="mr-1.5" /> 編輯
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancel("general")}
                        className="flex items-center text-sm font-medium text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition"
                      >
                        <X size={16} className="mr-1.5" /> 取消
                      </button>
                      <button
                        onClick={() => handleSave("general")}
                        className="flex items-center text-sm font-bold text-white bg-slate-600 hover:bg-slate-700 px-4 py-1.5 rounded-lg transition shadow-sm"
                      >
                        <Save size={16} className="mr-1.5" /> 儲存
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      中文名字
                    </label>
                    <input
                      type="text"
                      name="chineseName"
                      value={
                        isEditingGeneral
                          ? editForm.chineseName
                          : userInfo.chineseName
                      }
                      onChange={handleInputChange}
                      disabled={!isEditingGeneral}
                      className={`w-full rounded-lg px-4 py-2.5 outline-none transition ${isEditingGeneral ? "border border-slate-300 focus:ring-2 focus:ring-slate-400 bg-white text-slate-800" : "bg-slate-50 border border-transparent text-slate-500"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      英文名字
                    </label>
                    <input
                      type="text"
                      name="englishName"
                      value={
                        isEditingGeneral
                          ? editForm.englishName
                          : userInfo.englishName
                      }
                      onChange={handleInputChange}
                      disabled={!isEditingGeneral}
                      className={`w-full rounded-lg px-4 py-2.5 outline-none transition ${isEditingGeneral ? "border border-slate-300 focus:ring-2 focus:ring-slate-400 bg-white text-slate-800" : "bg-slate-50 border border-transparent text-slate-500"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      就讀系所
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={
                        isEditingGeneral
                          ? editForm.department
                          : userInfo.department
                      }
                      onChange={handleInputChange}
                      disabled={!isEditingGeneral}
                      className={`w-full rounded-lg px-4 py-2.5 outline-none transition ${isEditingGeneral ? "border border-slate-300 focus:ring-2 focus:ring-slate-400 bg-white text-slate-800" : "bg-slate-50 border border-transparent text-slate-500"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      聯絡電話
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={isEditingGeneral ? editForm.phone : userInfo.phone}
                      onChange={handleInputChange}
                      disabled={!isEditingGeneral}
                      className={`w-full rounded-lg px-4 py-2.5 outline-none transition ${isEditingGeneral ? "border border-slate-300 focus:ring-2 focus:ring-slate-400 bg-white text-slate-800" : "bg-slate-50 border border-transparent text-slate-500"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      電子信箱 Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={isEditingGeneral ? editForm.email : userInfo.email}
                      onChange={handleInputChange}
                      disabled={!isEditingGeneral}
                      className={`w-full rounded-lg px-4 py-2.5 outline-none transition ${isEditingGeneral ? "border border-slate-300 focus:ring-2 focus:ring-slate-400 bg-white text-slate-800" : "bg-slate-50 border border-transparent text-slate-500"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      國籍 Nationality
                    </label>
                    {isEditingGeneral ? (
                      <select
                        name="nationality"
                        value={editForm.nationality}
                        onChange={handleInputChange}
                        className="w-full rounded-lg px-4 py-2.5 outline-none transition border border-slate-300 focus:ring-2 focus:ring-slate-400 bg-white text-slate-800"
                      >
                        {countryList.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={userInfo.nationality}
                        disabled
                        className="w-full rounded-lg px-4 py-2.5 outline-none transition bg-slate-50 border border-transparent text-slate-500"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">
                      性別 Gender
                    </label>
                    {isEditingGeneral ? (
                      <div className="flex gap-2">
                        {[
                          { val: "male", label: "男 Male" },
                          { val: "female", label: "女 Female" },
                          { val: "other", label: "非二元性別" },
                        ].map((g) => (
                          <label key={g.val} className="flex-1 cursor-pointer">
                            <input
                              type="radio"
                              name="gender"
                              value={g.val}
                              checked={editForm.gender === g.val}
                              onChange={handleInputChange}
                              className="sr-only"
                            />
                            <div
                              className={`text-center px-2 py-2 rounded-lg border-2 font-bold text-xs transition-all ${
                                editForm.gender === g.val
                                  ? "bg-blue-50 border-blue-400 text-blue-700"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-blue-200"
                              }`}
                            >
                              {g.label}
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={
                          userInfo.gender === "male"
                            ? "男 Male"
                            : userInfo.gender === "female"
                              ? "女 Female"
                              : userInfo.gender === "other"
                                ? "非二元性別"
                                : "尚未填寫"
                        }
                        disabled
                        className="w-full rounded-lg px-4 py-2.5 outline-none transition bg-slate-50 border border-transparent text-slate-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center">
                    <Globe className="text-slate-600 mr-3" size={20} />
                    <h3 className="font-bold text-lg text-slate-800">
                      {userInfo.role === "tutor"
                        ? "華語教學自我評估 Teaching Evaluation"
                        : "華語能力 Language Proficiency"}
                    </h3>
                  </div>
                  {!isEditingLang ? (
                    <button
                      onClick={() => setIsEditingLang(true)}
                      className="flex items-center text-sm font-medium text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                    >
                      <Edit2 size={16} className="mr-1.5" /> 編輯
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancel("lang")}
                        className="flex items-center text-sm font-medium text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition"
                      >
                        <X size={16} className="mr-1.5" /> 取消
                      </button>
                      <button
                        onClick={() => handleSave("lang")}
                        className="flex items-center text-sm font-bold text-white bg-slate-600 hover:bg-slate-700 px-4 py-1.5 rounded-lg transition"
                      >
                        <Save size={16} className="mr-1.5" /> 儲存
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-8">
                  {userInfo.role === "tutee" && (
                    <div className="mb-6 flex flex-col sm:flex-row gap-6 border-b border-slate-100 pb-6">
                      <div className="flex-1">
                        <span className="text-sm font-bold text-slate-500 block mb-2">
                          學習華語時間 Learning Duration
                        </span>
                        {isEditingLang ? (
                          <select
                            name="learningDuration"
                            value={editForm.learningDuration}
                            onChange={handleInputChange}
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-slate-400 font-bold text-slate-700 bg-white"
                          >
                            <option value="3個月以下 (< 3 months)">
                              3個月以下 (&lt; 3 months)
                            </option>
                            <option value="3個月 ~ 半年 (3-6 months)">
                              3個月 ~ 半年 (3-6 months)
                            </option>
                            <option value="半年 ~ 1年 (6-12 months)">
                              半年 ~ 1年 (6-12 months)
                            </option>
                            <option value="1年 ~ 2年 (1-2 years)">
                              1年 ~ 2年 (1-2 years)
                            </option>
                            <option value="2年以上 (> 2 years)">
                              2年以上 (&gt; 2 years)
                            </option>
                          </select>
                        ) : (
                          <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg shadow-sm border border-blue-100">
                            {userInfo.learningDuration}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-bold text-slate-500 block mb-2">
                          整體評估 Overall
                        </span>
                        {isEditingLang ? (
                          <select
                            name="overallLevel"
                            value={editForm.overallLevel}
                            onChange={handleInputChange}
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-slate-400 font-bold text-slate-700 bg-white"
                          >
                            {[
                              "不知道 (Unknown)",
                              "N",
                              "A1",
                              "A2",
                              "B1",
                              "B2",
                              "C1",
                              "C2",
                            ].map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="inline-block px-4 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg shadow-sm">
                            {userInfo.overallLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-xl gap-3">
                      <span className="font-bold text-slate-700">
                        {userInfo.role === "tutor"
                          ? "聽力教學"
                          : "聽力 Listening"}
                      </span>
                      {isEditingLang
                        ? renderEditSkillDots(
                            "levelListening",
                            editForm.levelListening,
                          )
                        : renderSkillDots(userInfo.levelListening)}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-xl gap-3">
                      <span className="font-bold text-slate-700">
                        {userInfo.role === "tutor"
                          ? "口說會話"
                          : "口說 Speaking"}
                      </span>
                      {isEditingLang
                        ? renderEditSkillDots(
                            "levelSpeaking",
                            editForm.levelSpeaking,
                          )
                        : renderSkillDots(userInfo.levelSpeaking)}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-xl gap-3">
                      <span className="font-bold text-slate-700">
                        {userInfo.role === "tutor"
                          ? "閱讀理解"
                          : "閱讀 Reading"}
                      </span>
                      {isEditingLang
                        ? renderEditSkillDots(
                            "levelReading",
                            editForm.levelReading,
                          )
                        : renderSkillDots(userInfo.levelReading)}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-xl gap-3">
                      <span className="font-bold text-slate-700">
                        {userInfo.role === "tutor"
                          ? "寫作指導"
                          : "寫作 Writing"}
                      </span>
                      {isEditingLang
                        ? renderEditSkillDots(
                            "levelWriting",
                            editForm.levelWriting,
                          )
                        : renderSkillDots(userInfo.levelWriting)}
                    </div>
                  </div>
                  {userInfo.role === "tutor" && (
                    <div className="mt-6">
                      <h4 className="text-sm font-bold text-slate-500 mb-3">
                        教學強項與備註 Notes
                      </h4>
                      {isEditingLang ? (
                        <textarea
                          name="teachingNotes"
                          value={editForm.teachingNotes}
                          onChange={handleInputChange}
                          className="w-full bg-white border border-slate-300 p-4 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-slate-400 outline-none resize-none transition"
                          rows="3"
                        />
                      ) : (
                        <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm leading-relaxed border border-slate-100 min-h-[80px]">
                          {userInfo.teachingNotes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center">
                    {userInfo.role === "tutor" ? (
                      <Award className="text-orange-500 mr-3" size={20} />
                    ) : (
                      <Target className="text-orange-500 mr-3" size={20} />
                    )}
                    <h3 className="font-bold text-lg text-slate-800">
                      {userInfo.role === "tutor"
                        ? "資格證明 Certification"
                        : "輔導需求 Tutoring Needs"}
                    </h3>
                  </div>
                  {!isEditingNeeds ? (
                    <button
                      onClick={() => setIsEditingNeeds(true)}
                      className="flex items-center text-sm font-medium text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition"
                    >
                      <Edit2 size={16} className="mr-1.5" /> 編輯
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancel("needs")}
                        className="flex items-center text-sm font-medium text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition"
                      >
                        <X size={16} className="mr-1.5" /> 取消
                      </button>
                      <button
                        onClick={handleSaveNeeds}
                        className="flex items-center text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 px-4 py-1.5 rounded-lg transition"
                      >
                        <Save size={16} className="mr-1.5" /> 儲存
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-8">
                  {userInfo.role === "tutor" ? (
                    isEditingNeeds ? (
                      <div className="relative flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-500 font-bold">
                              {editForm.certificationFile ||
                                "點擊或拖曳上傳新證明"}
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,image/*"
                            onChange={handleCertUpload}
                          />
                        </label>
                      </div>
                    ) : (
                      <div
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border shadow-sm gap-4 ${
                          userInfo.certificationStatus === "approved"
                            ? "bg-green-50 border-green-200"
                            : userInfo.certificationStatus === "resubmit"
                              ? "bg-red-50 border-red-200"
                              : "bg-amber-50 border-amber-200"
                        }`}
                      >
                        <div className="flex items-center overflow-hidden">
                          <FileText
                            className="text-slate-500 flex-shrink-0 mr-3"
                            size={24}
                          />
                          <span className="font-bold text-slate-700 truncate max-w-[200px] md:max-w-sm">
                            {userInfo.certificationFile || "尚未上傳證明文件"}
                          </span>
                        </div>

                        {userInfo.certificationFile && (
                          <div className="flex items-center space-x-3 flex-shrink-0">
                            {userInfo.certificationStatus === "pending" && (
                              <span className="px-3 py-1 bg-amber-500 text-white font-bold text-xs rounded-full shadow-sm">
                                審查中
                              </span>
                            )}
                            {userInfo.certificationStatus === "approved" && (
                              <span className="px-3 py-1 bg-green-500 text-white font-bold text-xs rounded-full shadow-sm">
                                ✅ 已通過
                              </span>
                            )}
                            {userInfo.certificationStatus === "resubmit" && (
                              <span className="px-3 py-1 bg-red-500 text-white font-bold text-xs rounded-full shadow-sm">
                                ⚠️ 需補件
                              </span>
                            )}
                            <button
                              onClick={() =>
                                setPreviewFileUrl(
                                  `http://localhost:3001/uploads/${userInfo.certificationFile}`,
                                )
                              }
                              className="flex items-center text-sm font-bold text-slate-600 hover:text-primary transition bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"
                            >
                              <Eye size={16} className="mr-1.5" /> 預覽
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <>
                      <div className="mb-6">
                        <h4 className="text-sm font-bold text-slate-500 mb-3">
                          想加強的技巧 Target Skills
                        </h4>
                        {isEditingNeeds ? (
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(skillMap).map(([id, label]) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => handleTargetSkillToggle(id)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ${editForm.targetSkills[id] ? "bg-orange-50 border-orange-400 text-orange-600 shadow-sm" : "bg-white border-slate-200 text-slate-400 hover:border-orange-200"}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {!userInfo.targetSkills ||
                            Object.values(userInfo.targetSkills).every(
                              (v) => !v,
                            ) ? (
                              <span className="text-slate-400 text-sm italic">
                                未設定
                              </span>
                            ) : (
                              Object.entries(userInfo.targetSkills).map(
                                ([skill, isSelected]) =>
                                  isSelected && (
                                    <span
                                      key={skill}
                                      className="px-4 py-1.5 bg-orange-50 text-orange-600 font-bold rounded-full border border-orange-200 text-sm"
                                    >
                                      {skillMap[skill]}
                                    </span>
                                  ),
                              )
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-500 mb-3">
                          其他備註 Notes
                        </h4>
                        {isEditingNeeds ? (
                          <textarea
                            name="skillsToImprove"
                            value={editForm.skillsToImprove}
                            onChange={handleInputChange}
                            className="w-full bg-white border border-slate-300 p-4 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-orange-200 outline-none resize-none transition"
                            rows="3"
                          />
                        ) : (
                          <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm leading-relaxed border border-slate-100 min-h-[80px]">
                            {userInfo.skillsToImprove}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ✨ 卡片 C：全新改版的可上課時間 */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center">
                    <Clock className="text-blue-500 mr-3" size={20} />
                    <h3 className="font-bold text-lg text-slate-800">
                      {userInfo.role === "tutor"
                        ? "可上課時間 Available Times"
                        : "希望輔導的時間 Preferred Times"}
                    </h3>
                  </div>
                  {!isEditingTimes ? (
                    <button
                      onClick={() => setIsEditingTimes(true)}
                      className="flex items-center text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                    >
                      <Edit2 size={16} className="mr-1.5" /> 編輯
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancel("times")}
                        className="flex items-center text-sm font-medium text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition"
                      >
                        <X size={16} className="mr-1.5" /> 取消
                      </button>
                      <button
                        onClick={() => handleSave("times")}
                        className="flex items-center text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 px-4 py-1.5 rounded-lg transition"
                      >
                        <Save size={16} className="mr-1.5" /> 儲存
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-8">
                  {isEditingTimes ? (
                    <div className="space-y-6">
                      <div>
                        <span className="text-sm font-bold text-slate-500 mb-3 block">
                          選擇星期 Days (可複選)
                        </span>
                        <div className="flex flex-wrap gap-3">
                          {DAYS.map((day) => (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => handleDayToggle(day.id)}
                              className={`px-5 py-2.5 rounded-lg border-2 font-bold transition-all ${editForm.availableTimes?.days?.includes(day.id) ? "bg-blue-50 border-blue-400 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"}`}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-500 mb-3 block">
                          選擇時段 Time Slots (可複選)
                        </span>
                        <div className="flex flex-wrap gap-3">
                          {TIME_SLOTS.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => handleTimeSlotToggle(slot)}
                              className={`px-5 py-2.5 rounded-lg border-2 font-bold transition-all ${editForm.availableTimes?.slots?.includes(slot) ? "bg-blue-50 border-blue-400 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"}`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {!userInfo.availableTimes ||
                      !userInfo.availableTimes.days ||
                      userInfo.availableTimes.days.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          尚未設定任何時間
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className="text-sm font-bold text-slate-500 mb-3 block flex items-center">
                              勾選的星期 Selected Days
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {userInfo.availableTimes.days.map((d) => {
                                const dayObj = DAYS.find((x) => x.id === d);
                                return (
                                  <span
                                    key={d}
                                    className="px-4 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg shadow-sm border border-blue-100"
                                  >
                                    {dayObj ? dayObj.label : d}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-500 mb-3 block flex items-center">
                              勾選的時段 Selected Time Slots
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {userInfo.availableTimes.slots.map((s) => (
                                <span
                                  key={s}
                                  className="px-4 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg shadow-sm border border-slate-200"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {previewFileUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-8 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800 flex items-center">
                  <Eye className="mr-2 text-primary" size={20} /> 檔案預覽
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
                ) : previewFileUrl.match(/\.(pdf)$/i) ? (
                  <iframe
                    src={previewFileUrl}
                    className="w-full h-[70vh] border-0 rounded-lg shadow-sm"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="text-center p-12">
                    <FileText
                      size={64}
                      className="mx-auto text-slate-300 mb-4"
                    />
                    <p className="text-slate-500 font-medium">
                      此檔案格式（Word/Excel
                      等）不支援直接預覽，請關閉視窗並點擊「下載」查看。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
