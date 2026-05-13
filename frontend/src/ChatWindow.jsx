import React, { useState, useEffect, useRef } from "react";
import { X, Send, MessageSquare } from "lucide-react";

function ChatWindow({ myUserId, myAccount, partner, onClose, wsRef }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  // 載入歷史訊息
  useEffect(() => {
    if (!myUserId || !partner?.user_id) return;
    fetch(`http://localhost:3001/api/messages/${myUserId}/${partner.user_id}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setMessages(result.data);
      });
  }, [myUserId, partner?.user_id]);

  // 監聽 WebSocket 新訊息
  useEffect(() => {
    if (!wsRef?.current) return;
    const handleMsg = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "message") {
        setMessages((prev) => [...prev, msg]);
      }
    };
    wsRef.current.addEventListener("message", handleMsg);
    return () => wsRef.current?.removeEventListener("message", handleMsg);
  }, [wsRef]);

  // 自動捲到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");

    // 透過 WebSocket 即時推播給對方
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

    // 同時存入資料庫
    await fetch("http://localhost:3001/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderAccount: myAccount,
        receiverId: partner.user_id,
        content,
      }),
    });

    // 把自己發的訊息也即時顯示
    setMessages((prev) => [
      ...prev,
      {
        sender_id: myUserId,
        content,
        created_at: new Date().toISOString(),
      },
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
      {/* 標題列 */}
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
            <p className="text-green-300 text-[10px] font-medium">
              線上 Online
            </p>
          </div>
        </div>
        <X size={16} className="text-slate-300 hover:text-white" />
      </div>

      {/* 訊息區 */}
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
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isMine
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-white text-slate-700 border border-slate-200 rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 輸入列 */}
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

export default ChatWindow;
