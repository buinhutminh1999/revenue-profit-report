import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Box, Typography, Avatar, Stack, IconButton, CircularProgress,
    InputBase, Paper, Fade, Tooltip
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Send as SendIcon, Close as CloseIcon, Comment as CommentIcon, Reply as ReplyIcon } from '@mui/icons-material';
import { formatDateSafe } from '../../utils/proposalUtils';

const ProposalDiscussion = ({ proposal, onAddComment, user }) => {
    const theme = useTheme();
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [proposal?.comments]);

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

        // Dynamic colors for avatar
        const stringToColor = (string) => {
            let hash = 0;
            for (let i = 0; i < string.length; i++) {
                hash = string.charCodeAt(i) + ((hash << 5) - hash);
            }
            let color = '#';
            for (let i = 0; i < 3; i++) {
                const value = (hash >> (i * 8)) & 0xFF;
                color += ('00' + value.toString(16)).substr(-2);
            }
            return color;
        }
        const avatarColor = stringToColor(msg.userName || 'User');

        return (
            <Box key={msg.id || Math.random()}
                sx={{
                    display: 'flex',
                    gap: 1, // Reduced gap
                    mb: 1.5,
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    alignItems: 'flex-end', // Align avatar to bottom
                    pl: isMe ? 5 : 0,
                    pr: isMe ? 0 : 5
                }}
            >
                {!isMe && (
                    <Tooltip title={msg.userName}>
                        <Avatar
                            sx={{
                                width: 28, height: 28,
                                fontSize: '0.75rem',
                                bgcolor: avatarColor,
                                mb: 0.5,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            {msg.userName?.charAt(0) || '?'}
                        </Avatar>
                    </Tooltip>
                )}

                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                }}>
                    {/* Name (Only for others) */}
                    {!isMe && !isReply && (
                        <Typography variant="caption" sx={{ ml: 1, mb: 0.5, color: 'text.secondary', fontSize: '0.7rem' }}>
                            {msg.userName}
                        </Typography>
                    )}

                    {/* Chat Bubble */}
                    <Box
                        sx={{
                            position: 'relative',
                            bgcolor: isMe ? 'primary.main' : '#f0f2f5', // Modern gray
                            color: isMe ? '#fff' : 'text.primary',
                            px: 2, py: 1.25,
                            borderRadius: 2.5,
                            borderBottomRightRadius: isMe ? 4 : 20,
                            borderBottomLeftRadius: !isMe ? 4 : 20,
                            boxShadow: isMe ? '0 2px 8px rgba(33, 150, 243, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {/* Reply Context */}
                        {replyingTo && (
                            <Box sx={{
                                mb: 0.5, pl: 1, borderLeft: '2px solid',
                                borderColor: isMe ? 'rgba(255,255,255,0.5)' : 'primary.main',
                                fontSize: '0.75rem', opacity: 0.8
                            }}>
                                <Typography variant="caption" display="block" fontWeight="bold">
                                    {replyingTo.userName}
                                </Typography>
                                <Typography variant="caption" noWrap sx={{ maxWidth: 150, display: 'block' }}>
                                    {replyingTo.content}
                                </Typography>
                            </Box>
                        )}

                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.92rem', lineHeight: 1.4 }}>
                            {msg.content}
                        </Typography>
                    </Box>

                    {/* Meta: Time & Reply Action */}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, px: 0.5, opacity: 0.7 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                            {formatDateSafe(msg.time)}
                        </Typography>
                        <Typography
                            variant="caption"
                            fontWeight="600"
                            sx={{
                                cursor: 'pointer', fontSize: '0.65rem',
                                '&:hover': { textDecoration: 'underline', color: 'primary.main', opacity: 1 }
                            }}
                            onClick={() => setReplyTo({ id: msg.id, userName: msg.userName, content: msg.content })}
                        >
                            Trả lời
                        </Typography>
                    </Stack>
                </Box>
            </Box>
        );
    };

    return (
        <Paper
            elevation={0}
            sx={{
                height: 480, // Fixed height or max height
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: '#fff',
                overflow: 'hidden'
            }}
        >
            {/* Messages Area */}
            <Box sx={{
                flexGrow: 1,
                overflowY: 'auto',
                p: 2,
                bgcolor: '#fff',
                backgroundImage: 'radial-gradient(#f0f2f5 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}>
                {(!threads || threads.length === 0) ? (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', opacity: 0.6 }}>
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '50%', mb: 2 }}>
                            <CommentIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                        </Box>
                        <Typography variant="body2" fontWeight={500}>Chưa có thảo luận nào</Typography>
                        <Typography variant="caption">Bắt đầu cuộc trò chuyện ngay!</Typography>
                    </Box>
                ) : (
                    <Box>
                        {threads.map((thread) => (
                            <Box key={thread.id || Math.random()}>
                                {renderCommentItem(thread)}
                                {thread.replies && thread.replies.length > 0 && (
                                    <Box sx={{ mt: 0.5 }}>
                                        {thread.replies.map(reply => renderCommentItem(reply, true))}
                                    </Box>
                                )}
                            </Box>
                        ))}
                        <div ref={messagesEndRef} />
                    </Box>
                )}
            </Box>

            {/* Input Area */}
            <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}>
                {replyTo && (
                    <Fade in={true}>
                        <Box sx={{
                            mb: 1, p: 1, pl: 1.5,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            borderRadius: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderLeft: `3px solid ${theme.palette.primary.main}`
                        }}>
                            <Box sx={{ overflow: 'hidden' }}>
                                <Typography variant="caption" color="primary" fontWeight="bold" display="flex" alignItems="center">
                                    <ReplyIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                    Trả lời {replyTo.userName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap display="block">
                                    {replyTo.content}
                                </Typography>
                            </Box>
                            <IconButton size="small" onClick={() => setReplyTo(null)}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    </Fade>
                )}

                <Paper
                    elevation={0}
                    component="form"
                    sx={{
                        p: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: '#f5f7f9', // Light gray background for input
                        borderRadius: 3,
                        border: '1px solid transparent',
                        transition: 'all 0.2s',
                        '&:focus-within': {
                            bgcolor: '#fff',
                            borderColor: 'primary.main',
                            boxShadow: '0 0 0 2px rgba(33, 150, 243, 0.1)'
                        }
                    }}
                >
                    <InputBase
                        sx={{ ml: 1, flex: 1, fontSize: '0.95rem' }}
                        placeholder="Nhập bình luận..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={handleKeyPress}
                        multiline
                        maxRows={3}
                        disabled={sending}
                    />
                    <IconButton
                        color="primary"
                        onClick={handleSend}
                        disabled={!newComment.trim() || sending}
                        sx={{
                            p: 1,
                            transition: 'all 0.2s',
                            transform: newComment.trim() ? 'scale(1)' : 'scale(0.9)',
                            opacity: newComment.trim() ? 1 : 0.6
                        }}
                    >
                        {sending ? <CircularProgress size={24} /> : <SendIcon />}
                    </IconButton>
                </Paper>
            </Box>
        </Paper>
    );
};

export default ProposalDiscussion;
