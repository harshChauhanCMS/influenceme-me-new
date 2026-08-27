import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import api from '../services/api';

interface ChatRoom {
  _id: string;
  participants: string[];
  participantRoles: string[];
  chatType: 'influencer-brand' | 'brand-vendor' | 'vendor-influencer';
  isActive: boolean;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Message {
  _id: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

const LiveCommunication: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesDialogOpen, setMessagesDialogOpen] = useState(false);

  const chatTypes = [
    { value: 'influencer-brand', label: 'Influencer ↔ Brand' },
    { value: 'brand-vendor', label: 'Brand ↔ Vendor' },
    { value: 'vendor-influencer', label: 'Vendor ↔ Influencer' },
  ];

  useEffect(() => {
    fetchChatRooms();
  }, [tabValue]);

  const fetchChatRooms = async () => {
    try {
      setLoading(true);
      setError('');
      const chatType = chatTypes[tabValue].value;
      const response = await api.get(`/api/admin/chat/rooms`, {
        params: { chatType, search },
      });
      if (response.data.status && response.data.data) {
        setChatRooms(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load chat rooms');
        setChatRooms([]);
      }
    } catch (err: any) {
      console.error('Error fetching chat rooms:', err);
      setError(err.response?.data?.message || 'Failed to load chat rooms');
      setChatRooms([]);
    } finally {
      setLoading(false);
    }
  };


  const fetchMessages = async (roomId: string) => {
    try {
      setMessagesLoading(true);
      const response = await api.get(`/api/admin/chat/rooms/${roomId}/messages`);
      if (response.data.status && response.data.data) {
        setMessages(response.data.data);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleViewMessages = (room: ChatRoom) => {
    setSelectedRoom(room);
    setMessagesDialogOpen(true);
    fetchMessages(room._id);
  };

  const getChatTypeLabel = (type: string) => {
    return chatTypes.find(ct => ct.value === type)?.label || type;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
        Live Communication
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          {chatTypes.map((type) => (
            <Tab key={type.value} label={type.label} />
          ))}
        </Tabs>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          placeholder="Search conversations..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            fetchChatRooms();
          }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ width: '100%', maxWidth: 400 }}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : chatRooms.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">No conversations found</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Chat Type</strong></TableCell>
                <TableCell><strong>Participants</strong></TableCell>
                <TableCell><strong>Last Message</strong></TableCell>
                <TableCell><strong>Last Updated</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chatRooms.map((room) => (
                <TableRow key={room._id} hover>
                  <TableCell>
                    <Chip
                      label={getChatTypeLabel(room.chatType)}
                      color="primary"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {(room as any).participantsInfo && (room as any).participantsInfo.length > 0
                          ? `${(room as any).participantsInfo[0]?.name || 'Unknown'} ↔ ${(room as any).participantsInfo[1]?.name || 'Unknown'}`
                          : `${room.participantRoles[0]} ↔ ${room.participantRoles[1]}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {room.participantRoles[0]} ↔ {room.participantRoles[1]}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {room.lastMessage ? (
                      <Box>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                          {room.lastMessage.content}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(room.lastMessage.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No messages yet
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(room.updatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleViewMessages(room)}
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Messages Dialog */}
      <Dialog
        open={messagesDialogOpen}
        onClose={() => {
          setMessagesDialogOpen(false);
          setSelectedRoom(null);
          setMessages([]);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <ChatIcon />
            <Typography variant="h6">
              Conversation: {selectedRoom && getChatTypeLabel(selectedRoom.chatType)}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {messagesLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" p={3}>
              No messages in this conversation
            </Typography>
          ) : (
            <Box>
              {messages.map((message) => (
                <Box key={message._id} mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Chip
                      label={message.senderRole}
                      size="small"
                      color={message.senderRole === 'brand' ? 'primary' : 'secondary'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(message.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">{message.content}</Typography>
                  </Paper>
                  {messages.indexOf(message) < messages.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setMessagesDialogOpen(false);
            setSelectedRoom(null);
            setMessages([]);
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LiveCommunication;

