export interface Log {
  id: number;
  date: string;
  text: string;
  completed: boolean;
}

export interface Tool {
  id: number;
  name: string;
  description: string;
  url: string;
  status: "Pending" | "Deploy" | "Publish";
  createdWith: string;
  createdByAccount: string;
  deployWith: string;
  deployByAccount: string;
  version: string;
  releaseDate: string;
  createdAt: string;
  logs: Log[];
}

export interface Planning {
  id: number;
  name: string;
  description: string;
  url: string;
  category: "Ide" | "Untuk Dijual" | "Portofolio" | "Internal" | "Abandon";
  price: string;
  target: string;
  createdAt: string;
  logs: Log[];
}

export type TabType = "tools" | "planning";
export type FormMode = "add" | "edit";
