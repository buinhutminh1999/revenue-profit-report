import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Stack } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { getAuth, onIdTokenChanged, sendEmailVerification, signOut } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PleaseVerifyEmail() {
  const { user } = useAuth();
  const auth = getAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = location.state?.from?.pathname || '/';

  const [isSending, setIsSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false); // mutex chống chạy song song
  const triesRef = useRef(0);

//   // Chưa đăng nhập -> về login
//   useEffect(() => {
//     if (!auth.currentUser) {
//       navigate('/login', { replace: true, state: { from: location } });
//     }
//   }, [auth, navigate, location]);

  // Nếu context đã có verified -> đi ngay
  useEffect(() => {
    if (user?.emailVerified) {
      navigate(backTo, { replace: true });
    }
  }, [user?.emailVerified, backTo, navigate]);

  // Hàm kiểm tra NHẸ: chỉ reload, KHÔNG ép refresh token
  const softCheck = async () => {
    if (!auth?.currentUser || checkingRef.current) return;
    try {
      checkingRef.current = true;
      setChecking(true);
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        navigate(backTo, { replace: true });
      }
    } catch (e) {
      if (e?.code === 'auth/quota-exceeded') {
        // backoff nhẹ nếu lỡ dày quá
        console.warn('Quota exceeded: sẽ tạm hoãn kiểm tra');
      } else {
        console.error('softCheck error', e);
      }
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  };

  // 1) Lắng nghe token thay đổi: chỉ reload + điều hướng (không ép refresh)
  useEffect(() => {
    if (!auth) return;
    const unsub = onIdTokenChanged(auth, async (fbUser) => {
      if (!fbUser) return;
      await softCheck();
    });
    return () => unsub();
  }, [auth]); // eslint-disable-line

  // 2) Refresh khi tab quay lại foreground
  useEffect(() => {
    const onFocus = () => softCheck();
    const onVis = () => { if (document.visibilityState === 'visible') softCheck(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []); // eslint-disable-line

  // 3) (Tùy chọn) Poll THƯA: mỗi 12s, tối đa 6 lần
  useEffect(() => {
    const id = setInterval(async () => {
      if (triesRef.current >= 6) return clearInterval(id);
      triesRef.current += 1;
      await softCheck();
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const handleResendEmail = async () => {
    if (!auth.currentUser) return;
    setIsSending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success('Đã gửi lại email xác thực. Vui lòng kiểm tra (kể cả Spam).');
    } catch (error) {
      console.error('Lỗi gửi lại email xác thực:', error);
      toast.error(
        error?.code === 'auth/too-many-requests'
          ? 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.'
          : 'Không thể gửi lại email. Vui lòng thử lại.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleManualCheck = async () => {
    await softCheck();
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', bgcolor:'grey.100' }}>
      <Paper sx={{ p:4, maxWidth: 500, textAlign:'center', borderRadius:3 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Xác thực tài khoản của bạn
        </Typography>
        <Typography color="text.secondary" sx={{ mb:3 }}>
          Chúng tôi đã gửi một liên kết xác thực đến email <strong>{user?.email || 'email của bạn'}</strong>.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb:3 }}>
          Sau khi xác thực, trang này sẽ tự động chuyển hướng bạn
          {location.state?.from?.pathname ? ` về ${location.state.from.pathname}` : ''}.
          Nếu chưa chuyển, bấm “Tôi đã xác thực”.
        </Typography>

        <Stack spacing={2}>
          <Button variant="contained" onClick={handleResendEmail} disabled={isSending}>
            {isSending ? <CircularProgress size={24} color="inherit" /> : 'Gửi lại email xác thực'}
          </Button>
          <Button variant="outlined" onClick={handleManualCheck} disabled={checking}>
            {checking ? <CircularProgress size={20} color="inherit" /> : 'Tôi đã xác thực • Làm mới'}
          </Button>
          <Button onClick={handleLogout}>Đăng xuất</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
