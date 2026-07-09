export type ResourceType = "PDF" | "PPT" | "DOC" | "VIDEO" | "ZIP";

export type Resource = {
  id: string;
  title: string;
  description: string;
  classLevel: string;
  subject: string;
  type: ResourceType;
  category: string;
  thumbnail: string;
  fileUrl: string;
  previewOnly?: boolean;
  featured?: boolean;
};

export const teacherResources: Resource[] = [
  {
    id: "rp-lesson-plan-1",
    title: "Fraction Fundamentals - Lesson Plan",
    description: "A complete lesson plan covering basic fractions with activities and assessment.",
    classLevel: "Grade 4",
    subject: "Mathematics",
    type: "PDF",
    category: "Lesson Plans",
    thumbnail: "/favicon.ico",
    fileUrl: "/files/fraction-lesson.pdf",
    previewOnly: false,
    featured: true,
  },
  {
    id: "rp-worksheet-1",
    title: "Fractions Worksheet Pack",
    description: "Practice worksheets for fractions with answer key.",
    classLevel: "Grade 4",
    subject: "Mathematics",
    type: "PDF",
    category: "Worksheets",
    thumbnail: "/favicon.ico",
    fileUrl: "/files/fractions-worksheets.pdf",
    previewOnly: true,
    featured: false,
  },
  {
    id: "rp-ppt-1",
    title: "Interactive PPT: Water Cycle",
    description: "Classroom presentation on the water cycle with animations.",
    classLevel: "Grade 5",
    subject: "Science",
    type: "PPT",
    category: "Interactive PPTs",
    thumbnail: "/favicon.ico",
    fileUrl: "/files/water-cycle.pptx",
    previewOnly: false,
    featured: true,
  },
  {
    id: "rp-video-1",
    title: "Photosynthesis - Video Lesson",
    description: "A short video explaining photosynthesis for classroom use.",
    classLevel: "Grade 6",
    subject: "Science",
    type: "VIDEO",
    category: "Video Lessons",
    thumbnail: "/favicon.ico",
    fileUrl: "https://example.com/videos/photosynthesis.mp4",
    previewOnly: true,
    featured: false,
  },
  {
    id: "rp-manual-1",
    title: "Teacher Manual: English Grammar",
    description: "Comprehensive manual with teaching notes and sample lesson sequences.",
    classLevel: "Grade 7",
    subject: "English",
    type: "DOC",
    category: "Teacher Manuals",
    thumbnail: "/favicon.ico",
    fileUrl: "/files/english-manual.docx",
    previewOnly: false,
    featured: false,
  },
  {
    id: "rp-zip-1",
    title: "Assessment Pack - Term 1",
    description: "Zip containing tests, marking schemes and teacher notes.",
    classLevel: "Grade 8",
    subject: "General",
    type: "ZIP",
    category: "Question Bank",
    thumbnail: "/favicon.ico",
    fileUrl: "/files/assessment-term1.zip",
    previewOnly: false,
    featured: false,
  },
];
