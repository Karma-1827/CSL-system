import React, { useState, useEffect } from 'react';
import { User, Globe, BookOpen, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const countryList = [
  "美國 (USA)", "日本 (Japan)", "韓國 (South Korea)", "越南 (Vietnam)", 
  "印尼 (Indonesia)", "泰國 (Thailand)", "菲律賓 (Philippines)", "馬來西亞 (Malaysia)", 
  "印度 (India)", "英國 (UK)", "法國 (France)", "德國 (Germany)", 
  "西班牙 (Spain)", "義大利 (Italy)", "加拿大 (Canada)", "澳洲 (Australia)", 
  "紐西蘭 (New Zealand)", "新加坡 (Singapore)", "其他 (Other)"
];

// ✨ 新增：星期的常數陣列，給畫面渲染按鈕用
const DAYS = [
  { id: 'Mon', label: '星期一' }, { id: 'Tue', label: '星期二' },
  { id: 'Wed', label: '星期三' }, { id: 'Thu', label: '星期四' },
  { id: 'Fri', label: '星期五' }
];

const TIME_SLOTS = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00'];

function TuteeProfileSetup() {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const passedStudentId = location.state?.studentId || '';
  
  const [formData, setFormData] = useState(() => {
    const savedId = localStorage.getItem('savedStudentId') || '';
    
    return {
      studentId: savedId, 
      studentType: '', 
      chineseName: '',
      englishName: '',
      program: '學士班 (Bachelor)',
      nationality: '', 
      department: '',
      phone: '',
      overallLevel: '不知道 (Unknown)', // 修正了原本重複的問題
      learningDuration: '',
      levelListening: 3,
      levelSpeaking: 3,
      levelReading: 3,
      levelWriting: 3,
      targetSkills: { listening: false, speaking: false, reading: false, writing: false },
      skillsToImprove: '',
      // ✨ 全新的時間資料結構
      preferredDays: [],
      preferredTimeSlots: []
    };
  });

  // ✨ 處理星期幾的點擊
  const handleDayToggle = (dayId) => {
    setFormData(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(dayId) 
        ? prev.preferredDays.filter(d => d !== dayId) 
        : [...prev.preferredDays, dayId]
    }));
  };

  // ✨ 處理時段的點擊
  const handleTimeSlotToggle = (slot) => {
    setFormData(prev => ({
      ...prev,
      preferredTimeSlots: prev.preferredTimeSlots.includes(slot) 
        ? prev.preferredTimeSlots.filter(s => s !== slot) 
        : [...prev.preferredTimeSlots, slot]
    }));
  };

  useEffect(() => {
    const savedId = localStorage.getItem('savedStudentId');
    if (savedId) {
      setFormData(prevData => ({ ...prevData, studentId: savedId }));
    }
  }, []); 

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleTargetSkillToggle = (skill) => {
    setFormData({
      ...formData,
      targetSkills: { ...formData.targetSkills, [skill]: !formData.targetSkills[skill] }
    });
  };

  // ✨ 整合新的表單送出邏輯
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isAnySkillSelected = Object.values(formData.targetSkills).some(val => val);
    if (!isAnySkillSelected) {
      return alert("請至少選擇一項『想加強的技巧』！\nPlease select at least one target skill.");
    }

    // ✨ 檢查星期和時段是否有選
    if (formData.preferredDays.length === 0 || formData.preferredTimeSlots.length === 0) {
      return alert("請至少選擇一天與一個時段！\nPlease select at least one day and one time slot.");
    }

    try {
      const originalStudentId = location.state?.studentId || formData.studentId;

      const response = await fetch('http://localhost:3001/api/tutee-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // ✨ 把選中的星期與時段打包成一個物件，送給後端
          preferredTimeSlots: { days: formData.preferredDays, slots: formData.preferredTimeSlots },
          originalStudentId
        }),
      });
      
      const result = await response.json();

      if (result.success) {
        alert("🎉 資料建立成功！正在為您導向主畫面...");
        navigate('/tutee-dashboard'); 
      } else {
        alert(`❌ 儲存失敗：${result.message}`);
      }
    } catch (error) {
      alert("無法連線到伺服器！");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">建立您的專屬輔導檔案</h2>
          <p className="mt-3 text-lg text-slate-500">請完善以下資訊，我們將為您配對最適合的本系華語小老師！</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-100">
          
          {/* --- 區塊 1：基本資料 --- */}
          <div className="p-8 md:p-10 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3"><User size={18} /></span>
              基本資料 Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">學號 Student ID <span className="text-red-500">*</span></label>
                <input type="text" name="studentId" value={formData.studentId} onChange={handleInputChange} required placeholder="請確認或修改您的學號" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none transition bg-white text-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">身分別 Student Type <span className="text-red-500">*</span></label>
                <select name="studentType" value={formData.studentType} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none transition bg-white">
                  <option value="" disabled>請選擇 Select Type</option>
                  <option value="僑生">僑生 (Overseas Chinese Student)</option>
                  <option value="外籍生">外籍生 (International Student)</option>
                  <option value="交換生">交換生 (Exchange Student)</option>
                  <option value="其他">其他 (Other)</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">中文名字 Chinese Name</label><input type="text" name="chineseName" value={formData.chineseName} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none transition" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">英文名字 English Name <span className="text-red-500">*</span></label><input type="text" name="englishName" value={formData.englishName} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none transition" /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">學程 Program <span className="text-red-500">*</span></label>
                <select name="program" value={formData.program} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none transition">
                  <option value="學士班 (Bachelor)">學士班 (Bachelor)</option>
                  <option value="碩士班 (Master)">碩士班 (Master)</option>
                  <option value="博士班 (PhD)">博士班 (PhD)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">國籍 Nationality <span className="text-red-500">*</span></label>
                <select name="nationality" value={formData.nationality} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none transition bg-white">
                  <option value="" disabled>請選擇國籍 Select Nationality</option>
                  {countryList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">就讀系所 Department <span className="text-red-500">*</span></label><input type="text" name="department" value={formData.department} onChange={handleInputChange} required placeholder="e.g., 華語文教學系" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none transition" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">聯絡電話 Phone Number</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="09xx-xxx-xxx" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary/50 outline-none transition" /></div>
            </div>
          </div>

          {/* --- 區塊 2：華語能力評估 --- */}
          <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3"><Globe size={18} /></span>
              華語能力自我評估 Language Proficiency
            </h3>

            <div className="mb-6">
              <label className="block font-bold text-slate-700 mb-2">學習華語時間 Learning Duration <span className="text-red-500">*</span></label>
              <select name="learningDuration" value={formData.learningDuration} onChange={handleInputChange} required className="w-full md:w-1/2 border border-slate-300 rounded-lg px-4 py-2.5 outline-none bg-white">
                <option value="" disabled>請選擇 Select Duration</option>
                <option value="3個月以下 (< 3 months)">3個月以下 (&lt; 3 months)</option>
                <option value="3個月 ~ 半年 (3-6 months)">3個月 ~ 半年 (3-6 months)</option>
                <option value="半年 ~ 1年 (6-12 months)">半年 ~ 1年 (6-12 months)</option>
                <option value="1年 ~ 2年 (1-2 years)">1年 ~ 2年 (1-2 years)</option>
                <option value="2年以上 (> 2 years)">2年以上 (&gt; 2 years)</option>
              </select>
            </div>

            <div className="mb-8 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <label className="block font-bold text-slate-700 mb-4">整體華語能力 Overall Proficiency</label>
              <div className="flex flex-wrap gap-3">
                {['不知道 (Unknown)', 'N', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                  <label key={level} className="cursor-pointer">
                    <input type="radio" name="overallLevel" value={level} checked={formData.overallLevel === level} onChange={handleInputChange} className="sr-only" />
                    <div className={`px-5 py-2 rounded-lg font-bold border-2 transition-all ${formData.overallLevel === level ? 'bg-primary border-primary text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/50'}`}>
                      {level}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <p className="text-sm text-slate-500 mb-4">各項能力評估 (1分最弱，5分最強) / Rate your skills (1: Weakest, 5: Strongest)</p>
            <div className="space-y-4">
              {[
                { id: 'levelListening', label: '聽力 Listening' }, { id: 'levelSpeaking', label: '口說 Speaking' },
                { id: 'levelReading', label: '閱讀 Reading' }, { id: 'levelWriting', label: '寫作 Writing' }
              ].map((skill) => (
                <div key={skill.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="font-bold text-slate-700 mb-3 md:mb-0 md:w-1/3">{skill.label} <span className="text-red-500">*</span></span>
                  <div className="flex space-x-2 md:space-x-4 w-full md:w-2/3 justify-between">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <label key={num} className="cursor-pointer group">
                        <input type="radio" name={skill.id} value={num} checked={parseInt(formData[skill.id]) === num} onChange={handleInputChange} required className="sr-only" />
                        <div className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all font-bold ${parseInt(formData[skill.id]) === num ? 'bg-primary border-primary text-white shadow-md transform scale-110' : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:border-primary/50'}`}>
                          {num}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- 區塊 3：輔導需求與時間 --- */}
          <div className="p-8 md:p-10">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
              <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mr-3"><Clock size={18} /></span>
              輔導需求與時間 Tutoring Preferences
            </h3>
            
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-3">想加強的技巧 Target Skills (可複選) <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-4 mb-4">
                {[
                  { id: 'listening', label: '聽力 Listening' }, { id: 'speaking', label: '口說 Speaking' },
                  { id: 'reading', label: '閱讀 Reading' }, { id: 'writing', label: '寫作 Writing' }
                ].map((skill) => (
                  <label key={skill.id} className="flex items-center space-x-2 cursor-pointer bg-slate-50 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                    <input type="checkbox" checked={formData.targetSkills[skill.id]} onChange={() => handleTargetSkillToggle(skill.id)} className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded" />
                    <span className="font-medium text-slate-700">{skill.label}</span>
                  </label>
                ))}
              </div>
              <textarea name="skillsToImprove" value={formData.skillsToImprove} onChange={handleInputChange} placeholder="其他備註：例如希望能聽懂台灣人的口音... (Other details...)" rows="3" className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none transition resize-none"></textarea>
            </div>

            {/* ✨ 整合的複選時段 UI 區塊 */}
            <div className="bg-slate-50 p-6 md:p-8 rounded-xl border border-slate-200">
              <label className="block text-lg font-bold text-slate-800 mb-6">希望輔導的時段 Preferred Time Slot <span className="text-red-500">*</span></label>
              
              <div className="space-y-6">
                <div>
                  <span className="text-sm font-bold text-slate-500 mb-3 block">1. 請選擇您可以的星期 (可複選) / Select Days</span>
                  <div className="flex flex-wrap gap-3">
                    {DAYS.map(day => (
                      <button
                        key={day.id} type="button" onClick={() => handleDayToggle(day.id)}
                        className={`px-5 py-2.5 rounded-lg border-2 font-bold transition-all ${
                          formData.preferredDays.includes(day.id) 
                            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-sm font-bold text-slate-500 mb-3 block">2. 請選擇您可以的時段 (可複選) / Select Time Slots</span>
                  <div className="flex flex-wrap gap-3">
                    {TIME_SLOTS.map(slot => (
                      <button
                        key={slot} type="button" onClick={() => handleTimeSlotToggle(slot)}
                        className={`px-5 py-2.5 rounded-lg border-2 font-bold transition-all ${
                          formData.preferredTimeSlots.includes(slot) 
                            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* 結束整合的複選時段 UI 區塊 */}

          </div>

          {/* --- 送出按鈕區 --- */}
          <div className="bg-slate-50 p-6 md:p-8 border-t border-slate-200 flex justify-end">
            <button type="submit" className="flex items-center px-10 py-3.5 bg-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:bg-primary-dark hover:-translate-y-0.5 transition-all duration-200">
              <CheckCircle2 size={20} className="mr-2" />
              完成
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default TuteeProfileSetup;