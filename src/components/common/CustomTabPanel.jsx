import React from 'react';
import { Box } from '@mui/material';

/**
 * CustomTabPanel - A simple tab panel wrapper for MUI Tabs with lazy rendering
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Tab content
 * @param {number} props.value - Current tab index
 * @param {number} props.index - This panel's index
 * @param {boolean} props.keepMounted - Keep content mounted after first visit (default: false)
 */
export default function CustomTabPanel({ children, value, index, keepMounted = false, ...other }) {
    const [hasBeenMounted, setHasBeenMounted] = React.useState(false);
    const isActive = value === index;

    React.useEffect(() => {
        if (isActive && !hasBeenMounted) {
            setHasBeenMounted(true);
        }
    }, [isActive, hasBeenMounted]);

    // Only render if active, or if keepMounted and has been mounted before
    const shouldRender = isActive || (keepMounted && hasBeenMounted);

    return (
        <div
            role="tabpanel"
            hidden={!isActive}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {shouldRender && (
                <Box sx={{ p: 3, display: isActive ? 'block' : 'none' }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

/**
 * Helper function for tab a11y props
 * @param {number} index - Tab index
 * @returns {Object} - a11y props for tab
 */
export function a11yProps(index) {
    return {
        id: `tab-${index}`,
        'aria-controls': `tabpanel-${index}`,
    };
}
