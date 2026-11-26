'use client';

import React from 'react';
import {
  SiReact,
  SiNextdotjs,
  SiTypescript,
  SiTailwindcss,
  SiNodedotjs,
  SiPython,
  SiFastapi,
  SiGraphql,
  SiPytorch,
  SiLangchain,
  SiHuggingface,
  SiPostgresql,
  SiMongodb,
  SiRedis,
  SiElasticsearch,
  SiGooglecloud,
  SiDocker,
  SiKubernetes,
  SiTerraform,
  SiGithubactions,
  SiDatadog,
  SiGrafana,
} from 'react-icons/si';
import { FaAws } from 'react-icons/fa6';

export function OpenAIIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 8.937a4.485 4.485 0 0 1 2.366-1.973V12.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 8.937zm16.597 3.855l-5.833-3.387L15.119 8.24a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.666zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 10.27V7.934a.08.08 0 0 1 .033-.061l4.84-2.796a4.499 4.499 0 0 1 6.665 4.843zM11.498 13.91l-2.42-1.397 2.42-1.397 2.42 1.397-2.42 1.397z"/>
    </svg>
  );
}

export interface TechItem {
  name: string;
  role?: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export const allTechs: TechItem[] = [
  // Frontend
  { name: "React", Icon: SiReact },
  { name: "Next.js", Icon: SiNextdotjs },
  { name: "TypeScript", Icon: SiTypescript },
  { name: "Tailwind CSS", Icon: SiTailwindcss },
  // Backend
  { name: "Node.js", Icon: SiNodedotjs },
  { name: "Python", Icon: SiPython },
  { name: "FastAPI", Icon: SiFastapi },
  { name: "GraphQL", Icon: SiGraphql },
  // AI & ML
  { name: "OpenAI", Icon: OpenAIIcon },
  { name: "PyTorch", Icon: SiPytorch },
  { name: "LangChain", Icon: SiLangchain },
  { name: "Hugging Face", Icon: SiHuggingface },
  // Data
  { name: "PostgreSQL", Icon: SiPostgresql },
  { name: "Redis", Icon: SiRedis },
  { name: "MongoDB", Icon: SiMongodb },
  { name: "Elasticsearch", Icon: SiElasticsearch },
  // Cloud
  { name: "AWS", Icon: FaAws },
  { name: "Google Cloud", Icon: SiGooglecloud },
  { name: "Docker", Icon: SiDocker },
  { name: "Kubernetes", Icon: SiKubernetes },
  // DevOps
  { name: "Terraform", Icon: SiTerraform },
  { name: "GitHub Actions", Icon: SiGithubactions },
  { name: "Datadog", Icon: SiDatadog },
  { name: "Grafana", Icon: SiGrafana },
];
