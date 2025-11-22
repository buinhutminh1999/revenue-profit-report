import React from "react";
import { Card, CardActionArea, CardContent, Stack, Box, Collapse, Divider, CardActions, Tooltip, Button } from "@mui/material";
import { History } from "@mui/icons-material";
import { motion } from "framer-motion";

const WorkflowCard = ({
    isHighlighted,
    isExpanded,
    onExpandClick,
    onCardClick,
    headerLeft,
    headerRight,
    title,
    body,
    timeline,
    footer,
}) => {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card
                variant="outlined"
                sx={{
                    borderRadius: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                    '&:hover': {
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        borderColor: 'primary.main',
                    },
                    borderLeft: isHighlighted ? '4px solid' : '1px solid',
                    borderColor: isHighlighted ? 'primary.main' : 'divider',
                }}
            >
                {/* Phần nội dung chính của thẻ */}
                <CardActionArea onClick={onCardClick} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    <CardContent sx={{ flexGrow: 1, pb: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                            {headerLeft}
                            {headerRight}
                        </Stack>

                        {title}

                        <Box sx={{ mt: 2, flexGrow: 1 }}>
                            {body}
                        </Box>
                    </CardContent>
                </CardActionArea>

                {/* Phần timeline có thể thu gọn */}
                {timeline && (
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Divider />
                        <Box p={2}>
                            {timeline}
                        </Box>
                    </Collapse>
                )}

                {/* Phần chân thẻ chứa các nút hành động */}
                <Divider />
                <CardActions sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                    <Tooltip title={isExpanded ? "Ẩn lịch sử" : "Xem lịch sử ký duyệt"}>
                        <Button
                            size="small"
                            onClick={onExpandClick}
                            startIcon={<History sx={{ fontSize: 16 }} />}
                            sx={{ color: 'text.secondary' }}
                        >
                            Lịch sử
                        </Button>
                    </Tooltip>
                    <Box sx={{ flexGrow: 1 }} />
                    {footer}
                </CardActions>
            </Card>
        </motion.div>
    );
};

export default WorkflowCard;
