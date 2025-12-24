const RAW_BASE = import.meta.env?.VITE_API_BASE_URL || '/api';
const API_BASE_URL = RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE}/api`;

function normalizeNetworkError(error) {
  const message = typeof error?.message === 'string' ? error.message : '';
  const isNetwork = error instanceof TypeError || /failed to fetch/i.test(message) || /networkerror/i.test(message);
  if (!isNetwork) return error;
  return new Error(`无法连接后端服务（${API_BASE_URL}）。请先启动后端：npm run start:backend`);
}

class AuthService {
  async login(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '登录失败');
      }

      const data = await response.json();
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('登录请求失败:', error);
      throw normalizeNetworkError(error);
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '注册失败');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('注册请求失败:', error);
      throw normalizeNetworkError(error);
    }
  }

  async getRoles() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/roles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('获取角色列表失败');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取角色列表失败:', error);
      throw normalizeNetworkError(error);
    }
  }

  isLoggedIn() {
    const user = localStorage.getItem('user');
    return user !== null;
  }

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const user = this.getCurrentUser();
      if (!user || !user.user || !user.user.User_ID) {
        throw new Error('用户未登录或会话已过期');
      }

      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.user.User_ID,
          currentPassword,
          newPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '修改密码失败');
      }

      return await response.json();
    } catch (error) {
      console.error('修改密码请求失败:', error);
      throw normalizeNetworkError(error);
    }
  }

  async getUserInfo(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取用户信息失败');
      }

      return await response.json();
    } catch (error) {
      console.error('获取用户信息请求失败:', error);
      throw normalizeNetworkError(error);
    }
  }

  async uploadAvatar(formData) {
    try {
      const user = this.getCurrentUser();
      if (!user || !user.user || !user.user.User_ID) {
        throw new Error('用户未登录或会话已过期');
      }

      const response = await fetch(`${API_BASE_URL}/user/${user.user.User_ID}/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传头像失败');
      }

      const data = await response.json();
      
      // 更新本地存储的用户信息
      const updatedUser = {
        ...user,
        user: {
          ...user.user,
          photo: data.avatarUrl
        }
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return data;
    } catch (error) {
      console.error('上传头像请求失败:', error);
      throw normalizeNetworkError(error);
    }
  }

  logout() {
    localStorage.removeItem('user');
  }
}

export const authService = new AuthService();

