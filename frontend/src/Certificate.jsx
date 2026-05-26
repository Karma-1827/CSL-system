import React, { useRef } from "react";
import html2pdf from "html2pdf.js";

// 引入你指定的圖片資產
import ntnuLogo from "./assets/NTNU_logo.svg.png";
import cslLogo from "./assets/csl-Logo.png";
import watermarkImg from "./assets/NTNU-CSL-LOGO (9).png";

const Certificate = ({ studentName, studentId, records, totalHours, date }) => {
  const certificateRef = useRef();

  const handleDownloadPdf = () => {
    const element = certificateRef.current;

    const opt = {
      margin: 10,
      filename: `${studentName}_實習時數證明書.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
      }}
    >
      {/* 下載按鈕 */}
      <button
        onClick={handleDownloadPdf}
        style={{
          marginBottom: "20px",
          padding: "10px 20px",
          cursor: "pointer",
          backgroundColor: "#a32329", // 配合師大紅的按鈕顏色
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          fontWeight: "bold",
        }}
      >
        下載證書 PDF
      </button>

      {/* PDF 實際內容包裝層 */}
      <div
        ref={certificateRef}
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "40px",
          backgroundColor: "#fff",
          boxSizing: "border-box",
          position: "relative", // 讓內部的浮水印可以相對定位
          fontFamily: "sans-serif",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ================= 背景浮水印 ================= */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "70%", // 調整浮水印大小
            opacity: 0.08, // 淡淡的透明度，可依需求調整 (0.05 ~ 0.1 之間較佳)
            zIndex: 0,
            pointerEvents: "none", // 避免影響文字選取
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <img
            src={watermarkImg}
            alt="Watermark"
            style={{ width: "100%", height: "auto" }}
          />
        </div>

        {/* ================= 前景內容 (確保 zIndex 在浮水印之上) ================= */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
          }}
        >
          {/* 頁首標題區 */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            {/* 頁首紅色校徽 */}
            <img
              src={ntnuLogo}
              alt="NTNU Logo"
              style={{ width: "70px", marginBottom: "12px" }}
            />
            <h1
              style={{
                fontSize: "26px",
                margin: "5px 0",
                color: "#000",
                letterSpacing: "2px",
              }}
            >
              國立臺灣師範大學華語文教學系
            </h1>
            <h2
              style={{
                fontSize: "14px",
                margin: "5px 0",
                fontWeight: "normal",
                color: "#555",
              }}
            >
              National Taiwan Normal University Department of Chinese as a
              Second Language
            </h2>
            <h2
              style={{
                fontSize: "24px",
                margin: "30px 0 5px 0",
                letterSpacing: "4px",
                fontWeight: "bold",
              }}
            >
              輔導實習時數證明書
            </h2>
            <h3
              style={{
                fontSize: "13px",
                margin: "0",
                fontWeight: "normal",
                color: "#555",
                letterSpacing: "1px",
              }}
            >
              Certificate of Practicum Hours
            </h3>
          </div>

          {/* 內文區 */}
          <div
            style={{
              fontSize: "17px",
              lineHeight: "2",
              marginBottom: "30px",
              textAlign: "justify",
            }}
          >
            <p style={{ textIndent: "34px" }}>
              茲證明 <strong>{studentName}</strong> 同學 (學號：
              <strong>{studentId}</strong>)
              於本系擔任外籍生華語輔導小老師期間，積極協助外籍學生學習華語，認真履行輔導職責，已累計完成輔導實習時數共{" "}
              <strong>{totalHours}</strong> 小時，特此證明。
            </p>
          </div>

          {/* 動態表格區 */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "50px",
              textAlign: "center",
              backgroundColor: "rgba(255,255,255,0.8)",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f9f9f9" }}>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    fontSize: "15px",
                  }}
                >
                  輔導日期
                  <br />
                  <span style={{ fontSize: "12px", fontWeight: "normal" }}>
                    (YYYY/MM/DD)
                  </span>
                </th>
                <th
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    fontSize: "15px",
                  }}
                >
                  輔導時數
                  <br />
                  <span style={{ fontSize: "12px", fontWeight: "normal" }}>
                    (小時)
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => (
                <tr key={index}>
                  <td style={{ border: "1px solid #000", padding: "10px" }}>
                    {record.date}
                  </td>
                  <td style={{ border: "1px solid #000", padding: "10px" }}>
                    {record.hours}
                  </td>
                </tr>
              ))}
              {/* 總計列 */}
              <tr style={{ backgroundColor: "#f9f9f9" }}>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    fontWeight: "bold",
                  }}
                >
                  總計
                </td>
                <td
                  style={{
                    border: "1px solid #000",
                    padding: "12px",
                    fontWeight: "bold",
                  }}
                >
                  {totalHours} 小時
                </td>
              </tr>
            </tbody>
          </table>

          {/* 底部佈局：左下角 Logo 與右下角簽名 */}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingBottom: "20px",
            }}
          >
            {/* 左下角 CSL Logo */}
            <div style={{ textAlign: "left" }}>
              <img
                src={cslLogo}
                alt="CSL Logo"
                style={{ width: "140px", height: "auto" }}
              />
            </div>

            {/* 右下角日期與落款 */}
            <div style={{ textAlign: "right", lineHeight: "1.6" }}>
              <p
                style={{
                  margin: "5px 0",
                  fontSize: "16px",
                  letterSpacing: "1px",
                }}
              >
                中華民國 {date}
              </p>
              <p
                style={{
                  margin: "5px 0",
                  fontSize: "18px",
                  fontWeight: "bold",
                  letterSpacing: "2px",
                }}
              >
                華語文教學系
              </p>
              <p style={{ margin: "5px 0", fontSize: "13px", color: "#444" }}>
                Chinese as a Second Language
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificate;
