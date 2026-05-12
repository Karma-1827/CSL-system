const jwt = require('jsonwebtoken');
      return res.status(401).json({ 
        success: false, 
        message: '未提供授權令牌' 
      });
    }

    const token = authHeader.slice(7); // 移除 "Bearer " 前綴

    // 驗證令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: '令牌已過期，請重新登入' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: '無效的令牌' 
    });
  }
};

/**
 * 檢查用戶角色的中間件
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: '請先登入' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `無權訪問：需要 ${allowedRoles.join('/')} 權限` 
      });
    }

    next();
  };
};

/**
 * 僅管理員可訪問
 */
const adminOnly = roleMiddleware(['admin']);

/**
 * 教師或管理員可訪問
 */
const tutorOrAdmin = roleMiddleware(['tutor', 'admin']);

module.exports = {
  authMiddleware,
  roleMiddleware,
  adminOnly,
  tutorOrAdmin
};