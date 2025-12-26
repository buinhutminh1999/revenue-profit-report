import React, { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Component được bọc forwardRef để tương thích tốt hơn với các thư viện khác nếu cần
const PageTransition = forwardRef(({ children, style, ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion();

  // Nếu người dùng bật "Giảm chuyển động", chỉ dùng opacity đơn giản
  const variants = {
    initial: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 20, scale: 0.98 },
    animate: shouldReduceMotion
      ? { opacity: 1 }
      : { opacity: 1, y: 0, scale: 1 },
    exit: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: -20, scale: 0.98 },
  };

  const transition = {
    type: 'tween',
    ease: 'circOut',
    duration: shouldReduceMotion ? 0.2 : 0.3, // Nhanh hơn nếu giảm chuyển động
  };

  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
      style={{
        width: '100%',
        minHeight: '100%', // Đảm bảo không bị co lại
        display: 'flex',     // Layout linh hoạt
        flexDirection: 'column',
        ...style // Cho phép override style nếu cần
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
});

PageTransition.displayName = 'PageTransition';

export default PageTransition;