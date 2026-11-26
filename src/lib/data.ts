export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  address: string;
}

export interface NavLink {
  label: string;
  name?: string;
  href: string;
}

export interface StatItem {
  value: string;
  label: string;
}
export type Stat = StatItem;

export interface Service {
  title: string;
  description: string;
  icon: string;
  capabilities: string[];
  href: string;
}

export type ProjectCategory = "ai" | "web" | "cloud" | "mobile";

export interface Project {
  title: string;
  description: string;
  tags: string[];
  metrics: string;
  image: string;
  category: ProjectCategory;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar?: string;
}

export interface TechStackCategory {
  name: string;
  items: string[];
}
export type TechCategory = TechStackCategory;

export interface ProcessStep {
  step: string;
  title: string;
  description: string;
}

export const siteConfig: SiteConfig = {
  name: "Factual Technologies",
  tagline: "Software, Cloud & AI Systems Built for Production",
  description:
    "We work alongside engineering and product teams to design, build, and deploy web platforms, cloud migrations, and internal AI tools.",
  email: "hello@factualtechnologies.example",
  phone: "Mon-Fri, 8:00 AM - 6:00 PM PST",
  address: "Howard Street, SoMa, San Francisco",
};

export const navLinks: NavLink[] = [
  { label: "Services", href: "/services" },
  { label: "Work", href: "/work" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const stats: StatItem[] = [
  { value: "Senior", label: "Staff & principal engineers on every project" },
  { value: "Weekly", label: "Working staging builds, zero account layers" },
  { value: "Full IP", label: "Code authored directly in your repositories" },
  { value: "SOC2", label: "Security checks integrated into CI pipelines" },
];

export const services: Service[] = [
  {
    title: "Digital Product Engineering",
    description:
      "Web applications, APIs, and mobile software built for teams that need predictable delivery and clean handoff.",
    icon: "Code",
    capabilities: [
      "Web applications and customer portals",
      "Cross-platform mobile apps",
      "API and service boundaries",
      "Automated test coverage and security checks",
    ],
    href: "#services",
  },
  {
    title: "AI Systems & Automation",
    description:
      "Document search, structured extraction, and LLM workflows with deterministic guardrails and source citations.",
    icon: "Brain",
    capabilities: [
      "Internal knowledge and document search",
      "Retrieval pipelines with citations",
      "Evaluation harnesses for prompts and models",
      "Document ingestion and classification queues",
    ],
    href: "#services",
  },
  {
    title: "Cloud Infrastructure & Data",
    description:
      "Zero-downtime cloud migrations, event streaming pipelines, and reproducible Terraform environments on AWS and GCP.",
    icon: "Cloud",
    capabilities: [
      "Data warehouses and ingestion pipelines",
      "Event streaming and queue architecture",
      "AWS and GCP migrations",
      "CI/CD and infrastructure as code",
    ],
    href: "#services",
  },
];

export const projects: Project[] = [
  {
    title: "Regulatory & Technical Knowledge Search",
    description:
      "Built an internal search and citation pipeline indexing compliance filings and engineering specifications so analysts verify answers against primary sources.",
    tags: ["Search", "FastAPI", "Vector DB"],
    metrics: "Regulatory archive search with citations",
    image: "/projects/regulatory-search.jpg",
    category: "ai",
  },
  {
    title: "Institutional Portfolio Reporting Portal",
    description:
      "Replaced a legacy reporting tool with a TypeScript and GraphQL client portal supporting automated quarterly statements and holdings breakdowns.",
    tags: ["Next.js", "TypeScript", "GraphQL"],
    metrics: "Holdings and statement reporting portal",
    image: "/projects/portfolio-portal.jpg",
    category: "web",
  },
  {
    title: "Multi-Cloud Event Ingestion Pipeline",
    description:
      "Migrated batch financial ingestion to a partitioned Kafka and Kubernetes pipeline spanning AWS and GCP without interrupting daily settlement.",
    tags: ["Kubernetes", "AWS", "Kafka", "Terraform"],
    metrics: "Multi-region AWS and GCP streaming",
    image: "/projects/cloud-pipeline.jpg",
    category: "cloud",
  },
  {
    title: "Field Operations Dispatch App",
    description:
      "Shipped an offline-first mobile client for regional service crews with local job queues, route sync, and equipment checklists.",
    tags: ["React Native", "TypeScript", "Offline Sync"],
    metrics: "Offline-first field dispatch and sync",
    image: "/projects/field-dispatch.jpg",
    category: "mobile",
  },
  {
    title: "Clinical Pathology Triage Queue",
    description:
      "Developed a HIPAA-compliant review queue for clinical labs that prioritizes incoming reports and attaches imaging metadata for specialists.",
    tags: ["PyTorch", "Python", "HIPAA Cloud"],
    metrics: "Prioritized clinical report triage",
    image: "/projects/clinical-triage.jpg",
    category: "ai",
  },
  {
    title: "Headless Retail Checkout Re-Platform",
    description:
      "Separated catalog, inventory, and checkout services out of a monolithic store into containerized Node.js and Redis services.",
    tags: ["Next.js", "Redis", "Docker", "Node.js"],
    metrics: "Decoupled catalog and checkout services",
    image: "/projects/retail-checkout.jpg",
    category: "web",
  },
];

export const testimonials: Testimonial[] = [
  {
    quote:
      "They joined our Slack, shipped working builds every Friday, and left documentation our own engineers actually wanted to read.",
    author: "Hannah Morales",
    role: "VP of Engineering",
    company: "Northstar Freight",
    avatar: "/avatars/hannah-morales.jpg",
  },
  {
    quote:
      "Our database and Kafka migration ran across two cloud regions without dropping a settlement window. Plain communication the whole way.",
    author: "David Kim",
    role: "Head of Platform",
    company: "Clearview Treasury",
    avatar: "/avatars/david-kim.jpg",
  },
  {
    quote:
      "Having senior engineers work directly inside our repository meant zero translation loss between scoping and production.",
    author: "Claire Bennett",
    role: "CTO",
    company: "Alder Diagnostics",
    avatar: "/avatars/claire-bennett.jpg",
  },
];

export const techStack: TechStackCategory[] = [
  {
    name: "Frontend",
    items: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
  },
  {
    name: "Backend",
    items: ["Node.js", "Python", "FastAPI", "GraphQL"],
  },
  {
    name: "AI/ML",
    items: ["OpenAI", "PyTorch", "LangChain", "Hugging Face"],
  },
  {
    name: "Data",
    items: ["PostgreSQL", "MongoDB", "Redis", "Elasticsearch"],
  },
  {
    name: "Cloud",
    items: ["AWS", "GCP", "Docker", "Kubernetes"],
  },
  {
    name: "DevOps",
    items: ["Terraform", "GitHub Actions", "Datadog", "Grafana"],
  },
];

export const industries: string[] = [
  "Healthcare",
  "Finance & Insurance",
  "Retail & Ecommerce",
  "SaaS & Platforms",
  "Logistics & Supply Chain",
  "Education & EdTech",
];

export const processSteps: ProcessStep[] = [
  {
    step: "Discovery",
    title: "Scope & Architecture Review",
    description:
      "We review your existing codebase, constraints, and product requirements to map clear technical milestones.",
  },
  {
    step: "Design",
    title: "System & Schema Design",
    description:
      "We define data models, service boundaries, API contracts, and cloud topology before writing application code.",
  },
  {
    step: "Build",
    title: "Incremental Delivery",
    description:
      "We ship in two-week sprints directly in your repository with automated tests, code reviews, and staging previews.",
  },
  {
    step: "Handover",
    title: "Rollout & Team Handoff",
    description:
      "We configure monitoring, alerts, and runbooks, then walk your internal team through every operational detail.",
  },
];

export default navLinks;
