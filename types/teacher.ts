import { LucideIcon } from "lucide-react";

// ===============================================
// Resource Categories
// ===============================================

export interface ResourceCategory {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

// ===============================================
// Teacher Resources
// ===============================================

export interface TeacherResource {
  id: string;
  title: string;
  description: string;
  category: string;
  classLevel: string;
  subject: string;
  fileType: "PDF" | "PPT" | "DOCX" | "VIDEO";
  thumbnail: string;
  downloadUrl: string;
  featured: boolean;
  createdAt: string;

  // Future Ready
  pages?: number;
  fileSize?: string;
  downloads?: number;
  premium?: boolean;
}

// ===============================================
// FAQ
// ===============================================

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

// ===============================================
// Statistics
// ===============================================

export interface TeacherHubStats {
  resources: number;
  lessonPlans: number;
  worksheets: number;
  videos: number;
}

// ===============================================
// Support
// ===============================================

export interface SupportOption {
  id: string;
  title: string;
  description: string;
  action: string;
}