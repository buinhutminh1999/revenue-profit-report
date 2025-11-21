import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    Box, Tabs, Tab, Paper, Typography, Skeleton, Chip, 
    useTheme, alpha, Fade, IconButton, Tooltip
} from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase-config';
import { Toaster } from 'react-hot-toast';
import { 
    AccountTree, 
    Receipt, 
    Timeline,
    ArrowBack,
    Info as InfoIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Import 2 tab con
import ActualCostsTab from '../../components/tabs/ActualCostsTab';
import PlanningTab from '../../components/tabs/PlanningTab';

// Modern TabPanel với smooth transitions
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    const theme = useTheme();
    
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`project-tabpanel-${index}`}
            aria-labelledby={`project-tab-${index}`}
            {...other}
        >
            <AnimatePresence mode="wait">
                {value === index && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <Box sx={{ pt: 3 }}>{children}</Box>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Styled Tab với modern design
const StyledTab = React.memo(({ icon, label, ...props }) => {
    const theme = useTheme();
    return (
        <Tab
            {...props}
            icon={icon}
            iconPosition="start"
            label={label}
            sx={{
                minHeight: 64,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: 'text.secondary',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&.Mui-selected': {
                    color: theme.palette.primary.main,
                    fontWeight: 700,
                },
                '&:hover': {
                    color: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                },
            }}
        />
    );
});

StyledTab.displayName = 'StyledTab';

export default function ProjectDetailsLayout() {
    const { id: projectId } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState(0);
    const [projectInfo, setProjectInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        <Box
            sx={{
                minHeight: 'calc(100vh - 64px)',
                background: 'linear-gradient(to bottom, #f5f7fa 0%, #f5f7fa 100%)',
                backgroundAttachment: 'fixed',
                position: 'relative',
                width: '100%',
            }}
        >
            {/* Modern Toaster */}
            <Toaster
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                    duration: 3500,
                    style: {
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(12px)',
                        color: '#333',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                    },
                }}
            />

            <Box
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    p: { xs: 2, md: 4 },
                    minHeight: '100%',
                }}
            >
                {/* Modern Header Section */}
                <Fade in timeout={600}>
                    <Box
                        sx={{
                            mb: 4,
                            p: 3,
                            borderRadius: 3,
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            flexWrap: 'wrap',
                        }}
                    >
                        {/* Back Button */}
                        <Tooltip title="Quay lại">
                            <IconButton
                                onClick={() => navigate('/construction-plan')}
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    backdropFilter: 'blur(10px)',
                                    color: theme.palette.text.primary,
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 1)',
                                        transform: 'translateX(-4px)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    },
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                <ArrowBack />
                            </IconButton>
                        </Tooltip>

                        {/* Project Title */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        backdropFilter: 'blur(10px)',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                        border: '1px solid rgba(0, 0, 0, 0.08)',
                                    }}
                                >
                                    <AccountTree 
                                        sx={{ 
                                            fontSize: 28, 
                                            color: theme.palette.primary.main,
                                        }} 
                                    />
                                </Box>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 800,
                                        color: theme.palette.text.primary,
                                        letterSpacing: '-0.5px',
                                    }}
                                >
                                    {loading ? (
                                        <Skeleton 
                                            width="60%" 
                                            sx={{ 
                                                bgcolor: 'rgba(0, 0, 0, 0.1)',
                                                borderRadius: 2,
                                            }} 
                                        />
                                    ) : (
                                        projectInfo?.name || 'Chi tiết Công trình'
                                    )}
                                </Typography>
                            </Box>
                            
                            {/* Project Info Chip */}
                            {projectInfo && !loading && (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                    {projectInfo.type && (
                                        <Chip
                                            label={projectInfo.type}
                                            size="small"
                                            sx={{
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                color: theme.palette.primary.main,
                                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                                fontWeight: 600,
                                                '&:hover': {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.15),
                                                },
                                            }}
                                        />
                                    )}
                                    {projectInfo.status && (
                                        <Chip
                                            label={projectInfo.status}
                                            size="small"
                                            icon={<InfoIcon sx={{ color: `${theme.palette.text.secondary} !important` }} />}
                                            sx={{
                                                backgroundColor: alpha(theme.palette.text.secondary, 0.1),
                                                color: theme.palette.text.secondary,
                                                border: `1px solid ${alpha(theme.palette.text.secondary, 0.2)}`,
                                                fontWeight: 600,
                                            }}
                                        />
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Fade>

                {/* Modern Tabs Container với Glass Morphism */}
                <Fade in timeout={800}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            overflow: 'hidden',
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                            },
                        }}
                    >
                        {/* Modern Tabs Header */}
                        <Box
                            sx={{
                                borderBottom: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                                backdropFilter: 'blur(10px)',
                            }}
                        >
                            <Tabs
                                value={activeTab}
                                onChange={handleTabChange}
                                aria-label="Project detail tabs"
                                sx={{
                                    '& .MuiTabs-indicator': {
                                        height: 3,
                                        borderRadius: '3px 3px 0 0',
                                        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                    },
                                    '& .MuiTabs-flexContainer': {
                                        gap: 1,
                                    },
                                }}
                            >
                                <StyledTab
                                    icon={<Receipt sx={{ fontSize: 20 }} />}
                                    label="Chi tiết Chi phí (Thực tế)"
                                    id="project-tab-0"
                                />
                                <StyledTab
                                    icon={<Timeline sx={{ fontSize: 20 }} />}
                                    label="Kế hoạch Thi công (BKTL)"
                                    id="project-tab-1"
                                />
                            </Tabs>
                        </Box>

                        {/* Tab Content với smooth transitions */}
                        <Box
                            sx={{
                                minHeight: '400px',
                                background: 'transparent',
                            }}
                        >
                            <TabPanel value={activeTab} index={0}>
                                <ActualCostsTab projectId={projectId} />
                            </TabPanel>
                            <TabPanel value={activeTab} index={1}>
                                <PlanningTab projectId={projectId} />
                            </TabPanel>
                        </Box>
                    </Paper>
                </Fade>
            </Box>
        </Box>
    );
}
