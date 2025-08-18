'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChatService,
  Message,
  Conversation,
  ConversationParticipant,
} from '@repo/chat';
import { Button } from './button';
import { Input } from './input';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { ScrollArea } from './scroll-area';
import { Avatar, AvatarFallback } from './avatar';
import { Badge } from './badge';

interface ChatProps {
  userId: string;
  supabaseUrl: string;
  supabaseKey: string;
}

interface ChatComponentState {
  conversations: Conversation[];
  selectedConversation: string | null;
  messages: Message[];
  participants: ConversationParticipant[];
  newMessage: string;
  loading: boolean;
  error: string | null;
}

export function Chat({ userId, supabaseUrl, supabaseKey }: ChatProps) {
  const [state, setState] = useState<ChatComponentState>({
    conversations: [],
    selectedConversation: null,
    messages: [],
    participants: [],
    newMessage: '',
    loading: true,
    error: null,
  });

  const chatService = useRef(new ChatService(supabaseUrl, supabaseKey));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  useEffect(() => {
    loadConversations();
  }, [userId]);

  useEffect(() => {
    if (state.selectedConversation) {
      loadMessages(state.selectedConversation);
      loadParticipants(state.selectedConversation);
      subscribeToMessages(state.selectedConversation);
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [state.selectedConversation]);

  const loadConversations = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { conversations, error } =
      await chatService.current.getConversations(userId);

    if (error) {
      setState(prev => ({ ...prev, error, loading: false }));
    } else {
      setState(prev => ({
        ...prev,
        conversations: conversations || [],
        loading: false,
      }));
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { messages, error } =
      await chatService.current.getMessages(conversationId);

    if (error) {
      setState(prev => ({ ...prev, error }));
    } else {
      setState(prev => ({ ...prev, messages: messages || [] }));
    }
  };

  const loadParticipants = async (conversationId: string) => {
    const { participants, error } =
      await chatService.current.getConversationParticipants(conversationId);

    if (error) {
      setState(prev => ({ ...prev, error }));
    } else {
      setState(prev => ({ ...prev, participants: participants || [] }));
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = chatService.current.subscribeToMessages(
      conversationId,
      (newMessage: Message) => {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, newMessage],
        }));
      }
    );
  };

  const handleSendMessage = async () => {
    if (!state.newMessage.trim() || !state.selectedConversation) return;

    const content = state.newMessage.trim();
    setState(prev => ({ ...prev, newMessage: '' }));

    const { message, error } = await chatService.current.sendMessage(
      state.selectedConversation,
      userId,
      content
    );

    if (error) {
      setState(prev => ({ ...prev, error }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'creator':
        return 'bg-blue-100 text-blue-800';
      case 'promoter':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Conversations</h2>
        </div>
        <ScrollArea className="flex-1">
          {state.conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations found
            </div>
          ) : (
            <div className="space-y-1">
              {state.conversations.map(conversation => (
                <button
                  key={conversation.id}
                  onClick={() =>
                    setState(prev => ({
                      ...prev,
                      selectedConversation: conversation.id,
                      messages: [],
                      participants: [],
                    }))
                  }
                  className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                    state.selectedConversation === conversation.id
                      ? 'bg-blue-50 border-r-2 border-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">💬</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Conversation
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(conversation.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {state.selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Chat</h3>
                <div className="flex space-x-1">
                  {state.participants.map(participant => (
                    <Badge
                      key={participant.id}
                      className={getRoleColor(participant.user?.role || 'user')}
                    >
                      {participant.user?.role || 'user'}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {state.messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === userId
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender_id === userId
                            ? 'text-blue-100'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <Input
                  value={state.newMessage}
                  onChange={e =>
                    setState(prev => ({ ...prev, newMessage: e.target.value }))
                  }
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!state.newMessage.trim()}
                >
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="absolute top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {state.error}
        </div>
      )}
    </div>
  );
}
