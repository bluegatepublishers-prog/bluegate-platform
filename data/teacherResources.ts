// ===============================================
// Bluegate Publishers
// Teacher Hub Mock Data
// Future: Replace with Database/API
// ===============================================

import {
  BookOpen,
  ClipboardList,
  FileQuestion,
  FileCheck,
  Presentation,
  Video,
  BookMarked,
} from "lucide-react";

import {
  ResourceCategory,
  TeacherResource,
  FAQItem,
  TeacherHubStats,
  SupportOption,
} from "@/types/teacher";

// ===============================================
// Resource Categories
// ===============================================

export const resourceCategories: ResourceCategory[] = [
  {
    id: "lesson-plans",
    title: "Lesson Plans",
    description: "Well-structured classroom lesson plans.",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "worksheets",
    title: "Worksheets",
    description: "Printable student worksheets.",
    icon: ClipboardList,
    color: "bg-green-100 text-green-700",
  },
  {
    id: "question-banks",
    title: "Question Banks",
    description: "Practice and assessment questions.",
    icon: FileQuestion,
    color: "bg-orange-100 text-orange-700",
  },
  {
    id: "answer-keys",
    title: "Answer Keys",
    description: "Teacher reference solutions.",
    icon: FileCheck,
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: "ppt",
    title: "Presentation Slides",
    description: "Interactive classroom PPTs.",
    icon: Presentation,
    color: "bg-pink-100 text-pink-700",
  },
  {
    id: "videos",
    title: "Training Videos",
    description: "Professional teacher training videos.",
    icon: Video,
    color: "bg-red-100 text-red-700",
  },
  {
    id: "manuals",
    title: "Teacher Manuals",
    description: "Comprehensive teaching guides.",
    icon: BookMarked,
    color: "bg-yellow-100 text-yellow-700",
  },
];

// ===============================================
// Featured Resources
// ===============================================

export const featuredResources: TeacherResource[] = [
  {
    id: "1",
    title: "Class 6 Science Lesson Plan",
    description:
      "Complete chapter-wise lesson plan aligned with the Bluegate Science curriculum.",
    category: "lesson-plans",
    classLevel: "Class 6",
    subject: "Science",
    fileType: "PDF",
    thumbnail: "/images/resources/science6.jpg",
    downloadUrl: "#",
    featured: true,
    createdAt: "2026-07-01",
  },
  {
    id: "2",
    title: "Mathematics Practice Worksheet",
    description:
      "Printable worksheet for classroom practice and homework activities.",
    category: "worksheets",
    classLevel: "Class 7",
    subject: "Mathematics",
    fileType: "PDF",
    thumbnail: "/images/resources/math7.jpg",
    downloadUrl: "#",
    featured: true,
    createdAt: "2026-07-01",
  },
  {
    id: "3",
    title: "AI Classroom Presentation",
    description:
      "Editable presentation slides for introducing Artificial Intelligence concepts.",
    category: "ppt",
    classLevel: "Class 8",
    subject: "Artificial Intelligence",
    fileType: "PPT",
    thumbnail: "/images/resources/ai.jpg",
    downloadUrl: "#",
    featured: true,
    createdAt: "2026-07-01",
  },
];

// ===============================================
// Statistics
// ===============================================

export const teacherHubStats: TeacherHubStats = {
  resources: 450,
  lessonPlans: 120,
  worksheets: 180,
  videos: 50,
};

// ===============================================
// FAQ
// ===============================================

export const teacherFAQs: FAQItem[] = [
  {
    id: "1",
    question: "How can I download teacher resources?",
    answer:
      "Registered teachers can log in to access lesson plans, worksheets, presentations, manuals, and other teaching materials.",
  },
  {
    id: "2",
    question: "Are all resources free?",
    answer:
      "Resources are available to teachers associated with Bluegate partner schools and approved institutions.",
  },
  {
    id: "3",
    question: "Can I use these materials in my classroom?",
    answer:
      "Yes. All downloadable resources are designed for classroom teaching and student learning.",
  },
];

// ===============================================
// Support
// ===============================================

export const supportOptions: SupportOption[] = [
  {
    id: "1",
    title: "Email Support",
    description: "Get assistance from our academic support team.",
    action: "Contact Us",
  },
  {
    id: "2",
    title: "Teacher Training",
    description: "Join professional development sessions and workshops.",
    action: "View Programs",
  },
  {
    id: "3",
    title: "FAQs",
    description: "Find quick answers to commonly asked questions.",
    action: "Browse FAQs",
  },
];