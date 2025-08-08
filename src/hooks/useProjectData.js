import { useState, useEffect, useRef } from 'react'; // Thêm useRef
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { toNum } from '../utils/numberUtils';
import { pickDirectCostMap } from '../utils/pickDirectCostMap';

/**
 * Hook realtime lấy dữ liệu dự án hàng loạt (revenue + directCostMap) từ Firestore
 * - Tối ưu để chỉ render 1 lần sau khi tải xong và sửa lỗi loading.
 */
export function useProjectData(projects, year, quarter) {
    const [projData, setProjData] = useState({});
    const [loading, setLoading] = useState(true);
    // Dùng useRef để lưu trữ dữ liệu tạm thời mà không gây re-render
    const dataBatch = useRef({});

    useEffect(() => {
        if (!projects?.length) {
            setProjData({});
            setLoading(false);
            return;
        }

        setLoading(true);
        // Reset batch cho mỗi lần effect chạy lại
        dataBatch.current = {};
        let loadedCount = 0;

        const unsubscribes = projects.map((p) => {
            const ref = doc(db, 'projects', p.id, 'years', String(year), 'quarters', quarter);
            
            // Flag để xác định đây là lần tải dữ liệu đầu tiên của listener
            let isInitialLoad = true;

            return onSnapshot(ref, (snap) => {
                const data = snap.data() || {};
                
                // Luôn cập nhật dữ liệu mới nhất vào batch
                dataBatch.current[p.id] = {
                    overallRevenue: toNum(data.overallRevenue),
                    directCostMap: pickDirectCostMap(data),
                };

                // Chỉ chạy logic loading cho lần tải đầu tiên của mỗi listener
                if (isInitialLoad) {
                    isInitialLoad = false;
                    loadedCount++;

                    // Khi TẤT CẢ listener đã nhận được dữ liệu lần đầu
                    if (loadedCount === projects.length) {
                        setProjData(dataBatch.current); // Cập nhật state một lần duy nhất
                        setLoading(false); // Chỉ tắt loading khi tất cả đã sẵn sàng
                    }
                } else {
                    // Với các cập nhật real-time sau đó, cập nhật state ngay lập tức
                    // để giao diện luôn hiển thị dữ liệu mới nhất
                    setProjData(prev => ({
                        ...prev,
                        [p.id]: dataBatch.current[p.id]
                    }));
                }
            });
        });

        // Cleanup khi unmount hoặc params thay đổi
        return () => unsubscribes.forEach((unsub) => unsub());
    }, [projects, year, quarter]);

    return { projData, loading };
}