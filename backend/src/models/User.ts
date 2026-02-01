export interface User {
  id: number;
  phone: string;
  email?: string;
  password_hash: string;
  nickname?: string;
  avatar_url?: string;
  member_level: number;
  member_expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserThirdPartyAccount {
  id: number;
  user_id: number;
  platform: string;
  platform_user_id: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserSettings {
  id: number;
  user_id: number;
  risk_level: number;
  notifications_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}
