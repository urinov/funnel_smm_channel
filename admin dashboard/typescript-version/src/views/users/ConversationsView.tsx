'use client'

import { useState, useRef, useEffect } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import { styled } from '@mui/material/styles'
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  Star,
  Archive,
} from 'lucide-react'

import { Badge, Button, EmptyState } from '@/components/ui'

interface Message {
  id: string
  content: string
  type: 'incoming' | 'outgoing'
  timestamp: string
  status?: 'sent' | 'delivered' | 'read'
}

interface Conversation {
  id: string
  user: {
    name: string
    telegramId: string
    avatar?: string
    isPaid: boolean
  }
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isStarred: boolean
  messages: Message[]
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    user: {
      name: 'Aziz Karimov',
      telegramId: '123456789',
      isPaid: true,
    },
    lastMessage: "Assalomu alaykum! Kursga qanday yozilish mumkin?",
    lastMessageTime: '2 min ago',
    unreadCount: 2,
    isStarred: false,
    messages: [
      {
        id: 'm1',
        content: "Assalomu alaykum! Kursga qanday yozilish mumkin?",
        type: 'incoming',
        timestamp: '10:30 AM',
      },
      {
        id: 'm2',
        content: "Va alaykum assalom! Kursga yozilish uchun /start buyrug'ini bosing",
        type: 'outgoing',
        timestamp: '10:32 AM',
        status: 'read',
      },
      {
        id: 'm3',
        content: "Rahmat! Lekin to'lov qilishda muammo bor",
        type: 'incoming',
        timestamp: '10:35 AM',
      },
    ],
  },
  {
    id: '2',
    user: {
      name: 'Nodira Aliyeva',
      telegramId: '456789123',
      isPaid: false,
    },
    lastMessage: "Lesson 3 ochilmayapti, yordam bera olasizmi?",
    lastMessageTime: '15 min ago',
    unreadCount: 1,
    isStarred: true,
    messages: [
      {
        id: 'm1',
        content: "Lesson 3 ochilmayapti, yordam bera olasizmi?",
        type: 'incoming',
        timestamp: '10:15 AM',
      },
    ],
  },
  {
    id: '3',
    user: {
      name: 'Sardor Toshev',
      telegramId: '321654987',
      isPaid: true,
    },
    lastMessage: "Kurs juda zo'r ekan! Rahmat!",
    lastMessageTime: '1 hour ago',
    unreadCount: 0,
    isStarred: false,
    messages: [
      {
        id: 'm1',
        content: "Kurs juda zo'r ekan! Rahmat!",
        type: 'incoming',
        timestamp: '9:30 AM',
      },
      {
        id: 'm2',
        content: "Rahmat! Sizga ham omad! 🎉",
        type: 'outgoing',
        timestamp: '9:35 AM',
        status: 'read',
      },
    ],
  },
]

const Container = styled(Box)(({ theme }) => ({
  display: 'flex',
  height: 'calc(100vh - 180px)',
  minHeight: 500,
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
}))

const ConversationList = styled(Box)(({ theme }) => ({
  width: 360,
  borderRight: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',

  [theme.breakpoints.down('md')]: {
    width: '100%',
  },
}))

const ConversationItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  cursor: 'pointer',
  transition: 'background-color 150ms ease',
  backgroundColor: active
    ? theme.palette.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.15)'
      : 'rgba(99, 102, 241, 0.08)'
    : 'transparent',
  borderBottom: `1px solid ${theme.palette.divider}`,

  '&:hover': {
    backgroundColor: active
      ? theme.palette.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.12)'
      : theme.palette.action.hover,
  },
}))

const ChatArea = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
}))

const ChatHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '16px 20px',
  borderBottom: `1px solid ${theme.palette.divider}`,
}))

const MessagesArea = styled(Box)(() => ({
  flex: 1,
  overflowY: 'auto',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}))

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'type',
})<{ type: 'incoming' | 'outgoing' }>(({ theme, type }) => ({
  maxWidth: '70%',
  padding: '10px 14px',
  borderRadius: 12,
  alignSelf: type === 'outgoing' ? 'flex-end' : 'flex-start',
  backgroundColor:
    type === 'outgoing'
      ? theme.palette.primary.main
      : theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(0,0,0,0.04)',
  color: type === 'outgoing' ? '#FFFFFF' : theme.palette.text.primary,
  borderBottomRightRadius: type === 'outgoing' ? 4 : 12,
  borderBottomLeftRadius: type === 'incoming' ? 4 : 12,
}))

const InputArea = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '16px 20px',
  borderTop: `1px solid ${theme.palette.divider}`,
}))

export default function ConversationsView() {
  const [conversations] = useState<Conversation[]>(mockConversations)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedConversation?.messages])

  const filteredConversations = conversations.filter(
    (c) =>
      c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return

    // API call to send message
    console.log('Sending message:', newMessage, 'to:', selectedConversation.user.telegramId)
    setNewMessage('')
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return <Check size={14} />
      case 'delivered':
        return <CheckCheck size={14} />
      case 'read':
        return <CheckCheck size={14} color="#10B981" />
      default:
        return <Clock size={14} />
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Conversations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {totalUnread > 0 ? `${totalUnread} unread messages` : 'All caught up!'}
        </Typography>
      </Box>

      <Container>
        {/* Conversation List */}
        <ConversationList>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} style={{ opacity: 0.5 }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                },
              }}
            />
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                active={selectedConversation?.id === conv.id}
                onClick={() => setSelectedConversation(conv)}
              >
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: conv.user.isPaid ? 'success.main' : 'primary.main',
                    }}
                  >
                    {conv.user.name.split(' ').map((n) => n[0]).join('')}
                  </Avatar>
                  {conv.isStarred && (
                    <Star
                      size={12}
                      fill="#F59E0B"
                      color="#F59E0B"
                      style={{ position: 'absolute', bottom: -2, right: -2 }}
                    />
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {conv.user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {conv.lastMessageTime}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{ flex: 1, fontWeight: conv.unreadCount > 0 ? 600 : 400 }}
                    >
                      {conv.lastMessage}
                    </Typography>
                    {conv.unreadCount > 0 && (
                      <Badge variant="solid" color="primary" size="sm">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </Box>
                </Box>
              </ConversationItem>
            ))}
          </Box>
        </ConversationList>

        {/* Chat Area */}
        <ChatArea>
          {selectedConversation ? (
            <>
              <ChatHeader>
                <Avatar
                  sx={{
                    bgcolor: selectedConversation.user.isPaid ? 'success.main' : 'primary.main',
                  }}
                >
                  {selectedConversation.user.name.split(' ').map((n) => n[0]).join('')}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedConversation.user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{selectedConversation.user.telegramId}
                    {selectedConversation.user.isPaid && ' • Premium'}
                  </Typography>
                </Box>
                <IconButton size="small">
                  <Star
                    size={20}
                    fill={selectedConversation.isStarred ? '#F59E0B' : 'none'}
                    color={selectedConversation.isStarred ? '#F59E0B' : 'currentColor'}
                  />
                </IconButton>
                <IconButton size="small">
                  <Archive size={20} />
                </IconButton>
                <IconButton size="small">
                  <MoreVertical size={20} />
                </IconButton>
              </ChatHeader>

              <MessagesArea>
                {selectedConversation.messages.map((msg) => (
                  <MessageBubble key={msg.id} type={msg.type}>
                    <Typography variant="body2">{msg.content}</Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 0.5,
                        mt: 0.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ opacity: 0.7, fontSize: '0.6875rem' }}
                      >
                        {msg.timestamp}
                      </Typography>
                      {msg.type === 'outgoing' && getStatusIcon(msg.status)}
                    </Box>
                  </MessageBubble>
                ))}
                <div ref={messagesEndRef} />
              </MessagesArea>

              <InputArea>
                <IconButton size="small">
                  <Paperclip size={20} />
                </IconButton>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  InputProps={{
                    sx: {
                      borderRadius: 3,
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    },
                  }}
                />
                <Button
                  variant="solid"
                  colorScheme="primary"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send size={18} />
                </Button>
              </InputArea>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState
                iconType="inbox"
                title="Select a conversation"
                description="Choose a conversation from the list to start chatting"
              />
            </Box>
          )}
        </ChatArea>
      </Container>
    </Box>
  )
}
