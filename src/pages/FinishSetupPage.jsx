// src/pages/FinishSetupPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, updatePassword } from "firebase/auth";
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import LoadingScreen from '../components/common/LoadingScreen';

export default function FinishSetupPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); // Dùng AuthContext để lấy user

  // Khi người dùng click link và được chuyển đến đây,
  // Firebase SDK sẽ tự động đăng nhập cho họ.
  // AuthContext sẽ nhận diện được và cung cấp object `user`.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    const auth = getAuth();
    // `auth.currentUser` chính là người dùng vừa xác thực email
    if (auth.currentUser) {
      try {
        await updatePassword(auth.currentUser, password);
        setSuccess(true);
        setTimeout(() => {
          navigate('/'); // Chuyển về trang chủ sau khi thành công
        }, 2000);
      } catch (err) {
        setError('Không thể cập nhật mật khẩu. Vui lòng thử lại.');
        console.error(err);
      }
    } else {
      setError('Không tìm thấy thông tin người dùng. Link có thể đã hết hạn.');
    }
    setLoading(false);
  };
  
  if (authLoading) {
    return <LoadingScreen />;
  }

  if (success) {
    return (
      <div>
        <h2>Thành công!</h2>
        <p>Mật khẩu của bạn đã được tạo. Đang chuyển hướng về trang chủ...</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Hoàn tất đăng ký</h2>
      <p>Chào {user?.displayName || 'bạn'}, vui lòng tạo mật khẩu để truy cập tài khoản.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br />
        <input
          type="password"
          placeholder="Xác nhận mật khẩu"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <br />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Tạo mật khẩu'}
        </button>
      </form>
    </div>
  );
}