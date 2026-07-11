export type ValidationIssue={code:string;message:string;severity:"error"|"warning"};
export type ValidationReport={valid:boolean;issues:ValidationIssue[];checks:Record<string,boolean>};
export type KnowledgeChapter={id:string;chapterNumber:number;title:string;sourceText:string;summary:string|null;keywords:string[];outcomes:{outcome:string;bloomLevel:string|null;competency:string|null}[];questions:{questionType:string;questionText:string;options:unknown;correctAnswer:string|null;explanation:string|null;marks:number;difficulty:string;bloomLevel:string|null;competency:string|null}[];activities:{title:string;objective:string;instructions:string;expectedLearning:string|null;assessment:string|null}[]};
export type KnowledgePackage={book:{id:string;title:string;className:string;subjectName:string;seriesName:string|null};chapters:KnowledgeChapter[];collectedAt:string;policy:"APPROVED_ONLY"};
export type ProviderRequest={systemPrompt:string;userPrompt:string;responseFormat:"json"};
export type ProviderResponse={provider:string;model:string;content:string;usage?:{inputTokens:number;outputTokens:number}};
export interface AiProvider{name:string;generate(request:ProviderRequest):Promise<ProviderResponse>}
export type OrchestrationPreview={version:1;kind:"QUESTION_PAPER_PREVIEW";configuration:Record<string,unknown>;knowledge:KnowledgePackage;validation:ValidationReport;providerCalled:false;editableContent:string};
