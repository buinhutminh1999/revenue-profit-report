import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, Typography, Avatar, Stack,
    IconButton, Divider, CircularProgress
} from '@mui/material';
import { Send as SendIcon, Close as CloseIcon } from '@mui/icons-material';
import { formatDateSafe } from '../../utils/proposalUtils';

const CommentDialog = ({ open, onClose, proposal, onAddComment, user }) => {
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState(null); // { id, userName }
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (open) {
            setTimeout(scrollToBottom, 100);
        }
    }, [open, proposal?.comments]);

    const handleSend = async () => {
        if (!newComment.trim()) return;

        setSending(true);
        try {
            await onAddComment(proposal.id, newComment, replyTo?.id || null);
            setNewComment('');
            setReplyTo(null);
        } catch (error) {
            console.error("Failed to send comment:", error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Group comments into threads
    const threads = React.useMemo(() => {
        if (!proposal?.comments) return [];
        const roots = proposal.comments.filter(c => !c.replyToId);
        const replies = proposal.comments.filter(c => c.replyToId);

        return roots.map(root => {
            // Find replies for this root, OR replies to replies of this root (flattened for now, or 1-level deep)
            // For simple FB style, usually 1 level of nesting is shown
            const rootReplies = replies.filter(r => r.replyToId === root.id || (r.replyToId && replies.find(parent => parent.id === r.replyToId && parent.replyToId === root.id)));
            // sort by time
            rootReplies.sort((a, b) => new Date(a.time) - new Date(b.time));
            return { ...root, replies: rootReplies };
        }).sort((a, b) => new Date(a.time) - new Date(b.time));
    }, [proposal?.comments]);


    if (!proposal) return null;

    const renderCommentItem = (msg, isReply = false) => {
        const isMe = msg.userEmail === user?.email;
        const replyingTo = msg.replyToId ? proposal.comments.find(c => c.id === msg.replyToId) : null;

        return (
            <Box key={msg.id || Math.random()} sx={{ display: 'flex', gap: 1, mb: 1, flexDirection: isMe && !isReply ? 'row-reverse' : 'row' }}>
                {!isMe && (
                    <Avatar
                        sx={{
                            width: isReply ? 24 : 32, height: isReply ? 24 : 32, fontSize: 12,
                            bgcolor: isMe ? 'primary.main' : 'secondary.main'
                        }}
                    >
                        {msg.userName?.charAt(0) || '?'}
                    </Avatar>
                )}

                <Box sx={{ maxWidth: '80%' }}>
                    <Box
                        sx={{
                            bgcolor: isMe ? 'primary.light' : '#f0f2f5',
                            color: isMe ? 'primary.contrastText' : 'text.primary',
                            p: 1.5,
                            borderRadius: 4,
                            borderTopLeftRadius: !isMe && !isReply ? 4 : 16,
                            borderTopRightRadius: isMe && !isReply ? 4 : 16,
                            position: 'relative'
                        }}
                    >
                        <Stack spacing={0.5}>
                            <Typography variant="caption" fontWeight="bold">
                                {msg.userName}
                            </Typography>

                            {/* Explicit "Replying to" indicator */}
                            {replyingTo && (
                                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mb: 0.5, fontStyle: 'italic', fontSize: '0.7rem' }}>
                                    <span style={{ opacity: 0.7 }}>Trả lời </span>
                                    <b>{replyingTo.userName}</b>
                                </Typography>
                            )}

                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {msg.content}
                            </Typography>
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={2} sx={{ mt: 0.5, px: 1 }} justifyContent={isMe ? 'flex-end' : 'flex-start'}>
                        <Typography variant="caption" color="text.secondary">
                            {formatDateSafe(msg.time)}
                        </Typography>
                        <Typography
                            variant="caption"
                            fontWeight="bold"
                            color="text.secondary"
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            onClick={() => setReplyTo({ id: msg.id, userName: msg.userName })}
                        >
                            Trả lời
                        </Typography>
                    </Stack>
                </Box>
            </Box>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            scroll="paper"
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box component="span" sx={{ fontSize: '1.25rem', fontWeight: 500 }}>Thảo luận / Góp ý</Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
                {/* Context Header */}
                <Box sx={{ mt: 1, p: 1, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #90caf9' }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                        #{proposal.code}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {proposal.content}
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ bgcolor: 'white', p: 2, display: 'flex', flexDirection: 'column', height: '50vh' }}>
                {!threads || threads.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'text.secondary' }}>
                        <Typography variant="body2" fontStyle="italic">Chưa có bình luận nào. Hãy bắt đầu thảo luận!</Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {threads.map((thread) => (
                            <Box key={thread.id || Math.random()}>
                                {renderCommentItem(thread)}
                                {/* Replies */}
                                {thread.replies && thread.replies.length > 0 && (
                                    <Box sx={{ ml: 5, mt: 1, borderLeft: '2px solid #f0f2f5', pl: 1 }}>
                                        {thread.replies.map(reply => renderCommentItem(reply, true))}
                                    </Box>
                                )}
                            </Box>
                        ))}
                        <div ref={messagesEndRef} />
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: 'background.paper', flexDirection: 'column', alignItems: 'stretch' }}>
                {replyTo && (
                    <Box sx={{ mb: 1, p: 1, bgcolor: '#f0f2f5', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                            Đang trả lời <b>{replyTo.userName}</b>...
                        </Typography>
                        <IconButton size="small" onClick={() => setReplyTo(null)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                )}
                <Stack direction="row" spacing={1} width="100%">
                    <TextField
                        fullWidth
                        size="small"
                        placeholder={replyTo ? `Trả lời ${replyTo.userName}...` : "Nhập nội dung thảo luận..."}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={handleKeyPress}
                        multiline
                        maxRows={3}
                        disabled={sending}
                        autoFocus
                        sx={{ bgcolor: '#f0f2f5', '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, borderRadius: 2 }}
                    />
                    <IconButton
                        color="primary"
                        onClick={handleSend}
                        disabled={!newComment.trim() || sending}
                        sx={{ color: 'primary.main' }}
                    >
                        {sending ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                    </IconButton>
                </Stack>
            </DialogActions>
        </Dialog>
    );
};

export default CommentDialog;
