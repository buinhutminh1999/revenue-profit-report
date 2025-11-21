import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';

const FeedbackDialog = ({ open, onClose }) => {
  const [feedback, setFeedback] = useState('');
  
  const handleSubmit = () => {
    // Tích hợp gửi phản hồi (Analytics hoặc API backend)
    console.log("Feedback submitted:", feedback);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Phản hồi người dùng</DialogTitle>
      <DialogContent>
        <TextField
          label="Phản hồi của bạn"
          multiline
          rows={4}
          variant="outlined"
          fullWidth
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Gửi
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
