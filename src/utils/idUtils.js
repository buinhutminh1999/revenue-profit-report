// Hàm tạo id duy nhất (bạn có thể sử dụng thư viện uuid nếu cần)

export const generateUniqueId = () =>
    Date.now().toString() + Math.random().toString(36).slice(2,9);
  