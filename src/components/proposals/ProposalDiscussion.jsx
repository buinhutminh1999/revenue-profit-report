import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Box, Typography, Avatar, Stack, IconButton, CircularProgress,
    TextField, Button, Paper
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Send as SendIcon, Close as CloseIcon, Comment as CommentIcon } from '@mui/icons-material';
import { formatDateSafe } from '../../utils/proposalUtils';

const ProposalDiscussion = ({ proposal, onAddComment, user }) => {
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async () => {
        if (!newComment.trim()) return;

        setSending(true);
        try {
            await onAddComment(proposal.id, newComment, replyTo?.id || null);
            setNewComment('');
            setReplyTo(null);
            setTimeout(scrollToBottom, 100);
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
    const threads = useMemo(() => {
        if (!proposal?.comments) return [];
        const roots = proposal.comments.filter(c => !c.replyToId);
        const replies = proposal.comments.filter(c => c.replyToId);

        return roots.map(root => {
            const rootReplies = replies.filter(r => r.replyToId === root.id);
            rootReplies.sort((a, b) => new Date(a.time) - new Date(b.time));
            return { ...root, replies: rootReplies };
        }).sort((a, b) => new Date(a.time) - new Date(b.time));
    }, [proposal?.comments]);

    const renderCommentItem = (msg, isReply = false) => {
        const isMe = msg.userEmail === user?.email;
        const replyingTo = msg.replyToId ? proposal.comments.find(c => c.id === msg.replyToId) : null;

        return (
            <Box key={msg.id || Math.random()} sx={{ display: 'flex', gap: 1, mb: 1, flexDirection: isMe && !isReply ? 'row-reverse' : 'row' }}>
                {!isMe && (
                    <Avatar sx={{ width: isReply ? 24 : 32, height: isReply ? 24 : 32, fontSize: 12, bgcolor: 'secondary.main' }}>
                        {msg.userName?.charAt(0) || '?'}
                    </Avatar>
                )}
                <Box sx={{ maxWidth: '85%' }}>
                    <Box
                        sx={{
                            bgcolor: isMe ? 'primary.light' : '#f0f2f5',
                            color: isMe ? 'primary.contrastText' : 'text.primary',
                            p: 1.5, borderRadius: 3,
                            borderTopLeftRadius: !isMe && !isReply ? 4 : 16,
                            borderTopRightRadius: isMe && !isReply ? 4 : 16,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        <Stack spacing={0.5}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                <Typography variant="caption" fontWeight="bold" sx={{ opacity: 0.9 }}>{msg.userName}</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.65rem' }}>{formatDateSafe(msg.time)}</Typography>
                            </Stack>
                            {replyingTo && (
                                <Typography variant="caption" sx={{ opacity: 0.8, fontStyle: 'italic', fontSize: '0.7rem' }}>
                                    Trả lời <b>{replyingTo.userName}</b>
                                </Typography>
                            )}
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.9rem' }}>
                                {msg.content}
                            </Typography>
                        </Stack>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', px: 1, mt: 0.5 }}>
                        <Typography
                            variant="caption"
                            fontWeight="bold"
                            color="text.secondary"
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}
                            onClick={() => setReplyTo({ id: msg.id, userName: msg.userName })}
                        >
                            Trả lời
                        </Typography>
                    </Box>
                </Box>
            </Box>
        );
    };

    return (
        <Paper
            elevation={0}
            variant="outlined"
            sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: 'background.paper',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.1), color: 'secondary.main', width: 32, height: 32 }}>
                    <CommentIcon fontSize="small" />
                </Avatar>
                <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                    Thảo luận / Góp ý
                </Typography>
            </Stack>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 400, mb: 2, pr: 1 }}>
                {!threads || threads.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 150, color: 'text.secondary', opacity: 0.7 }}>
                        <CommentIcon sx={{ fontSize: 40, mb: 1, color: 'action.disabled' }} />
                        <Typography variant="body2" fontStyle="italic">Chưa có thảo luận nào.</Typography>
                        <Typography variant="caption">Hãy để lại ý kiến của bạn!</Typography>
                    </Box>
                ) : (
                    <Stack spacing={2}>
                        {threads.map((thread) => (
                            <Box key={thread.id || Math.random()}>
                                {renderCommentItem(thread)}
                                {thread.replies && thread.replies.length > 0 && (
                                    <Box sx={{ ml: 5, mt: 1, pl: 1, borderLeft: '2px solid #f0f2f5' }}>
                                        {thread.replies.map(reply => renderCommentItem(reply, true))}
                                    </Box>
                                )}
                            </Box>
                        ))}
                        <div ref={messagesEndRef} />
                    </Stack>
                )}
            </Box>

            <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
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
                <Stack direction="row" spacing={1}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder={replyTo ? `Trả lời ${replyTo.userName}...` : "Nhập nội dung..."}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={handleKeyPress}
                        multiline
                        maxRows={3}
                        disabled={sending}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <IconButton
                        color="primary"
                        onClick={handleSend}
                        disabled={!newComment.trim() || sending}
                        sx={{
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2) },
                            width: 40, height: 40
                        }}
                    >
                        {sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
                    </IconButton>
                </Stack>
            </Box>
        </Paper>
    );
};

export default ProposalDiscussion;
