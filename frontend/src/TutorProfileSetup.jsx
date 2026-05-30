import React, { useState } from "react";
import {
  User,
  BookOpen,
  Clock,
  CheckCircle2,
  UploadCloud,
  Award,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const DAYS = [
  { id: "Mon", label: "星期一" },
  { id: "Tue", label: "星期二" },
  { id: "Wed", label: "星期三" },
  { id: "Thu", label: "星期四" },
  { id: "Fri", label: "星期五" },
];

const TIME_SLOTS = ["09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00"];

function TutorProfileSetup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(() => {
    return {
      studentId: localStorage.getItem("savedStudentId") || "",
      studentStatus: "",
      chineseName: "",
      englishName: "",
      gender: "", // ✨ 新增
      nativeLanguage: "",
      program: "",
      nationality: "台灣 (Taiwan)",
      department: "華語文教學系",
      phone: "",
      levelListening: 0,
      levelSpeaking: 0,
      levelReading: 0,
      levelWriting: 0,
      teachingNotes: "",
      availableDays: [],
      availableTimeSlots: [],
      certificationFileName: "",
    };
  });

  const [actualFile, setActualFile] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDayToggle = (dayId) => {
    setFormData((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(dayId)
        ? prev.availableDays.filter((d) => d !== dayId)
        : [...prev.availableDays, dayId],
    }));
  };

  const handleTimeSlotToggle = (slot) => {
    setFormData((prev) => ({
      ...prev,
      availableTimeSlots: prev.availableTimeSlots.includes(slot)
        ? prev.availableTimeSlots.filter((s) => s !== slot)
        : [...prev.availableTimeSlots, slot],
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, certificationFileName: file.name });
      setActualFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const totalScore =
      formData.levelListening +
      formData.levelSpeaking +
      formData.levelReading +
      formData.levelWriting;
    if (totalScore === 0) return alert("請至少為一項教學專業評分 (1~5分)！");
    if (!formData.gender) return alert("請選擇性別！");
    try {
      const submitData = new FormData();
      submitData.append("studentId", formData.studentId);
      submitData.append("studentStatus", formData.studentStatus);
      submitData.append("chineseName", formData.chineseName);
      submitData.append("englishName", formData.englishName);
      submitData.append("gender", formData.gender); // ✨ 新增
      submitData.append("nativeLanguage", formData.nativeLanguage);
      submitData.append("program", formData.program);
      submitData.append("nationality", formData.nationality);
      submitData.append("department", formData.department);
      submitData.append("phone", formData.phone);
      submitData.append("levelListening", formData.levelListening);
      submitData.append("levelSpeaking", formData.levelSpeaking);
      submitData.append("levelReading", formData.levelReading);
      submitData.append("levelWriting", formData.levelWriting);
      submitData.append("teachingNotes", formData.teachingNotes);

      const timeData = {
        days: formData.availableDays,
        slots: formData.availableTimeSlots,
      };
      submitData.append("availableTimes", JSON.stringify(timeData));

      if (actualFile) submitData.append("certificationFile", actualFile);

      const response = await fetch("http://localhost:3001/api/tutor-profile", {
        method: "POST",
        body: submitData,
      });
      const result = await response.json();

      if (result.success) {
        alert("🎉 小老師檔案建立成功！正在為您導向主畫面...");
        navigate("/tutor-dashboard");
      } else {
        alert(`❌ 儲存失敗：${result.message}`);
      }
    } catch (error) {
      alert("無法連線到伺服器！");
    }
  };

  const renderSkillDots = (skillName, currentValue) => (
    <div className="grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => setFormData({ ...formData, [skillName]: num })}
          className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm transition-all ${
            num <= currentValue
              ? "bg-green-500 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-400 hover:border-green-200 hover:text-green-600"
          }`}
        >
          {num}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            建立小老師專屬檔案
          </h2>
          <p className="mt-3 text-base text-slate-500">
            請完善您的教學履歷，讓我們將您推薦給最適合的外籍學生！
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-100"
        >
          {/* 區塊 1：基本資訊 */}
          <div className="p-8 md:p-10 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                <User size={18} />
              </span>
              基本資訊
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  學號 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  身分別 <span className="text-red-500">*</span>
                </label>
                <select
                  name="studentStatus"
                  value={formData.studentStatus}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none bg-white"
                >
                  <option value="" disabled>
                    請選擇
                  </option>
                  <option value="本地生">本地生</option>
                  <option value="僑生">僑生</option>
                  <option value="外籍生">外籍生</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  中文姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="chineseName"
                  value={formData.chineseName}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  英文姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="englishName"
                  value={formData.englishName}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none"
                />
              </div>

              {/* ✨ 新增：性別 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  性別 Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none bg-white"
                >
                  <option value="" disabled>
                    請選擇性別
                  </option>
                  <option value="male">男 Male</option>
                  <option value="female">女 Female</option>
                  <option value="other">非二元性別 Non-binary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  母語 Native Language <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nativeLanguage"
                  value={formData.nativeLanguage}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 中文 Mandarin"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  學程 <span className="text-red-500">*</span>
                </label>
                <select
                  name="program"
                  value={formData.program}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none bg-white"
                >
                  <option value="" disabled>
                    請選擇學程
                  </option>
                  <option value="碩士班">碩士班</option>
                  <option value="博士班">博士班</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  國籍 <span className="text-red-500">*</span>
                </label>
                <select
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none bg-white"
                >
                  <option value="" disabled>
                    請選擇國籍
                  </option>
                  {countryList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  就讀系所 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  聯絡電話 (選填)
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="09xx-xxx-xxx"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 區塊 2：教學專業評估 */}
          <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                <BookOpen size={18} />
              </span>
              教學專業評估
            </h3>
            <div className="mb-8 bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-6">
                華語教學自我評估（1分為最弱，5分為最強）{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <span className="block font-bold text-slate-700 mb-3">聽力</span>
                  {renderSkillDots("levelListening", formData.levelListening)}
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <span className="block font-bold text-slate-700 mb-3">口說</span>
                  {renderSkillDots("levelSpeaking", formData.levelSpeaking)}
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <span className="block font-bold text-slate-700 mb-3">閱讀</span>
                  {renderSkillDots("levelReading", formData.levelReading)}
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <span className="block font-bold text-slate-700 mb-3">寫作</span>
                  {renderSkillDots("levelWriting", formData.levelWriting)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  教學強項或其他備註 (選填)
                </label>
                <textarea
                  name="teachingNotes"
                  value={formData.teachingNotes}
                  onChange={handleInputChange}
                  placeholder="例如：我特別擅長糾正發音..."
                  className="w-full bg-white border border-slate-300 p-4 rounded-xl text-slate-700 outline-none resize-none transition"
                  rows="3"
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                <Award size={18} className="mr-2 text-slate-500" /> 資格認證上傳
                (選填)
              </label>
              <p className="text-xs text-slate-500 mb-4">
                請上傳您的成績單、華語師資證明或相關文件 (支援 PDF, DOCX, 圖片)
              </p>
              <div className="relative flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500 font-bold">
                      {formData.certificationFileName || "點擊或拖曳檔案至此"}
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 區塊 3：可輔導時間 */}
          <div className="p-8 md:p-10">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-3">
                <Clock size={18} />
              </span>
              可輔導時間
              <span className="ml-2 text-sm font-bold text-slate-400">選填</span>
            </h3>
            <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
              <div className="space-y-6">
                <div>
                  <span className="text-sm font-bold text-slate-500 mb-3 block">
                    1. 請選擇您可以的星期 (可複選) / Select Days
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {DAYS.map((day) => (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => handleDayToggle(day.id)}
                        className={`px-4 py-3 rounded-lg border-2 font-bold transition-all ${
                          formData.availableDays.includes(day.id)
                            ? "bg-green-50 border-green-400 text-green-700 shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:border-green-200"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-500 mb-3 block">
                    2. 請選擇您可以的時段 (可複選) / Select Time Slots
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleTimeSlotToggle(slot)}
                        className={`px-4 py-3 rounded-lg border-2 font-bold transition-all ${
                          formData.availableTimeSlots.includes(slot)
                            ? "bg-green-50 border-green-400 text-green-700 shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:border-green-200"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 md:p-8 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="flex items-center px-10 py-3.5 bg-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:bg-primary-dark hover:-translate-y-0.5 transition-all duration-200"
            >
              <CheckCircle2 size={20} className="mr-2" />
              完成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TutorProfileSetup;
