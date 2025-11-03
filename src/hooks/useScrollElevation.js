import { useState, useEffect } from 'react';

/**
 * Một custom hook để kiểm tra xem người dùng đã cuộn qua một ngưỡng hay chưa.
 * @param {object} options - Tùy chọn
 * @param {number} [options.threshold=0] - Ngưỡng cuộn (px) để kích hoạt trạng thái "elevated".
 * @param {EventTarget} [options.target=window] - Element mục tiêu để lắng nghe sự kiện cuộn.
 * @returns {boolean} - Trả về `true` nếu đã cuộn qua ngưỡng, ngược lại `false`.
 */
export default function useScrollElevation(options = {}) {
  // Gán giá trị mặc định cho threshold và target
  const { threshold = 0, target = window } = options;
  
  const [isElevated, setIsElevated] = useState(false);

  useEffect(() => {
    // Hàm xử lý sự kiện cuộn
    const handleScroll = () => {
      // Lấy vị trí cuộn
      // window.scrollY dùng cho window
      // target.scrollTop dùng cho các DOM element khác
      const scrollTop = target.scrollY || target.scrollTop || 0;
      
      // Cập nhật state nếu vị trí cuộn vượt ngưỡng
      setIsElevated(scrollTop > threshold);
    };

    // Gọi handleScroll một lần khi component mount
    // để set trạng thái ban đầu (phòng trường hợp trang tải lại khi đang cuộn)
    handleScroll();

    // Thêm event listener
    // Dùng { passive: true } để tối ưu hiệu suất cuộn
    target.addEventListener('scroll', handleScroll, { passive: true });

    // Hàm dọn dẹp: gỡ bỏ event listener khi component unmount
    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [target, threshold]); // Chạy lại effect nếu target hoặc threshold thay đổi

  return isElevated;
}