"use client";

import { createContext, useContext, type ReactNode } from "react";

export type V2PublisherAssessmentInstantiationContextValue = {
  sectionId: string;
  sectionSubjectId: string;
  bookId: string;
  teachingPeriodId?: string | null;
  returnHref?: string | null;
};

const Context = createContext<V2PublisherAssessmentInstantiationContextValue | null>(null);

export function V2PublisherAssessmentInstantiationProvider({
  value,
  children,
}: {
  value: V2PublisherAssessmentInstantiationContextValue;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useV2PublisherAssessmentInstantiationContext() {
  return useContext(Context);
}
