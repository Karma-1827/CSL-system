require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const libre = require("libreoffice-convert");
const util = require("util");
const convertAsync = util.promisify(libre.convert);
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

const app = express();
app.use(cors());
app.use(express.json());

if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      uniqueSuffix +
        "-" +
        Buffer.from(file.originalname, "latin1").toString("utf8"),
    );
  },
});
const upload = multer({ storage: storage });

app.use("/uploads", express.static("uploads"));

const JWT_SECRET = process.env.JWT_SECRET || "csl_super_secret_key_2026";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ensureProfileColumns = async () => {
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS participant_type TEXT");
  await pool.query(`
    UPDATE users
    SET participant_type = CASE
      WHEN role = 'tutor' THEN 'ntnu_tutor'
      WHEN role = 'tutee' THEN 'general_tutee'
      ELSE role
    END
    WHERE participant_type IS NULL
  `);
  await pool.query(
    "ALTER TABLE tutee_profiles ADD COLUMN IF NOT EXISTS native_language TEXT",
  );
  await pool.query(
    "ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS native_language TEXT",
  );
};

ensureProfileColumns().catch((error) => {
  console.error("確認 profile 欄位失敗:", error);
});

app.get("/api/preview/:filename", async (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const ext = path.extname(filename).toLowerCase();
  const originalFilePath = path.join(__dirname, "uploads", filename);

  // 確認原本的檔案存不存在
  if (!fs.existsSync(originalFilePath)) {
    return res.status(404).json({ success: false, message: "找不到檔案" });
  }

  // 🚀 如果是 Word 檔 (.docx 或 .doc)，執行轉檔邏輯
  if (ext === ".docx" || ext === ".doc") {
    // 設定轉換後的 PDF 檔名與路徑
    const pdfFilename = filename.replace(ext, ".pdf");
    const pdfFilePath = path.join(__dirname, "uploads", pdfFilename);

    // 如果已經轉換過了，就直接回傳快取的 PDF，節省效能
    if (fs.existsSync(pdfFilePath)) {
      return res.sendFile(pdfFilePath);
    }

    // 尚未轉換過，開始執行轉換
    try {
      console.log(`🔄 正在將 ${filename} 轉換為 PDF...`);
      const docxBuf = fs.readFileSync(originalFilePath);

      // 執行轉換 (轉換為 .pdf)，將第三個參數改為 null
      const pdfBuf = await convertAsync(docxBuf, ".pdf", null);

      // 將轉換好的 PDF 寫入 uploads 資料夾
      fs.writeFileSync(pdfFilePath, pdfBuf);
      console.log(`✅ 轉換成功！已建立 ${pdfFilename}`);

      // 回傳 PDF 給前端預覽
      return res.sendFile(pdfFilePath);
    } catch (err) {
      console.error("❌ 轉換 PDF 失敗:", err);
      return res.status(500).json({
        success: false,
        message: "檔案轉換失敗，請確認伺服器是否已安裝 LibreOffice",
      });
    }
  }

  // 🚀 如果是其他檔案（圖片、PDF等），直接回傳原檔
  res.sendFile(originalFilePath);
});

// 🚀 產生並下載動態 PDF 證書 (POST)
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

app.post("/api/generate-cert-pdf", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: "缺少 userId" });
  }

  try {
    // 1. 撈取資料
    const userRes = await pool.query(
      "SELECT chinese_name, student_id FROM users WHERE id = $1",
      [userId],
    );
    const classesRes = await pool.query(
      `SELECT c.class_date::text as date, EXTRACT(EPOCH FROM (TO_TIMESTAMP(c.end_time::text, 'HH24:MI:SS') - TO_TIMESTAMP(c.start_time::text, 'HH24:MI:SS'))) / 3600.0 AS hours
       FROM hours_review hr JOIN classes c ON hr.class_id = c.id
       WHERE hr.tutor_id = $1 AND hr.status = 'approved' ORDER BY c.class_date ASC`,
      [userId],
    );

    const user = userRes.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: "找不到使用者" });
    }

    const totalHours = classesRes.rows
      .reduce((sum, cls) => sum + parseFloat(cls.hours), 0)
      .toFixed(1);

    // 2. 讀取 template.pdf
    const templatePath = path.join(__dirname, "uploads", "template.pdf");
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const templatePdfDoc = await PDFDocument.load(existingPdfBytes);

    // 3. 載入中文字體 (請把 kaiu.ttf 放在 uploads 資料夾內)
    const fontBytes = fs.readFileSync(
      path.join(__dirname, "uploads", "kaiu.ttf"),
    );
    pdfDoc.registerFontkit(fontkit);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // 1. 定義字體與「智慧斷行與拼接」的繪製函數
    const customFont = await pdfDoc.embedFont(fontBytes);
    const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const darkBlue = rgb(0.1, 0.1, 0.4);
    const tableStartX = 70;
    const tableEndX = 500;
    const dateColumn = { x: 45, width: 150 };
    const hoursColumn = { x: 400, width: 110 };
    const continuedHeaderY = 570;
    const footerDateX = 70;
    const footerDateY = 65;
    const footerDateSize = 18;

    const drawCenteredText = (page, text, column, y, size, font, color) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: column.x + (column.width - textWidth) / 2,
        y,
        size,
        font,
        color,
      });
    };

    const drawTableHeader = (page, y) => {
      drawCenteredText(
        page,
        "輔導日期",
        dateColumn,
        y,
        15,
        customFont,
        rgb(0, 0, 0),
      );
      drawCenteredText(
        page,
        "輔導時數",
        hoursColumn,
        y,
        15,
        customFont,
        rgb(0, 0, 0),
      );
      page.drawLine({
        start: { x: tableStartX, y: y - 5 },
        end: { x: tableEndX, y: y - 5 },
        thickness: 2.25,
        color: rgb(0, 0, 0),
      });
    };

    const drawSmartText = (page, parts, x, y, maxWidth, size) => {
      let currentX = x;
      let currentY = y;

      for (const part of parts) {
        const words = part.text.split(""); // 逐字處理，確保中文斷行精準
        for (const char of words) {
          const textSize = part.size || size;
          const charWidth = part.font.widthOfTextAtSize(char, textSize);
          // 檢查是否超出邊界 (maxWidth = 450)
          if (currentX + charWidth > x + maxWidth) {
            currentX = x; // 回到左邊界
            currentY -= 25; // 往下移一行
          }
          // --- 強化粗體邏輯 ---
          if (part.bold) {
            // 向左偏移一點點
            page.drawText(char, {
              x: currentX - 0.5,
              y: currentY,
              size: textSize,
              font: part.font,
              color: part.color,
            });
            // 向右偏移一點點
            page.drawText(char, {
              x: currentX + 0.5,
              y: currentY,
              size: textSize,
              font: part.font,
              color: part.color,
            });
            // 原位再畫一次確保填滿
            page.drawText(char, {
              x: currentX,
              y: currentY,
              size: textSize,
              font: part.font,
              color: part.color,
            });
          }

          page.drawText(char, {
            x: currentX,
            y: currentY,
            size: textSize,
            font: part.font,
            color: part.color || rgb(0, 0, 0),
          });
          currentX += charWidth;
        }
      }
      return currentY; // 回傳最後結束的 Y 座標
    };

    // 2. 定義內容段落
    const section1Parts = [
      {
        text: `茲證明 ${user.chinese_name} 同學（學號：`,
        font: customFont,
        size: 16,
        color: darkBlue,
        bold: true,
      },
      {
        text: `${user.student_id}`,
        font: timesFont,
        size: 16,
        color: darkBlue,
        bold: true,
      },
      { text: `）`, font: customFont, size: 16, color: darkBlue, bold: true },
    ];

    const section2Parts = [
      {
        text: "於本系擔任外籍生華語輔導小老師期間，積極輔導外籍學生學習華語，認真履行輔導職責，已完成輔導實習時數共",
        font: customFont,
        size: 14,
        color: darkBlue,
      },
      { text: `${totalHours}`, font: timesFont, size: 14, color: darkBlue },
      { text: "小時，特此證明。", font: customFont, size: 14, color: darkBlue },
    ];

    // 3. 執行繪製 (會自動計算斷行後的 Y 座標)
    let currentY = 570;
    drawSmartText(firstPage, section1Parts, 70, currentY, 440, 16);

    currentY -= 30; // 段落間距
    currentY = drawSmartText(firstPage, section2Parts, 70, currentY, 440, 14);

    // 4. 繪製表頭 (使用計算後的 currentY 往下推)
    const headerY = currentY - 33;
    drawTableHeader(firstPage, headerY);

    // 5. 繪製表格內容 (循環 + 自動換頁 + 重置)
    // 1. 確保繪製時明確指定頁面
    let currentPage = firstPage;
    let yPos = headerY - 30; // 你的表格起始位置

    const addContinuedPage = async (drawHeader = true) => {
      const [copiedPage] = await pdfDoc.copyPages(templatePdfDoc, [0]);
      currentPage = pdfDoc.addPage(copiedPage);
      yPos = continuedHeaderY - 30;

      if (drawHeader) {
        drawTableHeader(currentPage, continuedHeaderY);
      }
    };

    for (const cls of classesRes.rows) {
      // 檢查是否超出邊界
      if (yPos < 100) {
        await addContinuedPage();
      }

      // [關鍵] 確保這裡使用的是 currentPage，而不是寫死的 firstPage
      drawCenteredText(
        currentPage,
        cls.date,
        dateColumn,
        yPos,
        14,
        timesFont,
        rgb(0, 0, 0),
      );
      drawCenteredText(
        currentPage,
        `${parseFloat(cls.hours).toFixed(1)}`,
        hoursColumn,
        yPos,
        14,
        timesFont,
        rgb(0, 0, 0),
      );
      yPos -= 28;
    }

    // 6. 繪製總計
    if (yPos < 180) {
      await addContinuedPage(false);
    }

    const totalY = yPos;
    currentPage.drawLine({
      start: { x: tableStartX, y: totalY + 20 },
      end: { x: tableEndX, y: totalY + 20 },
      thickness: 2.25,
      color: rgb(0, 0, 0),
    });
    currentPage.drawText("總時數", {
      x:
        dateColumn.x +
        (dateColumn.width - customFont.widthOfTextAtSize("總時數", 14)) / 2,
      y: totalY,
      size: 14,
      font: customFont,
    });
    drawCenteredText(
      currentPage,
      `${totalHours}`,
      hoursColumn,
      totalY,
      14,
      timesFont,
      rgb(0, 0, 0),
    );

    // 繪製底部日期
    const now = new Date();
    drawSmartText(
      currentPage,
      [
        {
          text: "中華民國 ",
          font: customFont,
          size: footerDateSize,
          bold: true,
        },
        {
          text: `${now.getFullYear() - 1911}`,
          font: timesFont,
          size: footerDateSize,
          bold: true,
        },
        { text: " 年 ", font: customFont, size: footerDateSize, bold: true },
        {
          text: `${now.getMonth() + 1}`,
          font: timesFont,
          size: footerDateSize,
          bold: true,
        },
        { text: " 月 ", font: customFont, size: footerDateSize, bold: true },
        {
          text: `${now.getDate()}`,
          font: timesFont,
          size: footerDateSize,
          bold: true,
        },
        { text: " 日", font: customFont, size: footerDateSize, bold: true },
      ],
      footerDateX,
      footerDateY,
      240,
      footerDateSize,
    );

    // 5. 輸出
    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("PDF 產生失敗:", error);
    res.status(500).json({ success: false, message: "PDF 產生失敗" });
  }
});

// ✅ 工具函式：統一把 class_date 轉成純字串 "YYYY-MM-DD"
const getDateStr = (classDate) => {
  if (typeof classDate === "string") return classDate.split("T")[0];
  if (classDate instanceof Date) return classDate.toISOString().split("T")[0];
  return String(classDate).split("T")[0];
};

const PORT = 3001;
app.listen(PORT, () => {
  console.log(
    `🎉 伺服器已成功啟動！請在瀏覽器打開： http://localhost:${PORT}/api/users`,
  );
});

// 🚀 第一支 API：取得所有使用者 (GET)
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json({
      success: true,
      message: "成功連線！這是你的資料：",
      data: result.rows,
    });
  } catch (error) {
    console.error("資料庫查詢錯誤:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 第二支 API：登入驗證 (POST)
app.post("/api/login", async (req, res) => {
  const { account, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE account = $1", [
      account,
    ]);
    if (result.rows.length === 0)
      return res
        .status(401)
        .json({ success: false, message: "找不到此帳號，請確認是否輸入正確" });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "密碼錯誤" });

    const token = jwt.sign(
      {
        id: user.id,
        account: user.account,
        role: user.role,
        participantType: user.participant_type,
      },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      success: true,
      message: "登入成功！",
      data: {
        name: user.chinese_name,
        role: user.role,
        participantType: user.participant_type,
        token,
      },
    });
  } catch (error) {
    console.error("登入發生錯誤:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 第三支 API：新使用者註冊 (POST)
app.post("/api/register", async (req, res) => {
  const { account, password, email, studentId, role, participantType } = req.body;
  if (!account || !password || !email || !studentId || !role)
    return res
      .status(400)
      .json({ success: false, message: "所有欄位（包含身份）都必須填寫喔！" });

  try {
    const normalizedParticipantType =
      participantType || (role === "tutor" ? "ntnu_tutor" : "general_tutee");
    const allowedParticipantTypes = [
      "ntnu_tutor",
      "general_tutee",
      "maryland_exchange",
    ];
    if (!allowedParticipantTypes.includes(normalizedParticipantType)) {
      return res.status(400).json({ success: false, message: "註冊身份不正確" });
    }
    const normalizedRole =
      normalizedParticipantType === "ntnu_tutor" ? "tutor" : "tutee";

    const checkExist = await pool.query(
      "SELECT * FROM users WHERE account = $1 OR email = $2 OR student_id = $3",
      [account, email, studentId],
    );
    if (checkExist.rows.length > 0)
      return res.status(400).json({
        success: false,
        message: "這個帳號、信箱或學號已經被註冊過囉！",
      });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      `INSERT INTO users (account, password, email, student_id, role, chinese_name, participant_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        account,
        hashedPassword,
        email,
        studentId,
        normalizedRole,
        "",
        normalizedParticipantType,
      ],
    );

    res.json({
      success: true,
      message: "🎉 註冊成功！",
      data: { role: normalizedRole, participantType: normalizedParticipantType },
    });
  } catch (error) {
    console.error("註冊發生錯誤:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 第四支 API：儲存外籍生檔案 (POST)
app.post("/api/tutee-profile", async (req, res) => {
  const {
    originalStudentId,
    studentId,
    gender,
    nativeLanguage,
    studentType,
    chineseName,
    englishName,
    program,
    nationality,
    department,
    phone,
    overallLevel,
    levelListening,
    levelSpeaking,
    levelReading,
    levelWriting,
    targetSkills,
    skillsToImprove,
    preferredTimeSlots,
    learningDuration,
  } = req.body;

  try {
    const searchId = originalStudentId || studentId;
    const userResult = await pool.query(
      "SELECT id FROM users WHERE student_id = $1",
      [searchId],
    );
    if (userResult.rows.length === 0)
      return res.status(400).json({
        success: false,
        message: "找不到此學號，請確認是否與註冊時輸入的一致！",
      });

    const userId = userResult.rows[0].id;
    await pool.query(
      "UPDATE users SET student_id = $1, chinese_name = $2, english_name = $3 WHERE id = $4",
      [studentId, chineseName, englishName, userId],
    );

    await pool.query(
      `INSERT INTO tutee_profiles 
      (user_id, enrollment_status, nationality, department, program, phone, 
       overall_level, level_listening, level_speaking, level_reading, level_writing, 
       target_skills, skills_to_improve, available_times, learning_duration, gender, native_language) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        userId,
        studentType,
        nationality,
        department,
        program,
        phone,
        overallLevel,
        levelListening,
        levelSpeaking,
        levelReading,
        levelWriting,
        JSON.stringify(targetSkills),
        skillsToImprove,
        JSON.stringify(preferredTimeSlots),
        learningDuration,
        gender,
        nativeLanguage,
      ],
    );

    res.json({ success: true, message: "輔導資料建立成功！" });
  } catch (error) {
    console.error("儲存個人資料失敗:", error);
    res
      .status(500)
      .json({ success: false, message: "伺服器發生錯誤，請看後端終端機" });
  }
});

// 🚀 第五支 API：根據帳號獲取使用者基本資訊 (GET)
app.get("/api/user/:account", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT chinese_name, english_name, student_id, role, participant_type FROM users WHERE account = $1",
      [req.params.account],
    );
    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(404).json({ success: false, message: "找不到使用者" });
    }
  } catch (error) {
    console.error("獲取使用者資訊失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 第六支 API：獲取使用者完整個人資訊 (GET)
app.get("/api/profile/:account", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id as user_id,
        u.account, u.chinese_name, u.english_name, u.role, u.participant_type,
        u.student_id, u.email,
        p.matched_tutor_id, t.matched_tutee_id,
        COALESCE(p.department, t.department) as department,
        COALESCE(p.phone, t.phone) as phone,
        COALESCE(p.nationality, t.nationality) as nationality,
        COALESCE(p.gender, t.gender) as gender,
        COALESCE(p.native_language, t.native_language) as native_language,
        p.overall_level, p.learning_duration,
        COALESCE(p.level_listening, t.level_listening) as level_listening,
        COALESCE(p.level_speaking, t.level_speaking) as level_speaking,
        COALESCE(p.level_reading, t.level_reading) as level_reading,
        COALESCE(p.level_writing, t.level_writing) as level_writing,
        p.target_skills, p.skills_to_improve,
        COALESCE(p.available_times, t.available_times) as available_times,
        t.teaching_notes, t.certification_file, t.certification_status
       FROM users u
       LEFT JOIN tutee_profiles p ON u.id = p.user_id
       LEFT JOIN tutor_profiles t ON u.id = t.user_id
       WHERE u.account = $1`,
      [req.params.account],
    );

    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(404).json({ success: false, message: "找不到使用者" });
    }
  } catch (error) {
    console.error("獲取完整個人資訊失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 第七支 API：儲存老師檔案 (POST)
app.post(
  "/api/tutor-profile",
  upload.single("certificationFile"),
  async (req, res) => {
    const {
      studentId,
      gender,
      nativeLanguage,
      chineseName,
      englishName,
      studentStatus,
      program,
      nationality,
      department,
      phone,
      levelListening,
      levelSpeaking,
      levelReading,
      levelWriting,
      teachingNotes,
      availableTimes,
    } = req.body;
    const certificationFileName = req.file ? req.file.filename : null;

    try {
      const userResult = await pool.query(
        "SELECT id FROM users WHERE student_id = $1",
        [studentId],
      );
      if (userResult.rows.length === 0)
        return res.status(400).json({
          success: false,
          message: "找不到此學號，請確認是否與註冊時一致！",
        });

      const userId = userResult.rows[0].id;
      await pool.query(
        "UPDATE users SET chinese_name = $1, english_name = $2 WHERE id = $3",
        [chineseName, englishName, userId],
      );

      await pool.query(
        `INSERT INTO tutor_profiles 
      (user_id, student_status, program, nationality, department, phone, 
       level_listening, level_speaking, level_reading, level_writing, teaching_notes, available_times, certification_file, gender, native_language) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          userId,
          studentStatus,
          program,
          nationality,
          department,
          phone,
          levelListening,
          levelSpeaking,
          levelReading,
          levelWriting,
          teachingNotes,
          availableTimes,
          certificationFileName,
          gender,
          nativeLanguage,
        ],
      );

      res.json({ success: true, message: "老師資料與檔案建立成功！" });
    } catch (error) {
      console.error("儲存老師資料失敗:", error);
      res.status(500).json({ success: false, message: "伺服器發生錯誤" });
    }
  },
);

// 🚀 第八支 API：管理員獲取所有學生清單 (GET)
app.get("/api/admin/users/:role", async (req, res) => {
  try {
    const { role } = req.params;
    let query = "";
    if (role === "tutor") {
      query = `SELECT u.id, u.account, u.chinese_name, u.english_name, u.student_id, u.email,
               u.participant_type,
               t.department, t.phone, t.nationality, t.student_status, t.program, 
               t.level_listening, t.level_speaking, t.level_reading, t.level_writing, 
               t.teaching_notes, t.certification_file, t.certification_status
               FROM users u 
               LEFT JOIN tutor_profiles t ON u.id = t.user_id 
               WHERE u.role = 'tutor'`;
    } else if (role === "tutee") {
      query = `SELECT u.id, u.account, u.chinese_name, u.english_name, u.student_id, u.email,
               u.participant_type,
               p.department, p.phone, p.nationality, p.overall_level, 
               p.target_skills, p.skills_to_improve
               FROM users u 
               LEFT JOIN tutee_profiles p ON u.id = p.user_id 
               WHERE u.role = 'tutee'`;
    } else {
      return res.status(400).json({ success: false, message: "身分參數錯誤" });
    }
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("獲取用戶清單失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 臨時工具：重設管理員密碼
app.get("/api/setup-admin", async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);
    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE role = 'admin' OR account = 'admin' RETURNING account",
      [hashedPassword],
    );
    if (result.rows.length > 0) {
      res.send(
        `<h1>🎉 成功！</h1><p>管理員 (${result.rows[0].account}) 的密碼已重設為：<b>admin123</b></p>`,
      );
    } else {
      res.send("找不到 admin 帳號");
    }
  } catch (error) {
    res.send("發生錯誤：" + error.message);
  }
});

// 🚀 第九支 API：管理員送出審查結果 (POST)
app.post("/api/admin/review-cert", async (req, res) => {
  const { studentId, status } = req.body;
  try {
    const userRes = await pool.query(
      "SELECT id FROM users WHERE student_id = $1",
      [studentId],
    );
    if (userRes.rows.length === 0)
      return res.status(400).json({ success: false });
    await pool.query(
      "UPDATE tutor_profiles SET certification_status = $1 WHERE user_id = $2",
      [status, userRes.rows[0].id],
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
});

// 🚀 第十支 API：小老師補件上傳 (POST)
app.post(
  "/api/tutor/reupload-cert",
  upload.single("certificationFile"),
  async (req, res) => {
    const { account } = req.body;
    const filename = req.file ? req.file.filename : null;
    if (!filename)
      return res.status(400).json({ success: false, message: "沒有收到檔案" });

    try {
      const userRes = await pool.query(
        "SELECT id FROM users WHERE account = $1",
        [account],
      );
      await pool.query(
        "UPDATE tutor_profiles SET certification_file = $1, certification_status = 'pending' WHERE user_id = $2",
        [filename, userRes.rows[0].id],
      );
      res.json({ success: true, filename });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  },
);

// 🚀 第十一支 API：尋找外籍生 (GET)
app.get("/api/match/tutees", async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id as tutee_user_id, u.student_id, u.chinese_name, u.english_name,
        u.participant_type,
        p.nationality, p.learning_duration, p.overall_level, 
        p.target_skills, p.available_times, p.skills_to_improve,
        p.gender, p.native_language,
        m.status as match_status, m.tutor_id as matched_tutor_id
      FROM users u
      JOIN tutee_profiles p ON u.id = p.user_id
      LEFT JOIN match_requests m ON u.id = m.tutee_id AND m.status IN ('pending', 'accepted')
      WHERE u.role = 'tutee'
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("獲取外籍生列表失敗:", error);
    res.status(500).json({ success: false });
  }
});

// 🚀 第十二支 API：發送邀請 (POST)
app.post("/api/match/request", async (req, res) => {
  const { tutorAccount, tuteeUserId } = req.body;
  try {
    const tutorRes = await pool.query(
      "SELECT id FROM users WHERE account = $1",
      [tutorAccount],
    );
    if (tutorRes.rows.length === 0)
      return res.status(400).json({ success: false, message: "找不到小老師" });
    const tutorId = tutorRes.rows[0].id;

    const checkRes = await pool.query(
      "SELECT id FROM match_requests WHERE tutee_id = $1 AND status IN ('pending', 'accepted')",
      [tuteeUserId],
    );
    if (checkRes.rows.length > 0)
      return res.status(400).json({
        success: false,
        message: "手腳太慢啦！這位學生剛被其他人邀請或配對了。",
      });

    await pool.query(
      "INSERT INTO match_requests (tutor_id, tutee_id, status) VALUES ($1, $2, 'pending')",
      [tutorId, tuteeUserId],
    );
    res.json({
      success: true,
      message: "✅ 邀請已成功發送！請靜候外籍生回覆。",
    });
  } catch (error) {
    console.error("發送邀請失敗:", error);
    res.status(500).json({ success: false });
  }
});

// 🚀 第十三支 API：外籍生查看收到的邀請 (GET)
app.get("/api/match/requests/:account", async (req, res) => {
  try {
    const tuteeRes = await pool.query(
      "SELECT id FROM users WHERE account = $1",
      [req.params.account],
    );
    if (tuteeRes.rows.length === 0)
      return res.status(404).json({ success: false });
    const tuteeId = tuteeRes.rows[0].id;

    const result = await pool.query(
      `
      SELECT 
        m.id as request_id,
        u.id as tutor_user_id, u.chinese_name, u.english_name, u.student_id,
        t.department, t.student_status, t.teaching_notes, t.available_times
      FROM match_requests m
      JOIN users u ON m.tutor_id = u.id
      JOIN tutor_profiles t ON u.id = t.user_id
      WHERE m.tutee_id = $1 AND m.status = 'pending'
    `,
      [tuteeId],
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 第十四支 API：外籍生回應邀請 (POST)
app.post("/api/match/respond", async (req, res) => {
  const { requestId, tuteeAccount, tutorUserId, action } = req.body;
  try {
    const tuteeRes = await pool.query(
      "SELECT id FROM users WHERE account = $1",
      [tuteeAccount],
    );
    const tuteeId = tuteeRes.rows[0].id;

    if (action === "reject") {
      await pool.query(
        "UPDATE match_requests SET status = 'rejected' WHERE id = $1",
        [requestId],
      );
      return res.json({ success: true, message: "已婉拒該邀請" });
    }

    if (action === "accept") {
      await pool.query(
        "UPDATE match_requests SET status = 'accepted' WHERE id = $1",
        [requestId],
      );
      await pool.query(
        "UPDATE match_requests SET status = 'rejected' WHERE tutee_id = $1 AND status = 'pending'",
        [tuteeId],
      );
      await pool.query(
        "UPDATE tutee_profiles SET matched_tutor_id = $1 WHERE user_id = $2",
        [tutorUserId, tuteeId],
      );
      await pool.query(
        "UPDATE tutor_profiles SET matched_tutee_id = $1 WHERE user_id = $2",
        [tuteeId, tutorUserId],
      );

      await pool.query(
        `INSERT INTO match_history (tutor_id, tutee_id, is_active)
     VALUES ($1, $2, TRUE)
     ON CONFLICT DO NOTHING`,
        [tutorUserId, tuteeId],
      );

      // ← 新增：同時把這個 tutor 對其他 tutee 的 pending 邀請也全部拒絕
      await pool.query(
        `UPDATE match_requests SET status = 'rejected'
     WHERE tutor_id = $1 AND status = 'pending' AND tutee_id != $2`,
        [tutorUserId, tuteeId],
      );

      // ← 新增：寫入配對歷史
      await pool.query(
        `INSERT INTO match_history (tutor_id, tutee_id, is_active)
     VALUES ($1, $2, TRUE) ON CONFLICT DO NOTHING`,
        [tutorUserId, tuteeId],
      );
      return res.json({ success: true, message: "🎉 配對成功！" });
    }
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 第十五支 API：獲取已配對的小老師資訊 (GET)
app.get("/api/match/tutor-info/:tutorId", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT user_id, u.chinese_name, u.english_name, u.email, 
             t.student_status, t.department, t.teaching_notes, t.available_times, t.gender, t.native_language
      FROM users u
      JOIN tutor_profiles t ON u.id = t.user_id
      WHERE u.id = $1
    `,
      [req.params.tutorId],
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 第十六支 API：獲取已配對的外籍生資訊 (GET)
app.get("/api/match/tutee-info/:tuteeId", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT user_id, u.chinese_name, u.english_name, u.email, u.student_id,
             p.nationality, p.department, p.learning_duration, p.overall_level,
             p.target_skills, p.skills_to_improve, p.available_times, p.gender, p.native_language
      FROM users u
      JOIN tutee_profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `,
      [req.params.tuteeId],
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 第十七支 API：小老師安排課程 (POST)
app.post("/api/classes/schedule", async (req, res) => {
  const { tutorAccount, tuteeUserId, slots, isRecurring, endDate } = req.body;
  try {
    const tutorRes = await pool.query(
      "SELECT id FROM users WHERE account = $1",
      [tutorAccount],
    );
    const tutorId = tutorRes.rows[0].id;

    let classInstances = [];

    for (const slot of slots) {
      // ✅ 修正：用本地時間解析日期，避免時區問題
      const [y, m, d] = slot.date.split("-").map(Number);
      classInstances.push({
        date: slot.date,
        start: slot.startTime,
        end: slot.endTime,
      });

      if (isRecurring && endDate) {
        const [ey, em, ed] = endDate.split("-").map(Number);
        const end = new Date(ey, em - 1, ed);
        let nextDate = new Date(y, m - 1, d);
        nextDate.setDate(nextDate.getDate() + 7);

        while (nextDate <= end) {
          const yyyy = nextDate.getFullYear();
          const mm = String(nextDate.getMonth() + 1).padStart(2, "0");
          const dd = String(nextDate.getDate()).padStart(2, "0");
          classInstances.push({
            date: `${yyyy}-${mm}-${dd}`,
            start: slot.startTime,
            end: slot.endTime,
          });
          nextDate.setDate(nextDate.getDate() + 7);
        }
      }
    }

    for (const cls of classInstances) {
      await pool.query(
        `INSERT INTO classes (tutor_id, tutee_id, class_date, start_time, end_time) VALUES ($1, $2, $3, $4, $5)`,
        [tutorId, tuteeUserId, cls.date, cls.start, cls.end],
      );
    }

    res.json({
      success: true,
      message: `✅ 成功排定 ${classInstances.length} 堂課程！`,
    });
  } catch (error) {
    console.error("排課失敗:", error);
    res.status(500).json({ success: false, message: "排課失敗" });
  }
});

// 🚀 第十八支 API：獲取某人的所有課程 (GET) ✅ 修正時區 + 加入 has_note
app.get("/api/classes/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const result = await pool.query(
      `
      SELECT 
        c.id,
        c.class_date::text,
        c.start_time,
        c.end_time,
        c.status,
        c.tutor_signed_at,
        c.tutee_signed_at,
        CASE WHEN cn.id IS NOT NULL THEN true ELSE false END AS has_note
      FROM classes c
      LEFT JOIN class_notes cn ON cn.class_id = c.id AND cn.user_id = $1
      WHERE (c.tutor_id = $1 OR c.tutee_id = $1)
        AND c.status != 'cancelled'
        AND c.tutee_id IS NOT NULL
      ORDER BY c.class_date ASC, c.start_time ASC
    `,
      [userId],
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("獲取課表失敗:", error);
    res.status(500).json({ success: false });
  }
});

// 🚀 第十九支 API：編輯單筆課程時間 (PUT)
app.put("/api/classes/:id", async (req, res) => {
  const { classDate, startTime, endTime } = req.body;
  try {
    await pool.query(
      "UPDATE classes SET class_date = $1, start_time = $2, end_time = $3 WHERE id = $4",
      [classDate, startTime, endTime, req.params.id],
    );
    res.json({ success: true, message: "✅ 課程時間已成功更新！" });
  } catch (error) {
    console.error("更新課程失敗:", error);
    res.status(500).json({ success: false, message: "更新失敗" });
  }
});

// 🚀 忘記密碼 API (POST)
app.post("/api/reset-password", async (req, res) => {
  const { account, studentId, newPassword } = req.body;
  if (!account || !studentId || !newPassword)
    return res.status(400).json({ success: false, message: "請填寫所有欄位" });

  try {
    const result = await pool.query(
      "SELECT id FROM users WHERE account = $1 AND student_id = $2",
      [account, studentId],
    );
    if (result.rows.length === 0)
      return res
        .status(401)
        .json({ success: false, message: "帳號或學號不正確，請重新確認" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      result.rows[0].id,
    ]);
    res.json({ success: true, message: "密碼已成功重設！請用新密碼登入。" });
  } catch (error) {
    console.error("重設密碼失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 外籍生課表 API (GET) ✅ 修正時區
app.get("/api/tutee-classes/:account", async (req, res) => {
  try {
    const userRes = await pool.query(
      "SELECT id FROM users WHERE account = $1",
      [req.params.account],
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ success: false, message: "找不到使用者" });

    const tuteeId = userRes.rows[0].id;
    const result = await pool.query(
      `
      SELECT 
        c.id,
        c.class_date::text,
        c.start_time,
        c.end_time,
        c.status,
        c.tutor_signed_at,
        c.tutee_signed_at,
        u.chinese_name AS tutor_chinese_name,
        u.english_name AS tutor_english_name,
        CASE WHEN cn.id IS NOT NULL THEN true ELSE false END AS has_note
      FROM classes c
      JOIN users u ON c.tutor_id = u.id
      LEFT JOIN class_notes cn ON cn.class_id = c.id AND cn.user_id = $1
      WHERE c.tutee_id = $1 AND c.status != 'cancelled'
      ORDER BY c.class_date ASC, c.start_time ASC
    `,
      [tuteeId],
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("獲取外籍生課表失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 簽到 API (POST) ✅ 修正時區
app.post("/api/classes/:id/checkin", async (req, res) => {
  const { role } = req.body;
  const classId = req.params.id;

  try {
    const classRes = await pool.query(
      "SELECT class_date::text, start_time, end_time FROM classes WHERE id = $1",
      [classId],
    );
    if (classRes.rows.length === 0)
      return res.status(404).json({ success: false, message: "找不到課程" });

    const cls = classRes.rows[0];
    const dateStr = cls.class_date; // ✅ 已經是純字串

    const now = new Date();
    const deadline = new Date(`${dateStr}T23:59:59`);
    if (now > deadline)
      return res
        .status(400)
        .json({ success: false, message: "已超過簽到時間，請使用補簽到功能" });

    const classStart = new Date(`${dateStr}T${cls.start_time}`);
    const windowStart = new Date(classStart.getTime() - 30 * 60 * 1000);
    if (now < windowStart)
      return res.status(400).json({
        success: false,
        message: "還沒到簽到時間！(上課前30分鐘才能簽到)",
      });

    const field = role === "tutor" ? "tutor_signed_at" : "tutee_signed_at";
    const checkRes = await pool.query(
      `SELECT ${field} FROM classes WHERE id = $1`,
      [classId],
    );
    if (checkRes.rows[0][field])
      return res
        .status(400)
        .json({ success: false, message: "您已經簽到過了！" });

    await pool.query(`UPDATE classes SET ${field} = NOW() WHERE id = $1`, [
      classId,
    ]);
    res.json({ success: true, message: "✅ 簽到成功！" });
  } catch (error) {
    console.error("簽到失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 補簽到申請 (POST) ✅ 修正時區
app.post(
  "/api/classes/:id/makeup-checkin",
  upload.single("attachment"),
  async (req, res) => {
    const { userId, role, reason } = req.body;
    const classId = req.params.id;
    const filename = req.file ? req.file.filename : null;

    try {
      const classRes = await pool.query(
        "SELECT class_date::text FROM classes WHERE id = $1",
        [classId],
      );
      const dateStr = classRes.rows[0].class_date; // ✅ 純字串
      const deadline = new Date(`${dateStr}T23:59:59`);
      if (new Date() <= deadline)
        return res
          .status(400)
          .json({ success: false, message: "還在簽到時間內，請使用一般簽到" });

      const field = role === "tutor" ? "tutor_signed_at" : "tutee_signed_at";
      const checkRes = await pool.query(
        `SELECT ${field} FROM classes WHERE id = $1`,
        [classId],
      );
      if (checkRes.rows[0][field])
        return res
          .status(400)
          .json({ success: false, message: "您已經簽到過了，不需要補簽" });

      const dupCheck = await pool.query(
        "SELECT id FROM makeup_checkins WHERE class_id = $1 AND user_id = $2 AND status = 'pending'",
        [classId, userId],
      );
      if (dupCheck.rows.length > 0)
        return res
          .status(400)
          .json({ success: false, message: "您已有一筆待審核的補簽申請" });

      const countRes = await pool.query(
        "SELECT COUNT(*) FROM makeup_checkins WHERE user_id = $1 AND status != 'rejected'",
        [userId],
      );
      if (parseInt(countRes.rows[0].count) >= 5)
        return res
          .status(400)
          .json({ success: false, message: "您已用完所有補簽次數（上限5次）" });

      await pool.query(
        "INSERT INTO makeup_checkins (class_id, user_id, role, reason, attachment_file) VALUES ($1, $2, $3, $4, $5)",
        [classId, userId, role, reason, filename],
      );

      res.json({
        success: true,
        message: "✅ 補簽申請已送出，請等待管理員審核",
      });
    } catch (error) {
      console.error("補簽申請失敗:", error);
      res.status(500).json({ success: false, message: "伺服器發生錯誤" });
    }
  },
);

// 🚀 管理員：查看所有補簽申請 (GET)
app.get("/api/admin/makeup-checkins", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.class_id, m.role, m.reason, m.attachment_file, m.status, m.created_at,
             u.chinese_name, u.english_name, u.account,
             c.class_date::text, c.start_time, c.end_time
      FROM makeup_checkins m
      JOIN users u ON m.user_id = u.id
      JOIN classes c ON m.class_id = c.id
      ORDER BY m.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：審核補簽申請 (POST)
app.post("/api/admin/makeup-checkins/:id/review", async (req, res) => {
  const { action } = req.body;
  try {
    const makeupRes = await pool.query(
      "SELECT * FROM makeup_checkins WHERE id = $1",
      [req.params.id],
    );
    const makeup = makeupRes.rows[0];

    await pool.query(
      "UPDATE makeup_checkins SET status = $1, reviewed_at = NOW() WHERE id = $2",
      [action, req.params.id],
    );

    if (action === "approved") {
      const field =
        makeup.role === "tutor" ? "tutor_signed_at" : "tutee_signed_at";
      await pool.query(`UPDATE classes SET ${field} = NOW() WHERE id = $1`, [
        makeup.class_id,
      ]);
    }

    res.json({
      success: true,
      message: action === "approved" ? "✅ 已核准補簽" : "❌ 已駁回申請",
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 剩餘補簽次數 (GET)
app.get("/api/makeup-remaining/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM makeup_checkins WHERE user_id = $1 AND status != 'rejected'",
      [req.params.userId],
    );
    res.json({ success: true, remaining: 5 - parseInt(result.rows[0].count) });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：查看所有課程簽到狀態 (GET)
app.get("/api/admin/checkins", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.class_date::text, c.start_time, c.end_time,
             c.tutor_signed_at, c.tutee_signed_at,
             tu.chinese_name as tutor_name, tu.english_name as tutor_english,
             te.chinese_name as tutee_name, te.english_name as tutee_english
      FROM classes c
      JOIN users tu ON c.tutor_id = tu.id
      JOIN users te ON c.tutee_id = te.id
      ORDER BY c.class_date DESC, c.start_time DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("撈取簽到資料失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 新增/更新課堂紀錄 (POST) ✅ 修正時區
app.post(
  "/api/classes/:id/notes",
  upload.single("attachment"),
  async (req, res) => {
    const { userId, role, location, content, remarks } = req.body;
    const classId = req.params.id;
    const filename = req.file ? req.file.filename : null;

    try {
      const classRes = await pool.query(
        "SELECT class_date::text, start_time FROM classes WHERE id = $1",
        [classId],
      );
      const dateStr = classRes.rows[0].class_date;
      const startTime = classRes.rows[0].start_time;

      const now = new Date();
      const classStart = new Date(`${dateStr}T${startTime}`);
      const deadline = new Date(`${dateStr}T23:59:59`);

      // 2. 還沒到上課時間 → 不能填
      if (now < classStart)
        return res.status(400).json({
          success: false,
          message: "上課開始後才能填寫課堂紀錄！",
        });

      // 3. 超過當天截止 → 走補填流程
      if (now > deadline)
        return res.status(400).json({
          success: false,
          message: "已超過填寫時間，請使用補填申請功能",
        });

      const query = filename
        ? `INSERT INTO class_notes (class_id, user_id, role, location, content, remarks, attachment_file, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (class_id, user_id)
         DO UPDATE SET location=$4, content=$5, remarks=$6, attachment_file=$7, updated_at=NOW()`
        : `INSERT INTO class_notes (class_id, user_id, role, location, content, remarks, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (class_id, user_id)
         DO UPDATE SET location=$4, content=$5, remarks=$6, updated_at=NOW()`;

      const params = filename
        ? [classId, userId, role, location, content, remarks, filename]
        : [classId, userId, role, location, content, remarks];

      await pool.query(query, params);
      res.json({ success: true, message: "課堂紀錄已儲存！" });
    } catch (error) {
      console.error("儲存課堂紀錄失敗:", error);
      res.status(500).json({ success: false, message: "伺服器發生錯誤" });
    }
  },
);

// 🚀 補填課堂紀錄申請 (POST) ✅ 修正時區
app.post(
  "/api/classes/:id/makeup-notes",
  upload.single("attachment"),
  async (req, res) => {
    const { userId, role, location, content, remarks } = req.body;
    const classId = req.params.id;
    const filename = req.file ? req.file.filename : null;

    try {
      const classRes = await pool.query(
        "SELECT class_date::text FROM classes WHERE id = $1",
        [classId],
      );
      const dateStr = classRes.rows[0].class_date; // ✅ 純字串
      const deadline = new Date(`${dateStr}T23:59:59`);

      if (new Date() <= deadline)
        return res
          .status(400)
          .json({ success: false, message: "還在填寫時間內，請直接儲存紀錄" });

      const dupCheck = await pool.query(
        "SELECT id FROM makeup_notes WHERE class_id = $1 AND user_id = $2",
        [classId, userId],
      );
      if (dupCheck.rows.length > 0)
        return res.status(400).json({
          success: false,
          message: "您已有一筆補填申請（待審核或已通過）",
        });

      const countRes = await pool.query(
        "SELECT COUNT(*) FROM makeup_notes WHERE user_id = $1 AND status != 'rejected'",
        [userId],
      );
      if (parseInt(countRes.rows[0].count) >= 5)
        return res
          .status(400)
          .json({ success: false, message: "您已用完所有補填次數（上限5次）" });

      await pool.query(
        "INSERT INTO makeup_notes (class_id, user_id, role, location, content, remarks, attachment_file) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          classId,
          userId,
          role,
          location || "",
          content,
          remarks || "",
          filename,
        ],
      );

      res.json({
        success: true,
        message: "✅ 補填申請已送出，請等待管理員審核",
      });
    } catch (error) {
      console.error("補填申請失敗:", error);
      res.status(500).json({ success: false, message: "伺服器發生錯誤" });
    }
  },
);

// 🚀 剩餘補填次數 (GET)
app.get("/api/notes-remaining/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM makeup_notes WHERE user_id = $1 AND status != 'rejected'",
      [req.params.userId],
    );
    res.json({ success: true, remaining: 5 - parseInt(result.rows[0].count) });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：查看補填申請 (GET)
app.get("/api/admin/makeup-notes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.class_id, m.role, m.location, m.content, m.remarks,
             m.attachment_file, m.status, m.created_at,
             u.chinese_name, u.english_name, u.account,
             c.class_date::text, c.start_time, c.end_time
      FROM makeup_notes m
      JOIN users u ON m.user_id = u.id
      JOIN classes c ON m.class_id = c.id
      ORDER BY m.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：審核補填申請 (POST)
app.post("/api/admin/makeup-notes/:id/review", async (req, res) => {
  const { action } = req.body;
  try {
    const makeupRes = await pool.query(
      "SELECT * FROM makeup_notes WHERE id = $1",
      [req.params.id],
    );
    const makeup = makeupRes.rows[0];

    await pool.query(
      "UPDATE makeup_notes SET status = $1, reviewed_at = NOW() WHERE id = $2",
      [action, req.params.id],
    );

    if (action === "approved") {
      await pool.query(
        `INSERT INTO class_notes (class_id, user_id, role, location, content, remarks, attachment_file, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (class_id, user_id)
         DO UPDATE SET location=$4, content=$5, remarks=$6, attachment_file=$7, updated_at=NOW()`,
        [
          makeup.class_id,
          makeup.user_id,
          makeup.role,
          makeup.location,
          makeup.content,
          makeup.remarks,
          makeup.attachment_file,
        ],
      );
    }

    res.json({
      success: true,
      message: action === "approved" ? "✅ 已核准補填" : "❌ 已駁回申請",
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 查詢課堂紀錄 (GET)
app.get("/api/classes/:id/notes/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM class_notes WHERE class_id = $1 AND user_id = $2",
      [req.params.id, req.params.userId],
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 送出異常回報 (POST)
app.post(
  "/api/classes/:id/report",
  upload.single("attachment"),
  async (req, res) => {
    const { userId, role, reportType, location, content } = req.body;
    const classId = req.params.id;
    const filename = req.file ? req.file.filename : null;

    if (!content?.trim())
      return res
        .status(400)
        .json({ success: false, message: "請填寫回報內容" });

    try {
      await pool.query(
        `INSERT INTO incident_reports (class_id, user_id, role, report_type, location, content, attachment_file)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [classId, userId, role, reportType, location || "", content, filename],
      );
      res.json({ success: true, message: "✅ 異常回報已送出，助教將盡快處理" });
    } catch (error) {
      console.error("異常回報失敗:", error);
      res.status(500).json({ success: false, message: "伺服器發生錯誤" });
    }
  },
);

// 🚀 管理員：查看所有異常回報 (GET)
app.get("/api/admin/reports", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.class_id, r.role, r.report_type, r.location,
             r.content, r.attachment_file, r.status, r.created_at,
             u.chinese_name, u.english_name, u.account,
             c.class_date::text, c.start_time, c.end_time
      FROM incident_reports r
      JOIN users u ON r.user_id = u.id
      JOIN classes c ON r.class_id = c.id
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：更新回報狀態 (POST)
app.post("/api/admin/reports/:id/status", async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query("UPDATE incident_reports SET status = $1 WHERE id = $2", [
      status,
      req.params.id,
    ]);
    res.json({ success: true, message: "狀態已更新" });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 送出緊急通報 (POST) ✅ 修正時區
app.post("/api/classes/:id/emergency", async (req, res) => {
  const { userId, role } = req.body;
  const classId = req.params.id;

  try {
    const classRes = await pool.query(
      "SELECT class_date::text, start_time, end_time FROM classes WHERE id = $1",
      [classId],
    );
    if (classRes.rows.length === 0)
      return res.status(404).json({ success: false, message: "找不到課程" });

    const cls = classRes.rows[0];
    const dateStr = cls.class_date; // ✅ 純字串

    const now = new Date();
    const classStart = new Date(`${dateStr}T${cls.start_time}`);
    const classEnd = new Date(`${dateStr}T${cls.end_time}`);

    if (now < classStart || now > classEnd)
      return res
        .status(400)
        .json({ success: false, message: "只能在上課時間內使用緊急通報！" });

    const dupCheck = await pool.query(
      "SELECT id FROM emergency_alerts WHERE class_id = $1 AND sender_id = $2",
      [classId, userId],
    );
    if (dupCheck.rows.length > 0)
      return res.status(400).json({
        success: false,
        message: "您已送出過緊急通報，請等待助教處理",
      });

    await pool.query(
      "INSERT INTO emergency_alerts (class_id, sender_id, sender_role) VALUES ($1, $2, $3)",
      [classId, userId, role],
    );

    res.json({ success: true, message: "🚨 緊急通報已送出！助教將立即處理。" });
  } catch (error) {
    console.error("緊急通報失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 管理員：查看緊急通報 (GET) ✅ 修正時區
app.get("/api/admin/emergency-alerts", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.id, e.class_id, e.sender_role, e.is_read, e.created_at,
        sender.chinese_name, sender.english_name, sender.account,
        c.class_date::text, c.start_time, c.end_time,
        CASE WHEN e.sender_role = 'tutor' THEN tutee_u.chinese_name ELSE tutor_u.chinese_name END AS target_chinese_name,
        CASE WHEN e.sender_role = 'tutor' THEN tutee_u.english_name ELSE tutor_u.english_name END AS target_english_name,
        CASE WHEN e.sender_role = 'tutor' THEN 'tutee' ELSE 'tutor' END AS target_role
      FROM emergency_alerts e
      JOIN users sender ON e.sender_id = sender.id
      JOIN classes c ON e.class_id = c.id
      JOIN users tutor_u ON c.tutor_id = tutor_u.id
      JOIN users tutee_u ON c.tutee_id = tutee_u.id
      ORDER BY e.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：標記緊急通報已讀 (POST)
app.post("/api/admin/emergency-alerts/:id/read", async (req, res) => {
  try {
    await pool.query(
      "UPDATE emergency_alerts SET is_read = TRUE WHERE id = $1",
      [req.params.id],
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 輔導時數查詢 API (GET)
// 邏輯：tutor_signed_at + has_note(class_notes) → 視為「待審/通過」
// 管理員在 hours_review 表中審查，status: 'pending' | 'approved' | 'rejected'
// ============================================================
// 取代 index.js 裡的 GET /api/tutor/hours/:userId
// 新邏輯：有簽到 + 有紀錄 → 直接計入，不需手動送審
// ============================================================

app.get("/api/tutor/hours/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT
        c.id            AS class_id,
        c.class_date::text,
        c.start_time,
        c.end_time,
        c.tutor_signed_at,
        c.tutee_id,
        u.chinese_name  AS tutee_chinese_name,
        u.english_name  AS tutee_english_name,
        cn.id           AS note_id,
        EXTRACT(EPOCH FROM (
          TO_TIMESTAMP(c.end_time::text,   'HH24:MI:SS') -
          TO_TIMESTAMP(c.start_time::text, 'HH24:MI:SS')
        )) / 3600.0     AS hours
      FROM classes c
      LEFT JOIN users u ON c.tutee_id = u.id
      LEFT JOIN class_notes cn
        ON cn.class_id = c.id AND cn.user_id = $1
      WHERE c.tutor_id = $1
        AND c.status != 'cancelled'
      ORDER BY c.class_date ASC, c.start_time ASC
      `,
      [userId],
    );

    const approvedHours = result.rows
      .filter((r) => r.tutor_signed_at && r.note_id)
      .reduce((sum, r) => sum + parseFloat(r.hours || 0), 0);

    res.json({ success: true, data: result.rows, approvedHours });
  } catch (error) {
    console.error("查詢輔導時數失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 提交待審時數（老師主動送審，後端自動檢查簽到+紀錄）(POST)
app.post("/api/tutor/hours/submit/:classId", async (req, res) => {
  const { classId } = req.params;
  const { userId } = req.body;
  try {
    // 確認簽到 + 紀錄都有
    const classRes = await pool.query(
      `SELECT c.tutor_signed_at,
              (SELECT id FROM class_notes WHERE class_id = c.id AND user_id = $2) AS note_id
       FROM classes c WHERE c.id = $1 AND c.tutor_id = $2`,
      [classId, userId],
    );
    if (classRes.rows.length === 0)
      return res.status(404).json({ success: false, message: "找不到課程" });

    const cls = classRes.rows[0];
    if (!cls.tutor_signed_at)
      return res
        .status(400)
        .json({ success: false, message: "尚未完成簽到，無法送審" });
    if (!cls.note_id)
      return res
        .status(400)
        .json({ success: false, message: "尚未填寫課堂紀錄，無法送審" });

    // 避免重複送審
    const dupCheck = await pool.query(
      "SELECT id FROM hours_review WHERE class_id = $1 AND tutor_id = $2",
      [classId, userId],
    );
    if (dupCheck.rows.length > 0)
      return res
        .status(400)
        .json({ success: false, message: "此堂課已送審，請等待管理員審查" });

    await pool.query(
      "INSERT INTO hours_review (class_id, tutor_id, status) VALUES ($1, $2, 'pending')",
      [classId, userId],
    );
    res.json({ success: true, message: "✅ 已送出審查，請等待管理員確認" });
  } catch (error) {
    console.error("送審失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 申請實習時數證明 (POST)
app.post("/api/tutor/apply-certificate", async (req, res) => {
  const { userId } = req.body;
  try {
    // 確認累積時數 >= 100
    const hoursRes = await pool.query(
      `
      SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (
          TO_TIMESTAMP(c.end_time::text, 'HH24:MI:SS') -
          TO_TIMESTAMP(c.start_time::text, 'HH24:MI:SS')
        )) / 3600.0
      ), 0) AS total_hours
      FROM hours_review hr
      JOIN classes c ON hr.class_id = c.id
      WHERE hr.tutor_id = $1 AND hr.status = 'approved'
      `,
      [userId],
    );
    const totalHours = parseFloat(hoursRes.rows[0].total_hours);
    if (totalHours < 100)
      return res.status(400).json({
        success: false,
        message: `時數不足！目前僅累積 ${totalHours.toFixed(1)} 小時，需達 100 小時才可申請。`,
      });

    // 避免重複申請
    const dupCheck = await pool.query(
      "SELECT id FROM certificate_applications WHERE tutor_id = $1 AND status != 'rejected'",
      [userId],
    );
    if (dupCheck.rows.length > 0)
      return res.status(400).json({
        success: false,
        message: "您已有一筆申請中或已核發的證書申請",
      });

    await pool.query(
      "INSERT INTO certificate_applications (tutor_id, status) VALUES ($1, 'pending')",
      [userId],
    );
    res.json({
      success: true,
      message: "🎉 申請已送出！管理員審核後將通知您領取證書。",
    });
  } catch (error) {
    console.error("申請證書失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 查詢證書申請狀態 (GET)
app.get("/api/tutor/certificate-status/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT status, created_at FROM certificate_applications WHERE tutor_id = $1 ORDER BY created_at DESC LIMIT 1",
      [req.params.userId],
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：查詢所有時數審查 (GET)
app.get("/api/admin/hours-review", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        hr.id, hr.class_id, hr.tutor_id, hr.status, hr.reviewed_at, hr.created_at,
        u.chinese_name, u.english_name, u.student_id,
        c.class_date::text, c.start_time, c.end_time,
        EXTRACT(EPOCH FROM (
          TO_TIMESTAMP(c.end_time::text, 'HH24:MI:SS') -
          TO_TIMESTAMP(c.start_time::text, 'HH24:MI:SS')
        )) / 3600.0 AS hours
      FROM hours_review hr
      JOIN users u ON hr.tutor_id = u.id
      JOIN classes c ON hr.class_id = c.id
      ORDER BY hr.created_at DESC
      `,
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：審查時數 (POST)
app.post("/api/admin/hours-review/:id/review", async (req, res) => {
  const { action } = req.body; // 'approved' | 'rejected'
  try {
    await pool.query(
      "UPDATE hours_review SET status = $1, reviewed_at = NOW() WHERE id = $2",
      [action, req.params.id],
    );
    res.json({
      success: true,
      message: action === "approved" ? "✅ 已核准此堂時數" : "❌ 已駁回",
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：查詢所有證書申請 (GET)
app.get("/api/admin/certificate-applications", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT ca.id, ca.tutor_id, ca.status, ca.created_at,
             u.chinese_name, u.english_name, u.student_id,
             COALESCE((
               SELECT SUM(EXTRACT(EPOCH FROM (
                 TO_TIMESTAMP(c.end_time::text, 'HH24:MI:SS') -
                 TO_TIMESTAMP(c.start_time::text, 'HH24:MI:SS')
               )) / 3600.0)
               FROM hours_review hr
               JOIN classes c ON hr.class_id = c.id
               WHERE hr.tutor_id = ca.tutor_id AND hr.status = 'approved'
             ), 0) AS approved_hours
      FROM certificate_applications ca
      JOIN users u ON ca.tutor_id = u.id
      ORDER BY ca.created_at DESC
      `,
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：更新證書申請狀態 (POST)
app.post("/api/admin/certificate-applications/:id/review", async (req, res) => {
  const { action } = req.body; // 'issued' | 'rejected'
  try {
    await pool.query(
      "UPDATE certificate_applications SET status = $1, reviewed_at = NOW() WHERE id = $2",
      [action, req.params.id],
    );
    res.json({
      success: true,
      message: action === "issued" ? "✅ 已核發證書" : "❌ 已駁回申請",
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// ============================================================
// 貼到 index.js 最底部
// ============================================================

// 🚀 管理員：查詢所有一般簽到紀錄（老師+學生）(GET)
app.get("/api/admin/checkin-records", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id AS class_id,
        c.class_date::text,
        c.start_time,
        c.end_time,
        c.tutor_signed_at,
        c.tutee_signed_at,
        tu.chinese_name  AS tutor_chinese_name,
        tu.english_name  AS tutor_english_name,
        te.chinese_name  AS tutee_chinese_name,
        te.english_name  AS tutee_english_name
      FROM classes c
      JOIN users tu ON c.tutor_id = tu.id
      JOIN users te ON c.tutee_id = te.id
      WHERE c.status != 'cancelled'
        AND (c.tutor_signed_at IS NOT NULL OR c.tutee_signed_at IS NOT NULL)
      ORDER BY c.class_date DESC, c.start_time DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("查詢簽到紀錄失敗:", error);
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：查詢所有課堂紀錄（一般填寫）(GET)
app.get("/api/admin/class-notes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        cn.id,
        cn.class_id,
        cn.role,
        cn.location,
        cn.content,
        cn.remarks,
        cn.attachment_file,
        cn.updated_at,
        u.chinese_name,
        u.english_name,
        u.student_id,
        c.class_date::text,
        c.start_time,
        c.end_time
      FROM class_notes cn
      JOIN users u ON cn.user_id = u.id
      JOIN classes c ON cn.class_id = c.id
      ORDER BY cn.updated_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("查詢課堂紀錄失敗:", error);
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：取得未讀通知數（補簽到 + 補填紀錄 pending 數量）(GET)
app.get("/api/admin/pending-counts", async (req, res) => {
  try {
    const makeupCheckin = await pool.query(
      "SELECT COUNT(*) FROM makeup_checkins WHERE status = 'pending'",
    );
    const makeupNotes = await pool.query(
      "SELECT COUNT(*) FROM makeup_notes WHERE status = 'pending'",
    );
    res.json({
      success: true,
      makeupCheckinCount: parseInt(makeupCheckin.rows[0].count),
      makeupNotesCount: parseInt(makeupNotes.rows[0].count),
      total:
        parseInt(makeupCheckin.rows[0].count) +
        parseInt(makeupNotes.rows[0].count),
    });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.put("/api/profile/:account", async (req, res) => {
  const { account } = req.params;
  const {
    chineseName,
    englishName,
    department,
    phone,
    email,
    nationality,
    gender,
    nativeLanguage,
  } = req.body;

  try {
    const userRes = await pool.query(
      "SELECT id, role FROM users WHERE account = $1",
      [account],
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ success: false, message: "找不到使用者" });

    const userId = userRes.rows[0].id;
    const role = userRes.rows[0].role;

    // 更新 users 表的姓名和 email
    await pool.query(
      "UPDATE users SET chinese_name = $1, english_name = $2, email = $3 WHERE id = $4",
      [chineseName, englishName, email, userId],
    );

    // 依角色更新對應 profile 表
    if (role === "tutor") {
      await pool.query(
        `UPDATE tutor_profiles 
         SET department = $1, phone = $2, nationality = $3, gender = $4, native_language = $5
         WHERE user_id = $6`,
        [department, phone, nationality, gender, nativeLanguage, userId],
      );
    } else if (role === "tutee") {
      await pool.query(
        `UPDATE tutee_profiles 
         SET department = $1, phone = $2, nationality = $3, gender = $4, native_language = $5
         WHERE user_id = $6`,
        [department, phone, nationality, gender, nativeLanguage, userId],
      );
    }

    res.json({ success: true, message: "個人資料已更新！" });
  } catch (error) {
    console.error("更新個人資料失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

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
        nativeLanguage: editForm.nativeLanguage,
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

// 🚀 更新使用者個人資料 (POST)
app.post("/api/profile/update", async (req, res) => {
  const {
    account,
    chineseName,
    englishName,
    department,
    phone,
    email,
    nationality,
    gender,
    nativeLanguage,
    // tutor 專用
    levelListening,
    levelSpeaking,
    levelReading,
    levelWriting,
    teachingNotes,
    availableTimes,
    // tutee 專用
    overallLevel,
    learningDuration,
    targetSkills,
    skillsToImprove,
  } = req.body;

  try {
    const userRes = await pool.query(
      "SELECT id, role FROM users WHERE account = $1",
      [account],
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ success: false, message: "找不到使用者" });

    const { id: userId, role } = userRes.rows[0];

    // 更新 users 基本資料
    await pool.query(
      `UPDATE users SET chinese_name=$1, english_name=$2, email=$3 WHERE id=$4`,
      [chineseName, englishName, email, userId],
    );

    if (role === "tutor") {
      await pool.query(
        `UPDATE tutor_profiles SET
          department=$1, phone=$2, nationality=$3, gender=$4, native_language=$5,
          level_listening=$6, level_speaking=$7, level_reading=$8, level_writing=$9,
          teaching_notes=$10, available_times=$11
         WHERE user_id=$12`,
        [
          department,
          phone,
          nationality,
          gender,
          nativeLanguage,
          levelListening,
          levelSpeaking,
          levelReading,
          levelWriting,
          teachingNotes,
          JSON.stringify(availableTimes),
          userId,
        ],
      );
    } else if (role === "tutee") {
      await pool.query(
        `UPDATE tutee_profiles SET
          department=$1, phone=$2, nationality=$3, gender=$4, native_language=$5,
          overall_level=$6, learning_duration=$7,
          level_listening=$8, level_speaking=$9, level_reading=$10, level_writing=$11,
          target_skills=$12, skills_to_improve=$13,
          available_times=$14
         WHERE user_id=$15`,
        [
          department,
          phone,
          nationality,
          gender,
          nativeLanguage,
          overallLevel,
          learningDuration,
          levelListening,
          levelSpeaking,
          levelReading,
          levelWriting,
          JSON.stringify(targetSkills),
          skillsToImprove,
          JSON.stringify(availableTimes),
          userId,
        ],
      );
    }

    res.json({ success: true, message: "✅ 資料已更新！" });
  } catch (error) {
    console.error("更新個人資料失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 發送私訊 (POST)
app.post("/api/messages/send", async (req, res) => {
  const { senderAccount, receiverId, content } = req.body;
  if (!content?.trim())
    return res.status(400).json({ success: false, message: "訊息不能為空" });
  try {
    const senderRes = await pool.query(
      "SELECT id FROM users WHERE account = $1",
      [senderAccount],
    );
    const senderId = senderRes.rows[0].id;
    await pool.query(
      "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)",
      [senderId, receiverId, content],
    );
    res.json({ success: true, message: "訊息已送出" });
  } catch (error) {
    console.error("發送私訊失敗:", error);
    res.status(500).json({ success: false });
  }
});

// 🚀 取得未讀訊息數 (GET)
app.get("/api/messages/unread/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = FALSE",
      [req.params.userId],
    );
    res.json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (error) {
    res.status(500).json({ success: false, count: 0 });
  }
});

// 🚀 取得兩人之間的對話紀錄 (GET)
app.get("/api/messages/:userAId/:userBId", async (req, res) => {
  const { userAId, userBId } = req.params;
  try {
    const result = await pool.query(
      `SELECT m.id, m.content, m.is_read, m.created_at,
              m.sender_id, u.chinese_name, u.english_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [userAId, userBId],
    );
    // 標記對方發給我的訊息為已讀
    await pool.query(
      `UPDATE messages SET is_read = TRUE
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [userBId, userAId],
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("取得對話失敗:", error);
    res.status(500).json({ success: false });
  }
});

// 🚀 取得 tutor 所有曾配對的 tutee 列表（含現在）
app.get("/api/messages/contacts/tutor/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT
         u.id as user_id,
         u.chinese_name,
         u.english_name,
         u.email,
         mh.is_active,
         mh.matched_at,
         (
           SELECT COUNT(*) FROM messages m
           WHERE m.sender_id = u.id
             AND m.receiver_id = $1
             AND m.is_read = FALSE
         ) as unread_count,
         (
           SELECT m.content FROM messages m
           WHERE (m.sender_id = u.id AND m.receiver_id = $1)
              OR (m.sender_id = $1 AND m.receiver_id = u.id)
           ORDER BY m.created_at DESC LIMIT 1
         ) as last_message,
         (
           SELECT m.created_at FROM messages m
           WHERE (m.sender_id = u.id AND m.receiver_id = $1)
              OR (m.sender_id = $1 AND m.receiver_id = u.id)
           ORDER BY m.created_at DESC LIMIT 1
         ) as last_message_at
       FROM match_history mh
       JOIN users u ON mh.tutee_id = u.id
       WHERE mh.tutor_id = $1
       ORDER BY last_message_at DESC NULLS LAST, mh.matched_at DESC`,
      [req.params.userId],
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("取得聯絡人列表失敗:", error);
    res.status(500).json({ success: false });
  }
});

// 🚀 取得 tutee 所有曾配對的 tutor 列表（含現在）
app.get("/api/messages/contacts/tutee/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT
         u.id as user_id,
         u.chinese_name,
         u.english_name,
         u.email,
         mh.is_active,
         mh.matched_at,
         (
           SELECT COUNT(*) FROM messages m
           WHERE m.sender_id = u.id
             AND m.receiver_id = $1
             AND m.is_read = FALSE
         ) as unread_count,
         (
           SELECT m.content FROM messages m
           WHERE (m.sender_id = u.id AND m.receiver_id = $1)
              OR (m.sender_id = $1 AND m.receiver_id = u.id)
           ORDER BY m.created_at DESC LIMIT 1
         ) as last_message,
         (
           SELECT m.created_at FROM messages m
           WHERE (m.sender_id = u.id AND m.receiver_id = $1)
              OR (m.sender_id = $1 AND m.receiver_id = u.id)
           ORDER BY m.created_at DESC LIMIT 1
         ) as last_message_at
       FROM match_history mh
       JOIN users u ON mh.tutor_id = u.id
       WHERE mh.tutee_id = $1
       ORDER BY last_message_at DESC NULLS LAST, mh.matched_at DESC`,
      [req.params.userId],
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("取得聯絡人列表失敗:", error);
    res.status(500).json({ success: false });
  }
});

// 🚀 提出解除配對申請 (POST)
app.post("/api/unmatch/request", async (req, res) => {
  const { userId, role, reason } = req.body;
  if (!reason?.trim())
    return res.status(400).json({ success: false, message: "請填寫解除原因" });

  try {
    // 找到配對對象
    let tutor_id, tutee_id;
    if (role === "tutor") {
      const r = await pool.query(
        "SELECT matched_tutee_id FROM tutor_profiles WHERE user_id = $1",
        [userId],
      );
      if (!r.rows[0]?.matched_tutee_id)
        return res
          .status(400)
          .json({ success: false, message: "目前沒有配對學生" });
      tutor_id = userId;
      tutee_id = r.rows[0].matched_tutee_id;
    } else {
      const r = await pool.query(
        "SELECT matched_tutor_id FROM tutee_profiles WHERE user_id = $1",
        [userId],
      );
      if (!r.rows[0]?.matched_tutor_id)
        return res
          .status(400)
          .json({ success: false, message: "目前沒有配對老師" });
      tutee_id = userId;
      tutor_id = r.rows[0].matched_tutor_id;
    }

    // 避免重複申請
    const dup = await pool.query(
      "SELECT id FROM unmatch_requests WHERE requester_id = $1 AND status = 'pending'",
      [userId],
    );
    if (dup.rows.length > 0)
      return res
        .status(400)
        .json({ success: false, message: "您已有一筆待審核的解除申請" });

    await pool.query(
      `INSERT INTO unmatch_requests (requester_id, requester_role, tutor_id, tutee_id, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, role, tutor_id, tutee_id, reason],
    );
    res.json({
      success: true,
      message: "✅ 解除配對申請已送出，請等待管理員審核",
    });
  } catch (error) {
    console.error("解除配對申請失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 查詢自己的解除申請狀態 (GET)
app.get("/api/unmatch/status/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, status, reason, created_at, reviewed_at
       FROM unmatch_requests WHERE requester_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.userId],
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：查看所有解除配對申請 (GET)
app.get("/api/admin/unmatch-requests", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.status, u.reason, u.requester_role, u.created_at, u.reviewed_at,
        req.chinese_name AS requester_chinese_name,
        req.english_name AS requester_english_name,
        tor.chinese_name AS tutor_chinese_name,
        tor.english_name AS tutor_english_name,
        tee.chinese_name AS tutee_chinese_name,
        tee.english_name AS tutee_english_name,
        u.tutor_id, u.tutee_id
      FROM unmatch_requests u
      JOIN users req ON u.requester_id = req.id
      JOIN users tor ON u.tutor_id = tor.id
      JOIN users tee ON u.tutee_id = tee.id
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("查詢解除申請失敗:", error);
    res.status(500).json({ success: false });
  }
});

// 🚀 管理員：審核解除配對申請 (POST)
app.post("/api/admin/unmatch-requests/:id/review", async (req, res) => {
  const { action } = req.body; // 'approved' | 'rejected'
  try {
    const reqRes = await pool.query(
      "SELECT * FROM unmatch_requests WHERE id = $1",
      [req.params.id],
    );
    const unmatch = reqRes.rows[0];
    if (!unmatch)
      return res.status(404).json({ success: false, message: "找不到申請" });

    await pool.query(
      "UPDATE unmatch_requests SET status = $1, reviewed_at = NOW() WHERE id = $2",
      [action, req.params.id],
    );

    if (action === "approved") {
      const { tutor_id, tutee_id } = unmatch;

      // 清除配對關係
      await pool.query(
        "UPDATE tutor_profiles SET matched_tutee_id = NULL WHERE user_id = $1",
        [tutor_id],
      );
      await pool.query(
        "UPDATE tutee_profiles SET matched_tutor_id = NULL WHERE user_id = $1",
        [tutee_id],
      );

      // 標記 match_history 為已結束
      await pool.query(
        `UPDATE match_history SET is_active = FALSE, ended_at = NOW()
         WHERE tutor_id = $1 AND tutee_id = $2 AND is_active = TRUE`,
        [tutor_id, tutee_id],
      );

      // 取消未來的課程（過去的保留，時數不受影響）
      await pool.query(
        `UPDATE classes SET status = 'cancelled'
         WHERE tutor_id = $1 AND tutee_id = $2
           AND class_date >= CURRENT_DATE
           AND status != 'cancelled'`,
        [tutor_id, tutee_id],
      );

      // ← 新增：把這筆配對的 match_requests 改回 rejected，讓學生重新開放
      await pool.query(
        `UPDATE match_requests SET status = 'rejected'
     WHERE tutor_id = $1 AND tutee_id = $2 AND status = 'accepted'`,
        [tutor_id, tutee_id],
      );
    }

    res.json({
      success: true,
      message:
        action === "approved"
          ? "✅ 已核准解除配對，未來課程已取消"
          : "❌ 已駁回申請",
    });
  } catch (error) {
    console.error("審核解除配對失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 外籍生：查詢上課紀錄 (GET)
app.get("/api/tutee/classes-history/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT
        c.id            AS class_id,
        c.class_date::text,
        c.start_time,
        c.end_time,
        c.tutee_signed_at,
        u.chinese_name  AS tutor_chinese_name,
        u.english_name  AS tutor_english_name,
        cn.id           AS note_id,
        cn.content      AS note_content,
        cn.location     AS note_location
      FROM classes c
      LEFT JOIN users u ON c.tutor_id = u.id
      LEFT JOIN class_notes cn
        ON cn.class_id = c.id AND cn.user_id = $1
      WHERE c.tutee_id = $1
        AND c.status != 'cancelled'
      ORDER BY c.class_date DESC, c.start_time DESC
      `,
      [userId],
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("查詢外籍生上課紀錄失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});

// 🚀 管理員：手動幫學生新增輔導時數 (POST)
// 🚀 管理員：手動幫學生新增輔導時數 (POST) - 支援多筆與防呆查詢
app.post("/api/admin/add-hours", async (req, res) => {
  // 🌟 改為接收 account 與 slots(陣列)
  const { account, slots } = req.body;

  try {
    // 🌟 先用 account 去資料庫查出真實的 tutorId (避免前端傳來 undefined 導致報錯)
    const userRes = await pool.query(
      "SELECT id FROM users WHERE account = $1",
      [account],
    );
    if (userRes.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "找不到該名學生" });
    }
    const tutorId = userRes.rows[0].id;

    // 🌟 使用 for...of 迴圈，逐一處理每一筆時數
    for (const slot of slots) {
      const { date, startTime, endTime } = slot;

      // 1. 新增一筆假的課程紀錄 (不需要 tutee_id)
      const classResult = await pool.query(
        `INSERT INTO classes (tutor_id, class_date, start_time, end_time, status, tutor_signed_at) 
         VALUES ($1, $2, $3, $4, 'completed', NOW()) RETURNING id`,
        [tutorId, date, startTime, endTime],
      );
      const newClassId = classResult.rows[0].id;

      // 2. 新增一筆假的課堂紀錄，讓時數計算邏輯成立
      await pool.query(
        `INSERT INTO class_notes (class_id, user_id, role, content, updated_at) 
         VALUES ($1, $2, 'tutor', '管理員手動新增時數', NOW())`,
        [newClassId, tutorId],
      );

      // 3. 寫入 hours_review 並直接設定為 approved
      await pool.query(
        `INSERT INTO hours_review (class_id, tutor_id, status, reviewed_at) 
         VALUES ($1, $2, 'approved', NOW())`,
        [newClassId, tutorId],
      );
    }

    res.json({
      success: true,
      message: `✅ 成功為學生新增 ${slots.length} 筆輔導時數！`,
    });
  } catch (error) {
    console.error("手動新增時數失敗:", error);
    res.status(500).json({ success: false, message: "伺服器發生錯誤" });
  }
});
