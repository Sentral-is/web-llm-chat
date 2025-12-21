export type DocumentStatus = "idle" | "processing" | "ready" | "error";

export type DocumentStats = {
  pagesParsed: number;
  totalPages: number;
  charCount: number;
  truncated: boolean;
};

export type DocumentAttachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  status: DocumentStatus;
  text?: string;
  stats?: DocumentStats;
  lowText?: boolean;
  error?: string;
  file?: File;
  sentToChat?: boolean;
};

export type DocumentContext = {
  name: string;
  text: string;
  stats?: DocumentStats;
};
