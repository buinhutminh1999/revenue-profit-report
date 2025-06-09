import React, { useState } from "react";
import { Box, Paper, Typography, Tabs, Tab, Avatar } from "@mui/material";
import { useAuth } from "../App";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";

// Import các component con cho từng Tab (sẽ tạo ở bước 2 và 3)
import ProfileTab from "../components/ProfileTab"; 
import SecurityTab from "../components/SecurityTab";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-profile-tabpanel-${index}`}
      aria-labelledby={`user-profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

export default function UserProfile() {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (!user) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography>Vui lòng đăng nhập để xem thông tin.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 4 } }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 800,
          mx: "auto",
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 4,
          overflow: 'hidden'
        }}
      >
        {/* Phần Header của Profile */}
        <Box sx={{ p: 3, bgcolor: 'action.hover' }}>
           <Box display="flex" alignItems="center" gap={3}>
             <Avatar
                alt={user.displayName || "User"}
                src={user.photoURL}
                sx={{ width: 80, height: 80, border: '2px solid white' }}
             />
             <Box>
                <Typography variant="h5" fontWeight={700}>
                  {user.displayName || "Người dùng"}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {user.email}
                </Typography>
             </Box>
           </Box>
        </Box>

        {/* Phần Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="User profile tabs"
            variant="fullWidth"
          >
            <Tab icon={<PersonIcon />} iconPosition="start" label="Hồ sơ" />
            <Tab icon={<LockIcon />} iconPosition="start" label="Bảo mật" />
          </Tabs>
        </Box>

        {/* Nội dung các Tabs */}
        <TabPanel value={tabValue} index={0}>
          <ProfileTab />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <SecurityTab />
        </TabPanel>
      </Paper>
    </Box>
  );
}