export type Project = {
  id: number;
  title: string;
  description: string;
  image: string;
  tags: string[];
  category: string;
  status: "Public" | "dev";
  githubUrl: string;
  demoUrl: string;
};
