import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Tabs, Tab, Paper, Typography, Skeleton } from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase-config';
import { Toaster } from 'react-hot-toast'; // << 1. IMPORT Toaster TỪ THƯ VIỆN

// Import 2 tab con (hãy chắc chắn đường dẫn này đúng với cấu trúc dự án của bạn)
import ActualCostsTab from '../components/tabs/ActualCostsTab';
import PlanningTab from '../components/tabs/PlanningTab';

// Component con để render panel nội dung của tab
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`project-tabpanel-${index}`}
            aria-labelledby={`project-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

export default function ProjectDetailsLayout() {
    const { id: projectId } = useParams(); // Lấy projectId từ URL
    const [activeTab, setActiveTab] = useState(0);
    const [projectInfo, setProjectInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Tải thông tin cơ bản của dự án để hiển thị tiêu đề
        const fetchProjectInfo = async () => {
            if (!projectId) return;
            setLoading(true);
            try {
                const projectDocRef = doc(db, 'projects', projectId);
                const docSnap = await getDoc(projectDocRef);
                if (docSnap.exists()) {
                    setProjectInfo(docSnap.data());
                } else {
                    setProjectInfo({ name: 'Không tìm thấy dự án' });
                }
            } catch (error) {
                console.error("Error fetching project info:", error);
                setProjectInfo({ name: 'Lỗi tải dữ liệu' });
            } finally {
                setLoading(false);
            }
        };
        fetchProjectInfo();
    }, [projectId]);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Box sx={{ p: 3, bgcolor: '#f4f6f8', minHeight: 'calc(100vh - 64px)' }}>
            
            {/* // << 2. THÊM COMPONENT Toaster VÀO ĐÂY */}
            <Toaster
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                    duration: 3500,
                    style: {
                        borderRadius: '8px',
                        background: '#333',
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    },
                }}
            />

            <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
                {loading ? <Skeleton width="60%" /> : `Chi tiết Công trình: ${projectInfo?.name}`}
            </Typography>

            <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="Project detail tabs">
                        <Tab label="Chi tiết Chi phí (Thực tế)" id="project-tab-0" />
                        <Tab label="Kế hoạch Thi công (BKTL)" id="project-tab-1" />
                    </Tabs>
                </Box>
                
                {/* Nội dung các Tab */}
                <TabPanel value={activeTab} index={0}>
                    <ActualCostsTab projectId={projectId} />
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                    <PlanningTab projectId={projectId} />
                </TabPanel>
            </Paper>
        </Box>
    );
}