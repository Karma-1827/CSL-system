require('dotenv').config(); // 載入 .env 裡面的環境變數
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // 載入 PostgreSQL 連線池

// ✨ 新增這兩行：引入密碼加密與 JWT 套件
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ✨ 新增這三行：處理檔案上
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 🔑 關鍵：必須先有這行創造出 app！
const app = express(); 
app.use(cors());
app.use(express.json());

// ✨ 新增：確認 uploads 資料夾是否存在，沒有就自動建立
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// ✨ 新增：設定 Multer 搬運工的規則（存去哪、檔名怎麼取）
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // 存到 uploads 資料夾
  },
  filename: function (req, file, cb) {
    // 為了避免檔名重複或中文檔名亂碼，我們在檔名加上「當下時間」
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + Buffer.from(file.originalname, 'latin1').toString('utf8'));
  }
});
const upload = multer({ storage: storage });

// ✨ 新增這行：讓前端可以直接透過網址讀取 uploads 資料夾裡的圖片/檔案
app.use('/uploads', express.static('uploads'));

// ✨ 新增這行：JWT 的加密密鑰（實務上會放在 .env 裡，這裡我們先寫死做測試）
const JWT_SECRET = process.env.JWT_SECRET || 'csl_super_secret_key_2026';

// 建立資料庫連線設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 🚀 你的第一支 API：用 GET 方法取得所有使用者
app.get('/api/users', async (req, res) => {
  try {
    // 讓程式去資料庫執行 SQL 語法
    const result = await pool.query('SELECT * FROM users');
    
    // 把撈到的資料用 JSON 格式回傳給前端
    res.json({
      success: true,
      message: '成功連線！這是你的資料：',
      data: result.rows 
    });
  } catch (error) {
    console.error('資料庫查詢錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器發生錯誤' });
  }
});

// 啟動伺服器
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🎉 伺服器已成功啟動！請在瀏覽器打開： http://localhost:${PORT}/api/users`);
});

// 🚀 你的第二支 API：處理登入驗證 (POST)
app.post('/api/login', async (req, res) => {
  const { account, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE account = $1', [account]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: '找不到此帳號，請確認是否輸入正確' });
    }

    const user = result.rows[0];

    // ✨✨ 核心升級：用 bcrypt.compare 來比對「明文密碼」與資料庫裡的「亂碼密碼」
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '密碼錯誤' });
    }

    // ✨✨ 核心升級：密碼正確，核發 JWT 加密通行證 (Token)！
    const token = jwt.sign(
      { id: user.id, account: user.account, role: user.role }, // 包進通行證裡的資訊
      JWT_SECRET, 
      { expiresIn: '1d' } // 通行證有效期限：1 天
    );

    // 回傳給前端時，把 token 一併交給它
    res.json({ 
      success: true, 
      message: '登入成功！', 
      data: { 
        name: user.chinese_name, 
        role: user.role,
        token: token // 👈 把通行證給前端
      } 
    });

  } catch (error) {
    console.error('登入發生錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器發生錯誤' });
  }
});

// 🚀 第三支 API：處理新使用者註冊 (POST)
app.post('/api/register', async (req, res) => {
  const { account, password, email, studentId, role } = req.body;

  if (!account || !password || !email || !studentId || !role) {
    return res.status(400).json({ success: false, message: '所有欄位（包含身份）都必須填寫喔！' });
  }

  try {
    const checkExist = await pool.query(
      'SELECT * FROM users WHERE account = $1 OR email = $2 OR student_id = $3',
      [account, email, studentId]
    );

    if (checkExist.rows.length > 0) {
      return res.status(400).json({ success: false, message: '這個帳號、信箱或學號已經被註冊過囉！' });
    }

    // ✨✨ 核心升級：將密碼加密！
    const salt = await bcrypt.genSalt(10); // 產生隨機鹽把
    const hashedPassword = await bcrypt.hash(password, salt); // 混合密碼並加密

    // ✨ 修改：寫入資料庫時，把原本的 password 換成 hashedPassword
    const result = await pool.query(
      `INSERT INTO users (account, password, email, student_id, role, chinese_name) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [account, hashedPassword, email, studentId, role, ''] 
    );

    res.json({ success: true, message: '🎉 註冊成功！', data: { role: role } });

  } catch (error) {
    console.error('註冊發生錯誤:', error);
    res.status(500).json({ success: false, message: '伺服器發生錯誤' });
  }
});

// 🚀 第四支 API：儲存外籍生的專屬輔導檔案 (POST)
app.post('/api/tutee-profile', async (req, res) => {
  const {
    originalStudentId, // ✨ 新增：接收前端偷偷傳來的「舊學號」
    studentId,         // 這是畫面上可能被使用者修改過的「新學號」
    studentType, chineseName, englishName, program,
    nationality, department, phone, overallLevel, levelListening,
    levelSpeaking, levelReading, levelWriting, targetSkills, 
    skillsToImprove, preferredTimeSlots,
    learningDuration
  } = req.body;

  try {
    // 🔑 關鍵 1：用「舊學號」去 users 表找人！
    const searchId = originalStudentId || studentId;
    const userResult = await pool.query('SELECT id FROM users WHERE student_id = $1', [searchId]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: '找不到此學號，請確認是否與註冊時輸入的一致！' });
    }

    const userId = userResult.rows[0].id;

    // 🔑 關鍵 2：更新 users 表時，順便把學號 (student_id) 也「覆蓋」成最新的！
    await pool.query(
      'UPDATE users SET student_id = $1, chinese_name = $2, english_name = $3 WHERE id = $4', 
      [studentId, chineseName, englishName, userId]
    );

    // 🔑 關鍵 3：寫入 tutee_profiles (維持不變)
    await pool.query(
      `INSERT INTO tutee_profiles 
      (user_id, enrollment_status, nationality, department, program, phone, 
       overall_level, level_listening, level_speaking, level_reading, level_writing, 
       target_skills, skills_to_improve, available_times, learning_duration) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        userId, studentType, nationality, department, program, phone,
        overallLevel, levelListening, levelSpeaking, levelReading, levelWriting, 
        JSON.stringify(targetSkills), skillsToImprove, JSON.stringify(preferredTimeSlots),
        learningDuration
      ]
    );

    res.json({ success: true, message: '輔導資料建立成功！' });

  } catch (error) {
    console.error('儲存個人資料失敗:', error);
    res.status(500).json({ success: false, message: '伺服器發生錯誤，請看後端終端機' });
  }
});

// 🚀 第五支 API：根據帳號獲取使用者基本資訊 (GET)
app.get('/api/user/:account', async (req, res) => {
  try {
    const { account } = req.params;
    const result = await pool.query(
      'SELECT chinese_name, english_name, student_id, role FROM users WHERE account = $1', 
      [account]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(404).json({ success: false, message: '找不到使用者' });
    }
  } catch (error) {
    console.error('獲取使用者資訊失敗:', error);
    res.status(500).json({ success: false, message: '伺服器發生錯誤' });
  }
});

// 🚀 第六支 API：獲取使用者「完整」的個人與輔導/教學資訊 (GET)
app.get('/api/profile/:account', async (req, res) => {
  try {
    const { account } = req.params;
    
    // ✨ 終極合併語法：同時去外籍生 (p) 和小老師 (t) 表格撈資料
    const result = await pool.query(
      `SELECT 
        u.id as user_id,
        u.account, u.chinese_name, u.english_name, u.role, u.student_id, u.email,
        p.matched_tutor_id, t.matched_tutee_id,
        COALESCE(p.department, t.department) as department,
        COALESCE(p.phone, t.phone) as phone,
        COALESCE(p.nationality, t.nationality) as nationality,
        p.overall_level,
        p.learning_duration,
        COALESCE(p.level_listening, t.level_listening) as level_listening,
        COALESCE(p.level_speaking, t.level_speaking) as level_speaking,
        COALESCE(p.level_reading, t.level_reading) as level_reading,
        COALESCE(p.level_writing, t.level_writing) as level_writing,
        p.target_skills,
        p.skills_to_improve,
        COALESCE(p.available_times, t.available_times) as available_times,
        t.teaching_notes,
        t.certification_file,
        t.certification_status
       FROM users u
       LEFT JOIN tutee_profiles p ON u.id = p.user_id
       LEFT JOIN tutor_profiles t ON u.id = t.user_id
       WHERE u.account = $1`, 
      [account]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(404).json({ success: false, message: '找不到使用者' });
    }
  } catch (error) {
    console.error('獲取完整個人資訊失敗:', error);
    res.status(500).json({ success: false, message: '伺服器發生錯誤' });
  }
});

// 🚀 第七支 API：儲存小老師的專屬檔案與「實體證書」 (POST)
// ✨ 注意這裡多了一個 upload.single('certificationFile')
app.post('/api/tutor-profile', upload.single('certificationFile'), async (req, res) => {
  // 當使用了 FormData，純文字資料會在 req.body，檔案會在 req.file
  const {
    studentId, chineseName, englishName, studentStatus, program,
    nationality, department, phone, 
    levelListening, levelSpeaking, levelReading, levelWriting, teachingNotes,
    availableTimes // 👈 這裡現在是一串字串，等一下要轉回陣列
  } = req.body;

  // ✨ 取得剛存好的檔案名稱（如果有上傳的話）
  const certificationFileName = req.file ? req.file.filename : null;

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE student_id = $1', [studentId]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: '找不到此學號，請確認是否與註冊時一致！' });
    }
    const userId = userResult.rows[0].id;

    await pool.query(
      'UPDATE users SET chinese_name = $1, english_name = $2 WHERE id = $3', 
      [chineseName, englishName, userId]
    );

    // ✨ 寫入資料庫：多存一個 certificationFileName，並記得解析 availableTimes
    await pool.query(
      `INSERT INTO tutor_profiles 
      (user_id, student_status, program, nationality, department, phone, 
       level_listening, level_speaking, level_reading, level_writing, teaching_notes, available_times, certification_file) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        userId, studentStatus, program, nationality, department, phone, 
        levelListening, levelSpeaking, levelReading, levelWriting, teachingNotes, 
        availableTimes, // 這裡前端等一下會幫我們 stringify 好
        certificationFileName // 👈 把真正的檔名存進資料庫
      ]
    );

    res.json({ success: true, message: '小老師資料與檔案建立成功！' });
  } catch (error) {
    console.error('儲存小老師資料失敗:', error);
    res.status(500).json({ success: false, message: '伺服器發生錯誤' });
  }
});


// 🚀 第八支 API：管理員專用，獲取所有小老師或外籍生清單與詳細資料 (GET)
app.get('/api/admin/users/:role', async (req, res) => {
  try {
    const { role } = req.params; // 'tutor' 或 'tutee'
    let query = '';

    if (role === 'tutor') {
      // 撈取小老師
      query = `SELECT u.account, u.chinese_name, u.english_name, u.student_id, u.email,
               t.department, t.phone, t.nationality, t.student_status, t.program, 
               t.level_listening, t.level_speaking, t.level_reading, t.level_writing, 
               t.teaching_notes, t.certification_file, t.certification_status
               FROM users u 
               LEFT JOIN tutor_profiles t ON u.id = t.user_id 
               WHERE u.role = 'tutor'`;
    } else if (role === 'tutee') {
      // 撈取外籍生
      query = `SELECT u.account, u.chinese_name, u.english_name, u.student_id, u.email,
               p.department, p.phone, p.nationality, p.overall_level, 
               p.target_skills, p.skills_to_improve
               FROM users u 
               LEFT JOIN tutee_profiles p ON u.id = p.user_id 
               WHERE u.role = 'tutee'`;
    } else {
      return res.status(400).json({ success: false, message: '身分參數錯誤' });
    }

    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('獲取用戶清單失敗:', error);
    res.status(500).json({ success: false, message: '伺服器發生錯誤' });
  }
});

// 🚨 臨時工具：一鍵幫管理員重設並加密密碼
app.get('/api/setup-admin', async (req, res) => {
  try {
    // 1. 產生一組加密過的新密碼（這裡預設新密碼為 'admin123'）
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // 2. 去資料庫把身分為 admin，或者帳號叫做 admin 的密碼更新掉
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE role = 'admin' OR account = 'admin' RETURNING account",
      [hashedPassword]
    );

    if (result.rows.length > 0) {
      res.send(`<h1>🎉 成功！</h1><p>管理員 (${result.rows[0].account}) 的密碼已經成功加密並重設為：<b>admin123</b></p><p>現在可以回首頁登入了！</p>`);
    } else {
      res.send('找不到 admin 帳號，請去 TablePlus 確認你的管理員帳號 (account) 叫什麼名字。');
    }
  } catch (error) {
    res.send('發生錯誤：' + error.message);
  }
});

// 🚀 第九支 API：管理員送出審查結果 (通過 / 補件) (POST)
app.post('/api/admin/review-cert', async (req, res) => {
  const { studentId, status } = req.body; // status 會是 'approved' 或 'resubmit'
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE student_id = $1', [studentId]);
    if (userRes.rows.length === 0) return res.status(400).json({ success: false });
    
    await pool.query(
      "UPDATE tutor_profiles SET certification_status = $1 WHERE user_id = $2",
      [status, userRes.rows[0].id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

// 🚀 第十支 API：小老師重新上傳(補件)證書 (POST)
app.post('/api/tutor/reupload-cert', upload.single('certificationFile'), async (req, res) => {
  const { account } = req.body;
  const filename = req.file ? req.file.filename : null;
  
  if (!filename) return res.status(400).json({ success: false, message: '沒有收到檔案' });
  
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE account = $1', [account]);
    // ✨ 魔法：更新檔案，並把狀態自動改回 'pending' (未審查)，讓管理員可以再次看到！
    await pool.query(
      "UPDATE tutor_profiles SET certification_file = $1, certification_status = 'pending' WHERE user_id = $2",
      [filename, userRes.rows[0].id]
    );
    res.json({ success: true, filename });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 第十一支 API：小老師專用 - 尋找外籍生 (GET)
app.get('/api/match/tutees', async (req, res) => {
  try {
    // 撈取所有外籍生，並透過 LEFT JOIN 檢查他們在 match_requests 表裡的狀態
    const query = `
      SELECT 
        u.id as tutee_user_id, u.student_id, u.chinese_name, u.english_name,
        p.nationality, p.learning_duration, p.overall_level, 
        p.target_skills, p.available_times, p.skills_to_improve,
        m.status as match_status, m.tutor_id as matched_tutor_id
      FROM users u
      JOIN tutee_profiles p ON u.id = p.user_id
      LEFT JOIN match_requests m ON u.id = m.tutee_id AND m.status IN ('pending', 'accepted')
      WHERE u.role = 'tutee'
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('獲取外籍生列表失敗:', error);
    res.status(500).json({ success: false });
  }
});

// 🚀 第十二支 API：小老師對外籍生「發送邀請」 (POST)
app.post('/api/match/request', async (req, res) => {
  const { tutorAccount, tuteeUserId } = req.body;
  try {
    // 1. 先找出這位小老師的 user_id
    const tutorRes = await pool.query('SELECT id FROM users WHERE account = $1', [tutorAccount]);
    if (tutorRes.rows.length === 0) return res.status(400).json({ success: false, message: '找不到小老師' });
    const tutorId = tutorRes.rows[0].id;

    // 2. 檢查是否已經有人搶先一步發出邀請了 (避免重複發送)
    const checkRes = await pool.query(
      "SELECT id FROM match_requests WHERE tutee_id = $1 AND status IN ('pending', 'accepted')", 
      [tuteeUserId]
    );
    if (checkRes.rows.length > 0) return res.status(400).json({ success: false, message: '手腳太慢啦！這位學生剛被其他人邀請或配對了。' });

    // 3. 寫入邀請紀錄
    await pool.query(
      "INSERT INTO match_requests (tutor_id, tutee_id, status) VALUES ($1, $2, 'pending')",
      [tutorId, tuteeUserId]
    );

    res.json({ success: true, message: '✅ 邀請已成功發送！請靜候外籍生回覆。' });
  } catch (error) {
    console.error('發送邀請失敗:', error);
    res.status(500).json({ success: false });
  }
});

// 🚀 第十三支 API：外籍生查看「收到的邀請」 (GET)
app.get('/api/match/requests/:account', async (req, res) => {
  const { account } = req.params;
  try {
    const tuteeRes = await pool.query('SELECT id FROM users WHERE account = $1', [account]);
    if (tuteeRes.rows.length === 0) return res.status(404).json({ success: false });
    const tuteeId = tuteeRes.rows[0].id;

    // 找出所有 status = 'pending' 的邀請，並附上小老師的資料
    const query = `
      SELECT 
        m.id as request_id,
        u.id as tutor_user_id, u.chinese_name, u.english_name, u.student_id,
        t.department, t.student_status, t.teaching_notes, t.available_times
      FROM match_requests m
      JOIN users u ON m.tutor_id = u.id
      JOIN tutor_profiles t ON u.id = t.user_id
      WHERE m.tutee_id = $1 AND m.status = 'pending'
    `;
    const result = await pool.query(query, [tuteeId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 第十四支 API：外籍生回應邀請 (同意 / 婉拒) (POST)
app.post('/api/match/respond', async (req, res) => {
  const { requestId, tuteeAccount, tutorUserId, action } = req.body;
  try {
    const tuteeRes = await pool.query('SELECT id FROM users WHERE account = $1', [tuteeAccount]);
    const tuteeId = tuteeRes.rows[0].id;

    if (action === 'reject') {
      await pool.query("UPDATE match_requests SET status = 'rejected' WHERE id = $1", [requestId]);
      return res.json({ success: true, message: '已婉拒該邀請' });
    }

    if (action === 'accept') {
      // 1. 同意該邀請
      await pool.query("UPDATE match_requests SET status = 'accepted' WHERE id = $1", [requestId]);
      // 2. 把其他發給這位外籍生的邀請，全部自動拒絕
      await pool.query("UPDATE match_requests SET status = 'rejected' WHERE tutee_id = $1 AND status = 'pending'", [tuteeId]);
      // 3. 寫入雙向綁定 ID！
      await pool.query("UPDATE tutee_profiles SET matched_tutor_id = $1 WHERE user_id = $2", [tutorUserId, tuteeId]);
      await pool.query("UPDATE tutor_profiles SET matched_tutee_id = $1 WHERE user_id = $2", [tuteeId, tutorUserId]);

      return res.json({ success: true, message: '🎉 配對成功！' });
    }
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 第十五支 API：獲取已配對的小老師詳細資訊 (GET)
app.get('/api/match/tutor-info/:tutorId', async (req, res) => {
  try {
    const query = `
      SELECT u.chinese_name, u.english_name, u.email, 
             t.student_status, t.department, t.teaching_notes, t.available_times
      FROM users u
      JOIN tutor_profiles t ON u.id = t.user_id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [req.params.tutorId]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 第十六支 API：獲取已配對的外籍生詳細資訊 (GET)
app.get('/api/match/tutee-info/:tuteeId', async (req, res) => {
  try {
    const query = `
      SELECT u.chinese_name, u.english_name, u.email, u.student_id,
             p.nationality, p.department, p.learning_duration, p.overall_level,
             p.target_skills, p.skills_to_improve, p.available_times
      FROM users u
      JOIN tutee_profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [req.params.tuteeId]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 第十七支 API：小老師安排課程 (支援單次、多天與重複) (POST)
app.post('/api/classes/schedule', async (req, res) => {
  const { tutorAccount, tuteeUserId, slots, isRecurring, endDate } = req.body;
  
  try {
    // 1. 找出小老師的 ID
    const tutorRes = await pool.query('SELECT id FROM users WHERE account = $1', [tutorAccount]);
    const tutorId = tutorRes.rows[0].id;

    // 2. 準備要寫入的日期陣列
    let classInstances = [];
    
    // 針對每一個設定的時段 (可能是一天，也可能是兩天)
    for (const slot of slots) {
        const baseDate = new Date(slot.date);
        // 把首週的課加進去
        classInstances.push({ date: slot.date, start: slot.startTime, end: slot.endTime });
        
        // 如果有勾選重複，且有設定結束日期
        if (isRecurring && endDate) {
            const end = new Date(endDate);
            let nextDate = new Date(baseDate);
            nextDate.setDate(nextDate.getDate() + 7); // 加 7 天
            
            // 一直加 7 天，直到超過結束日期為止
            while (nextDate <= end) {
                classInstances.push({ 
                    date: nextDate.toISOString().split('T')[0], 
                    start: slot.startTime, 
                    end: slot.endTime 
                });
                nextDate.setDate(nextDate.getDate() + 7);
            }
        }
    }

    // 3. 批次寫入資料庫
    for (const cls of classInstances) {
      await pool.query(
        `INSERT INTO classes (tutor_id, tutee_id, class_date, start_time, end_time) 
         VALUES ($1, $2, $3, $4, $5)`,
        [tutorId, tuteeUserId, cls.date, cls.start, cls.end]
      );
    }

    res.json({ success: true, message: `✅ 成功排定 ${classInstances.length} 堂課程！` });
  } catch (error) {
    console.error('排課失敗:', error);
    res.status(500).json({ success: false, message: '排課失敗' });
  }
});

// 🚀 第十八支 API：獲取某人的所有課程 (GET)
app.get('/api/classes/:userId', async (req, res) => {
  try {
    // 找出所有未取消的課程，並依照日期與時間排序
    const query = `
      SELECT id, class_date, start_time, end_time, status 
      FROM classes 
      WHERE (tutor_id = $1 OR tutee_id = $1) AND status != 'cancelled'
      ORDER BY class_date ASC, start_time ASC
    `;
    const result = await pool.query(query, [req.params.userId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 第十九支 API：編輯單筆課程時間 (PUT)
app.put('/api/classes/:id', async (req, res) => {
  const { classDate, startTime, endTime } = req.body;
  try {
    await pool.query(
      'UPDATE classes SET class_date = $1, start_time = $2, end_time = $3 WHERE id = $4',
      [classDate, startTime, endTime, req.params.id]
    );
    res.json({ success: true, message: '✅ 課程時間已成功更新！' });
  } catch (error) {
    console.error('更新課程失敗:', error);
    res.status(500).json({ success: false, message: '更新失敗' });
  }
});