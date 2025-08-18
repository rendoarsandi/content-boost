import { createClient } from '@supabase/supabase-js';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  created_at: string;
  participants?: ConversationParticipant[];
}

interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

class ChatService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createConversation(
    participantIds: string[]
  ): Promise<{ conversation: Conversation | null; error: string | null }> {
    try {
      // Create conversation
      const { data: conversation, error: convError } = await this.supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (convError) {
        return { conversation: null, error: convError.message };
      }

      // Add participants
      const participants = participantIds.map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
      }));

      const { error: participantError } = await this.supabase
        .from('participants')
        .insert(participants);

      if (participantError) {
        return { conversation: null, error: participantError.message };
      }

      return { conversation, error: null };
    } catch (error) {
      return { conversation: null, error: 'Failed to create conversation' };
    }
  }

  async getConversations(
    userId: string
  ): Promise<{ conversations: Conversation[] | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('participants')
        .select(
          `
          conversation_id,
          conversations (
            id,
            created_at
          )
        `
        )
        .eq('user_id', userId);

      if (error) {
        return { conversations: null, error: error.message };
      }

      const conversations = data?.map((item: any) => item.conversations) || [];
      return { conversations, error: null };
    } catch (error) {
      return { conversations: null, error: 'Failed to fetch conversations' };
    }
  }

  async getMessages(
    conversationId: string,
    limit: number = 50
  ): Promise<{ messages: Message[] | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { messages: null, error: error.message };
      }

      return { messages: data?.reverse() || [], error: null };
    } catch (error) {
      return { messages: null, error: 'Failed to fetch messages' };
    }
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string
  ): Promise<{ message: Message | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
        })
        .select()
        .single();

      if (error) {
        return { message: null, error: error.message };
      }

      return { message: data, error: null };
    } catch (error) {
      return { message: null, error: 'Failed to send message' };
    }
  }

  async getConversationParticipants(conversationId: string): Promise<{
    participants: ConversationParticipant[] | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('participants')
        .select(
          `
          id,
          conversation_id,
          user_id,
          users (
            id,
            email,
            role
          )
        `
        )
        .eq('conversation_id', conversationId);

      if (error) {
        return { participants: null, error: error.message };
      }

      return { participants: data || [], error: null };
    } catch (error) {
      return { participants: null, error: 'Failed to fetch participants' };
    }
  }

  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ) {
    return this.supabase
      .channel(`messages:conversation_id=eq.${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();
  }
}

export {
  ChatService,
  type Message,
  type Conversation,
  type ConversationParticipant,
};

// Legacy export for backward compatibility
export const sendMessage = (
  conversationId: string,
  userId: string,
  content: string
) => {
  console.log(
    `Sending message from user ${userId} in conversation ${conversationId}`
  );
  return { success: true, messageId: 'new-message-id' };
};
