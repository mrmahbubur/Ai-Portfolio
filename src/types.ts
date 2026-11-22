export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type AvatarStyle = 'realistic' | 'cyber';
export type CharacterPose = 'neutral' | 'presenting' | 'pointing' | 'listening';
export type TourStage = 'not_started' | 'intro' | 'bio' | 'projects_tour' | 'handoff';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  topicId?: string;
  hasAudio?: boolean;
}

export interface Topic {
  id: 'about' | 'projects' | 'skills' | 'contact' | 'tour';
  title: string;
  subtitle: string;
  badge: string;
  iconName: string;
  prompt: string;
  color: 'gold' | 'emerald' | 'cyan';
}

export interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  link?: string;
  demoUrl?: string;
  badge?: string;
  speechNarrative?: string; // Specific concierge voice narration
  customThumbnail?: string;
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface SocialLinks {
  email: string;
  phone?: string;
  calendlyUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  xUrl?: string;
  blueskyUrl?: string;
  wordpressUrl?: string;
  contactForm?: string;
  goodreadsUrl?: string;
  gravatarUrl: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  period: string;
  gpa?: string;
}

export interface PersonalDetails {
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  religion?: string;
  address?: string;
}

export interface LanguageProficiency {
  name: string;
  level: string;
}

export interface BioProfile {
  personaName: string;
  ownerName: string;
  displayName?: string;
  gravatarUsername?: string;
  avatarUrl?: string;
  lastSyncedAt?: string;
  verifiedAccounts?: any[];
  roleTitle: string;
  location: string;
  socials: SocialLinks;
  gravatarBio: string;
  certification: string;
  aboutDetails: string;
  projects: Project[];
  platforms?: Project[];
  interests: string[];
  skillsList: SkillCategory[];
  systemInstruction: string;
  headerImage?: string;
  backgroundColor?: string;
  cryptoWallets?: { type: string; address: string }[];
  education?: EducationItem[];
  personalDetails?: PersonalDetails;
  languages?: LanguageProficiency[];
  coursesCertifications?: string[];
  whatICanHelpWith?: string[];
}

export interface VoiceSettings {
  geminiVoice: 'Leda' | 'Sulafat' | 'Aoede' | 'Kore' | 'Puck' | 'Fenrir' | 'Zephyr' | 'Charon';
  speakingRate: number; // 0.8 to 1.3
  pitch: number; // 0.8 to 1.2
  autoPlayVoice: boolean;
  soundFxEnabled: boolean;
  preferGeminiTTS: boolean;
  languageCode?: string; // BCP-47 language code e.g. 'en-US', 'ar-EG', 'bn-BD'
}

export interface AudioVisualizerData {
  volume: number; // 0 to 1
  frequencies: Uint8Array;
  isSpeaking: boolean;
  phonemeWeight: number; // For mouth aperture
}

export interface InquiryMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

export interface CvWatermarkConfig {
  enabled: boolean;
  text?: string;
  tone?: 'subtle-gold' | 'subtle-slate' | 'extra-faint';
  position?: 'diagonal-center' | 'triple-diagonal';
}

export interface Subscriber {
  email: string;
  name?: string;
  uid?: string;
  subscribedAt: string;
  receivePlatformUpdates: boolean;
  receiveBlogUpdates: boolean;
}

