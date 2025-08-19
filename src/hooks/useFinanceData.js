import { useQuery } from 'react-query';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

// ✅ LƯU Ý: Đảm bảo đường dẫn này trỏ đúng đến file cấu hình firebase của bạn
import { db } from "../services/firebase-config"; 

const BALANCES_COLLECTION = 'accountBalances';

/**
 * Một custom hook để lấy dữ liệu số dư tài khoản từ Firestore cho một kỳ (quý/năm) cụ thể.
 * Dữ liệu được trả về dưới dạng một object để dễ dàng tra cứu bằng accountId.
 * @param {number} year - Năm cần lấy dữ liệu.
 * @param {number} quarter - Quý cần lấy dữ liệu.
 * @returns {object} Trả về các trạng thái của react-query (data, isLoading, isError, error).
 * - `data`: Một object với key là `accountId` và value là toàn bộ thông tin số dư của tài khoản đó.
 * - Ví dụ: { "152": { accountId: "152", cuoiKyNo: 500000, ... }, "131": { ... } }
 */
export const useAccountBalances = (year, quarter) => {
    return useQuery(
        // 1. Khóa truy vấn (Query Key):
        // React-Query sẽ tự động cache và cập nhật dữ liệu dựa trên key này.
        // Khi year hoặc quarter thay đổi, key sẽ thay đổi và hook sẽ tự động fetch lại dữ liệu mới.
        ['accountBalances', year, quarter], 
        
        // 2. Hàm lấy dữ liệu (Fetcher Function):
        // Một hàm async để thực hiện truy vấn tới Firestore.
        async () => {
            // Hiển thị log để kiểm tra xem hook có đang chạy không
            console.log(`Fetching balances for Q${quarter}/${year}...`);

            const balancesObject = {}; 
            
            // Tạo câu truy vấn với điều kiện lọc theo năm và quý
            const q = query(
                collection(db, BALANCES_COLLECTION), 
                where("year", "==", year), 
                where("quarter", "==", quarter)
            );
            
            const querySnapshot = await getDocs(q);
            
            // Lặp qua từng document kết quả và đưa vào object
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Gán dữ liệu vào object với key là accountId
                balancesObject[data.accountId] = data; 
            });
            
            console.log('Fetched balances data:', balancesObject);
            return balancesObject;
        },
        
        // 3. Tùy chọn (Options):
        {
            // Giữ lại dữ liệu của lần fetch trước đó trong khi đang fetch dữ liệu mới.
            // Giúp UI không bị chớp tắt về trạng thái loading khi đổi quý hoặc năm.
            keepPreviousData: true,

            // Dữ liệu sẽ được coi là "cũ" (stale) sau 5 phút.
            // Trong khoảng thời gian này, react-query sẽ không tự động fetch lại khi focus vào cửa sổ.
            staleTime: 5 * 60 * 1000, 
        }
    );
};

// Bạn có thể thêm các hook liên quan đến tài chính khác vào file này trong tương lai.