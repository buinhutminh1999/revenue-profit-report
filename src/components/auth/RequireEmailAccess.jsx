import React, { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { db } from '../../services/firebase-config'; 
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../App'; 
import LoadingScreen from '../common/LoadingScreen';

// --- THAY ĐỔI QUAN TRỌNG: Component giờ nhận prop `pathKey` ---
const RequireEmailAccess = ({ children, pathKey }) => {
    const { user, loading: authLoading } = useAuth();
    const [accessState, setAccessState] = useState('loading'); // Trạng thái: 'loading', 'allowed', 'denied'
    const location = useLocation();

    useEffect(() => {
        // QUAN TRỌNG: Kiểm tra xem router có truyền `pathKey` vào không.
        // Nếu không có, đây là lỗi lập trình và cần phải báo ngay.
        if (!pathKey) {
            console.error("Lỗi Cấu Hình: Component RequireEmailAccess thiếu prop 'pathKey'. Vui lòng kiểm tra file src/routes/index.jsx");
            setAccessState('denied');
            return;
        }

        const checkAccess = async () => {
            // Nếu không có user hoặc email, từ chối ngay lập tức
            if (!user || !user.email) {
                setAccessState('denied');
                return;
            }
            // Admin luôn có toàn quyền truy cập
            if (user.role === 'admin') {
                setAccessState('allowed');
                return;
            }
            
            const whitelistDocRef = doc(db, 'configuration', 'accessControl');
            try {
                const docSnap = await getDoc(whitelistDocRef);
                if (docSnap.exists()) {
                    const rules = docSnap.data();
                    
                    // --- ĐÂY LÀ LOGIC ĐÃ SỬA ---
                    // Lấy mảng email của đúng đường dẫn được chỉ định bởi `pathKey`
                    // Ví dụ: rules['asset-transfer']
                    const allowedEmails = rules[pathKey] || [];
                    
                    // Kiểm tra xem email của người dùng có trong danh sách được phép không
                    if (allowedEmails.includes(user.email)) {
                        setAccessState('allowed');
                    } else {
                        setAccessState('denied');
                    }
                } else {
                    // Nếu không có document cấu hình, không ai được vào (trừ admin)
                    setAccessState('denied');
                }
            } catch (error) {
                console.error("Lỗi khi kiểm tra quyền truy cập:", error);
                setAccessState('denied'); // Mặc định từ chối nếu có lỗi để đảm bảo an toàn
            }
        };

        // Chỉ chạy kiểm tra khi quá trình xác thực hoàn tất
        if (!authLoading) {
            checkAccess();
        }

    }, [user, authLoading, pathKey]); // Effect sẽ chạy lại nếu user hoặc pathKey thay đổi

    // Hiển thị màn hình tải nếu đang xác thực hoặc đang kiểm tra quyền
    if (authLoading || accessState === 'loading') {
        return <LoadingScreen isSuspense />;
    }

    // Nếu được phép, hiển thị nội dung; ngược lại, chuyển hướng đến trang "Không có quyền"
    return accessState === 'allowed' 
        ? children 
        : <Navigate to="/unauthorized" state={{ from: location }} replace />;
};

export default RequireEmailAccess;