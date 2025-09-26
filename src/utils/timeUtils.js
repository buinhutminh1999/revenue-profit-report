// src/utils/timeUtils.js

/**
 * Kiểm tra chuỗi có đúng định dạng "HH:MM"
 */
export function isTimeString(s) {
  return typeof s === "string" && /^\d{1,2}:\d{2}$/.test(s);
}

/**
 * Chuyển "HH:MM" → tổng phút từ 00:00
 */
export function parseTimeToMinutes(s) {
  const [h, m] = s.split(":").map((x) => Number(x));
  return h * 60 + m;
}

/**
 * Trễ: khi timeStr > threshold (phút)
 */
export function isLate(timeStr, threshold) {
  if (!isTimeString(timeStr)) return false;
  return parseTimeToMinutes(timeStr) > threshold;
}

/**
 * Ra sớm: khi timeStr < threshold (phút)
 */
export function isEarly(timeStr, threshold) {
  if (!isTimeString(timeStr)) return false;
  return parseTimeToMinutes(timeStr) < threshold;
}