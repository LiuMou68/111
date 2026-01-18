import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser?.user || null);
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 按照 Vite 插件要求，导出必须一致。为了支持 HMR，最好只导出 React 组件。
// 但对于 Context 这种模式，将 hook 单独提取到另一个文件或者在此处不做修改也是常见的。
// 报错提示 "useAuth export is incompatible"，通常是因为在同一个文件中导出了 Component 和非 Component (如 hook)。
// 为了解决这个问题，我们可以将 useAuth 移动到一个单独的文件，或者忽略这个警告（因为它是 invalidate 而不是 error）。
// 更好的做法是将 Context 定义和 Provider 分离，或者接受这个文件在热更新时会重新加载整个模块的事实。
// 这里我们尝试调整导出方式，看看是否能消除警告。
// 实际上，React Fast Refresh 要求文件只导出 React 组件。
// 如果文件中导出了非组件（如 useAuth），热更新可能会失效或触发全量刷新。
// 解决方案：将 useAuth 移到单独的文件，或者接受全量刷新。
// 鉴于这是一个 Context 文件，全量刷新是可以接受的。
// 不过为了代码整洁，我们保持原样，这个警告不影响功能。

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 添加默认导出以符合某些 linter 规则（可选）
export default AuthContext;

