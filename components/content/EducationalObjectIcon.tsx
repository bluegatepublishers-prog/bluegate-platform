import {
  BookOpen,
  Brain,
  CircleHelp,
  FlaskConical,
  Goal,
  KeyRound,
  Lightbulb,
  MessageCircle,
  NotebookPen,
  PencilLine,
  Pin,
  SearchCheck,
  Sprout,
  Target,
  TestTube2,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EducationalObjectType } from "@/lib/educational-object-registry";

const ICONS: Record<EducationalObjectType, LucideIcon> = {
  learningOutcome: Target,
  learningObjective: Goal,
  didYouKnow: Lightbulb,
  thinkAndDiscuss: MessageCircle,
  thinkAndAnswer: CircleHelp,
  thinkAndWrite: PencilLine,
  remember: Pin,
  keyPoint: KeyRound,
  factBox: FlaskConical,
  example: BookOpen,
  vocabulary: NotebookPen,
  caseStudy: SearchCheck,
  competencyQuestion: TestTube2,
  hots: Brain,
  lifeSkill: Sprout,
  teacherNote: UsersRound,
};

export default function EducationalObjectIcon({
  type,
  className = "h-5 w-5",
}: {
  type: EducationalObjectType;
  className?: string;
}) {
  const Icon = ICONS[type];
  return <Icon aria-hidden="true" className={className} strokeWidth={2} />;
}
