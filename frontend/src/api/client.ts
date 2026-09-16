import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Attach Authorization Bearer token automatically
apiClient.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('tg_auth_token');
  if (!token && !config.url?.includes('/auth/login')) {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'admin@telegram.local',
        password: 'Password123!',
      });
      if (res.data?.token) {
        token = res.data.token;
        if (token) {
          localStorage.setItem('tg_auth_token', token as string);
        }
      }
    } catch (err) {
      console.error('Auto login failed', err);
    }
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for auth expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tg_auth_token');
    }
    return Promise.reject(error);
  }
);

// Types
export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'manager' | 'support_agent';
  is_active: boolean;
  max_telegram_accounts: number;
  max_campaigns: number;
  daily_message_limit: number;
  telegram_accounts_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface UserManagementData {
  users: UserAccount[];
  system_limit: number;
  total_users: number;
  active_users: number;
  is_limit_reached: boolean;
}

export interface TelegramAccount {
  id: string;
  alias: string;
  phone_masked: string;
  status: 'connected' | 'disconnected' | 'expired';
  telegram_id?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  conversations_count?: number;
  campaigns_count?: number;
  last_connected_at?: string;
  created_at: string;
}

export interface TelegramUser {
  id: string;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_blacklisted: boolean;
  full_name?: string;
}

export interface TelegramMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  sender_id: number;
  message_type: 'text' | 'photo' | 'video' | 'voice' | 'audio' | 'sticker' | 'gif' | 'document';
  content?: string;
  media_path?: string;
  status: 'received' | 'pending' | 'sent' | 'failed';
  telegram_message_id?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  account_id: string;
  telegram_user_id: string;
  status: 'new' | 'active' | 'completed' | 'blacklisted';
  unread_count: number;
  last_message_at: string;
  notes?: string;
  account?: TelegramAccount;
  telegram_user?: TelegramUser;
  latest_message?: TelegramMessage;
  messages?: TelegramMessage[];
  tags?: { id: string; tag_name: string }[];
}

export interface ReplyTemplate {
  id: string;
  name: string;
  trigger_type: 'auto_reply' | 'keyword' | 'followup' | 'rule';
  delay_type: 'instant' | 'fixed' | 'random';
  delay_seconds: number;
  random_delay_min: number;
  random_delay_max: number;
  reply_type: 'text' | 'photo' | 'video' | 'voice' | 'audio' | 'sticker' | 'gif' | 'document';
  message_body: string;
  media_id?: string;
  media?: MediaItem;
  is_active: boolean;
  created_at: string;
}

export interface FollowupStep {
  id?: string;
  step_order: number;
  delay_seconds: number;
  template_id: string;
  template?: ReplyTemplate;
}

export interface FollowupCampaign {
  id: string;
  account_id?: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  on_reply_action: 'stop' | 'continue' | 'restart' | 'pause';
  total_users: number;
  active_users: number;
  completed_users: number;
  account?: TelegramAccount;
  steps: FollowupStep[];
  created_at: string;
}

export interface KeywordRule {
  id: string;
  account_id?: string;
  keywords: string[];
  match_type: 'exact' | 'contains';
  is_case_sensitive: boolean;
  priority: number;
  template_id: string;
  template?: ReplyTemplate;
  account?: TelegramAccount;
  is_active: boolean;
}

export interface MediaItem {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  file_type: 'photo' | 'video' | 'voice' | 'audio' | 'document';
  url: string;
  created_at: string;
}

export interface DashboardData {
  kpis: {
    total_incoming_messages: number;
    total_auto_replies: number;
    pending_followups: number;
    failed_messages: number;
    connected_accounts: number;
    active_campaigns: number;
    today_replies: number;
    weekly_replies: number;
    monthly_replies: number;
    success_rate: number;
  };
  daily_trends: { date: string; inbound: number; outbound: number; total: number }[];
  queue_breakdown: { name: string; value: number; color: string }[];
  campaign_performance: { id: string; name: string; total_users: number; active_users: number; completed_users: number }[];
}

export interface ScheduledMessageItem {
  id: string;
  conversation_id: string;
  campaign_id?: string;
  step_id?: string;
  template_id: string;
  scheduled_at: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  retry_count: number;
  error_log?: string;
  template?: ReplyTemplate;
  campaign?: { id: string; name: string };
  conversation?: {
    telegram_user?: TelegramUser;
    account?: TelegramAccount;
  };
}

export interface TelegramButton {
  id?: string;
  type: 'open_url' | 'call_number' | 'copy_coupon' | 'callback' | 'next_message' | 'previous_message' | 'menu_button';
  label: string;
  data: string;
}

export interface TelegramAutoReply {
  id: string;
  account_id?: string;
  name: string;
  status: 'active' | 'draft' | 'paused';
  priority: number;
  trigger_type: string;
  trigger_keywords?: string[];
  is_case_sensitive: boolean;
  delay_type: 'instant' | 'fixed' | 'random';
  delay_seconds: number;
  random_delay_min: number;
  random_delay_max: number;
  message_type: 'text' | 'photo' | 'video' | 'gif' | 'audio' | 'voice' | 'file';
  message_body: string;
  media_id?: string;
  media_caption?: string;
  is_album: boolean;
  media_attachments?: Array<{ id: string; url?: string; file_name?: string; caption?: string; file_type?: string }>;
  inline_buttons?: TelegramButton[];
  triggered_count: number;
  sent_count: number;
  last_triggered_at?: string;
  account?: TelegramAccount;
  media?: MediaItem;
  created_at: string;
}

export interface TelegramVariable {
  id: string;
  key: string;
  name: string;
  category: 'system' | 'custom' | 'contact' | 'ecommerce';
  fallback_value?: string;
  description?: string;
  is_system: boolean;
  created_at?: string;
}

export interface AutomationSettings {
  id?: string;
  account_id?: string | null;
  timezone: string;
  working_hours_enabled: boolean;
  working_hours_start: string;
  working_hours_end: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  weekend_skip: boolean;
  holiday_skip: boolean;
  max_followups_per_contact: number;
  stop_after_reply: boolean;
  resume_after_days: number;
  human_delay_simulation: boolean;
  typing_delay_per_char_ms: number;
  read_delay_seconds: number;
}

export interface TimelineEvent {
  id: string;
  type: 'automation_event' | 'chat_message';
  event_type: string;
  status: string;
  account: string;
  contact: string;
  contact_handle?: string | null;
  content?: string;
  payload?: any;
  message_type?: string;
  timestamp: string;
}

export interface SequentialAutoReplyStep {
  id?: string;
  sequence_id?: string;
  step_number: number;
  step_name?: string;
  delay_value: number;
  delay_unit: 'seconds' | 'minutes' | 'hours' | 'days';
  message_text: string;
  media_id?: string;
  media_url?: string;
  media_type?: string;
  links?: Array<{ label: string; url: string }>;
  is_active: boolean;
  sent_count?: number;
}

export interface SequentialAutoReplySequence {
  id: string;
  account_id?: string | null;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'draft';
  total_contacts: number;
  steps: SequentialAutoReplyStep[];
  account?: TelegramAccount;
  created_at?: string;
}

export interface SequentialFollowupQueueItem {
  id: string;
  campaign_id: string;
  conversation_id: string;
  telegram_user_id: string;
  step_id: string;
  step_order: number;
  scheduled_at: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  retry_count: number;
  error_message?: string;
  campaign?: { id: string; name: string };
  step?: { id: string; step_order: number; message_text?: string };
  conversation?: {
    id: string;
    telegram_user_id?: string;
    telegramUser?: { first_name?: string; username?: string; telegram_id: string };
  };
}
