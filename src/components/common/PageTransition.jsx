import React from 'react';
import { motion } from 'framer-motion';

// Định nghĩa các trạng thái animation bằng variants để code sạch sẽ hơn
const pageVariants = {
  // Trạng thái ban đầu khi trang bắt đầu vào
  initial: {
    opacity: 0,
    y: 20,       // Bắt đầu từ vị trí thấp hơn một chút
    scale: 0.98, // Và hơi thu nhỏ lại
  },
  // Trạng thái khi trang đã hiển thị hoàn toàn
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  // Trạng thái khi trang thoát ra
  out: {
    opacity: 0,
    y: -20,      // Trượt nhẹ lên trên khi thoát
    scale: 0.98, // Và hơi thu nhỏ lại
  },
};

// Định nghĩa các thuộc tính của hiệu ứng chuyển động
const pageTransition = {
  type: 'tween',        // Kiểu chuyển động mượt
  ease: 'circOut',      // Đường cong chuyển động tự nhiên
  duration: 0.3,        // Thời gian diễn ra hiệu ứng
};

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}