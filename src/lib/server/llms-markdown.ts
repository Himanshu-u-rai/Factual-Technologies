import "server-only";

import { industries, techStack } from "@/lib/data";
import { loadPublishedArticles } from "@/lib/server/articles";
import { loadMergedSiteContent } from "@/lib/server/content";
import {
  HOME_FAQS,
  SERVICES_COMPARISON_ROWS,
  SITE_LEGAL_NAME,
  SITE_NAME,
  SITE_URL,
  normalizeSiteUrl,
} from "@/lib/seo";
import { SERVICE_PILLARS, getCaseStudySlug } from "@/lib/seo-pillars";
import { DEFAULT_SITE_CONTENT, FullSiteContent } from "@/lib/site-defaults";

/** Safely loads live studio CMS content, falling back to deterministic defaults if DB is offline. */
async function getAuthoritativeSiteContent(): Promise<FullSiteContent> {
  try {
    return await loadMergedSiteContent({
      includeUnpublishedProjects: false,
      includeMessages: false,
    });
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

function formatContactChannel(content: FullSiteContent): string[] {
  const lines: string[] = [
    `- Inquiry Form: ${normalizeSiteUrl("/contact")}`,
    `- Location: ${content.contactPage.officeAddress || content.meta.address}`,
    `- Hours: ${content.contactPage.businessHours || content.meta.phone}`,
    `- Response Time: ${content.contactPage.responseTime || "Within 4 business hours"}`,
  ];

  const email = (content.contactPage.email || content.meta.email || "").trim();
  if (email && !email.toLowerCase().endsWith(".example")) {
    lines.push(`- Email: ${email}`);
  }

  return lines;
}

/** Generates concise /llms.txt Markdown following the llmstxt.org specification. */
export async function buildLlmsSummaryMarkdown(): Promise<string> {
  const [content, articles] = await Promise.all([
    getAuthoritativeSiteContent(),
    loadPublishedArticles(),
  ]);
  const featuredProjects = content.projects.slice(0, 6);

  const lines: string[] = [
    `# ${content.meta.name || SITE_NAME}`,
    "",
    `> ${content.meta.description}`,
    "",
    `${content.meta.name || SITE_NAME} (${SITE_LEGAL_NAME}) is a senior software, cloud, and AI engineering consultancy in San Francisco, CA. Experienced engineers embed directly inside client repositories, issue trackers, and cloud accounts to ship production systems with full intellectual property ownership.`,
    "",
    "## Core Pages",
    `- [Home — Capabilities, FAQs & Case Previews](${SITE_URL}/): Overview of senior software, cloud, and AI engineering pods.`,
    `- [Services — Capabilities, Architecture & Technical FAQs](${normalizeSiteUrl("/services")}): Digital Product Engineering, AI Systems & Automation, Cloud Infrastructure & Data, security standards, and comparison matrix.`,
    ...SERVICE_PILLARS.map(
      (pillar) =>
        `- [${pillar.title} Pillar](${normalizeSiteUrl(`/services/${pillar.slug}`)}): ${pillar.seoDescription}`
    ),
    `- [Work — Engineering Case Studies](${normalizeSiteUrl("/work")}): Selected production builds across AI search, institutional reporting, multi-cloud streaming, mobile dispatch, clinical triage, and retail checkout.`,
    `- [Engineering Blog](${normalizeSiteUrl("/blog")}): In-depth architectural playbooks and implementation guides (${articles.length} published articles).`,
    `- [About — Methodology & Leadership](${normalizeSiteUrl("/about")}): Engineering philosophy, senior team leaders, AI evaluation practices, and core operational values.`,
    `- [Contact — Technical Discovery & Onboarding](${normalizeSiteUrl("/contact")}): Start an architecture audit, sprint pod, or cloud migration.`,
    "",
    "## Selected Production Case Studies",
    ...featuredProjects.map(
      (p) =>
        `- [${p.title}](${normalizeSiteUrl(`/work/${getCaseStudySlug(p)}`)}) (${p.category.toUpperCase()}): ${p.description} [Outcome: ${p.metrics}; Stack: ${p.tags.join(", ")}]`
    ),
    "",
    "## Latest Engineering Articles",
    ...articles.slice(0, 10).map(
      (a) =>
        `- [${a.title}](${normalizeSiteUrl(`/blog/${a.slug}`)}) (${a.category}, ${a.readingTimeMinutes} min read): ${a.excerpt}`
    ),
    "",
    "## Full Context & Feeds",
    `- [Complete Engineering Knowledge Base (llms-full.txt)](${normalizeSiteUrl("/llms-full.txt")}): Full process steps, comparison matrix, technical stack, compliance posture, full article guides, and FAQs.`,
    `- [RSS Feed (rss.xml)](${normalizeSiteUrl("/rss.xml")}): XML feed of engineering blog articles.`,
    "",
    "## Contact",
    ...formatContactChannel(content),
    "",
  ];

  return lines.join("\n");
}

/** Generates comprehensive /llms-full.txt Markdown with verified capabilities, case studies, blog articles, and FAQs. */
export async function buildLlmsFullMarkdown(): Promise<string> {
  const [content, articles] = await Promise.all([
    getAuthoritativeSiteContent(),
    loadPublishedArticles(),
  ]);
  const activeServices = content.services.filter((s) => s.enabled !== false);
  const sp = content.servicesPage[0] || DEFAULT_SITE_CONTENT.servicesPage[0];
  const about = content.aboutPage;
  const cp = content.contactPage;
  const team = about.teamMembers || [];

  const lines: string[] = [
    `# ${content.meta.name || SITE_NAME} — Complete Engineering Reference`,
    "",
    `> ${content.meta.description}`,
    "",
    `Canonical URL: ${SITE_URL}`,
    `Headquarters: ${cp.officeAddress || content.meta.address}`,
    `Service Regions: United States, North America, Western Europe`,
    `Compliance & Security Readiness: SOC2 Type II, ISO 27001, HIPAA, GDPR`,
    "",
    "---",
    "",
    "## 1. Studio Overview & Leadership",
    `**${about.foundingConvictionTitle}**`,
    about.foundingConvictionText,
    "",
    ...about.narrativeParagraphs.map((p) => `- ${p}`),
    "",
    `### ${about.visionMission.visionTitle}`,
    about.visionMission.visionText,
    ...about.visionMission.visionBullets.map((b) => `- ${b}`),
    "",
    `### ${about.visionMission.missionTitle}`,
    about.visionMission.missionText,
    ...about.visionMission.missionBullets.map((b) => `- ${b}`),
    "",
    ...(team.length > 0
      ? [
          "### Engineering Leadership",
          ...team.map(
            (m) => `- **${m.name} (${m.role})**: ${m.bio} [${m.specialties.join(", ")}]`
          ),
          "",
        ]
      : []),
    "### Core Operating Values",
    ...about.values.map((v) => `- **${v.title}**: ${v.description}`),
    "",
    "---",
    "",
    "## 2. Core Engineering Services & Pillar Pages",
    ...activeServices.flatMap((s) => [
      `### ${s.title}`,
      s.description,
      ...s.capabilities.map((c) => `- ${c}`),
      "",
    ]),
    ...SERVICE_PILLARS.flatMap((p) => [
      `### Pillar: ${p.title} (${normalizeSiteUrl(`/services/${p.slug}`)})`,
      p.heroSummary,
      ...p.deliverables.map((d) => `- ${d}`),
      "",
    ]),
    "### Strategic Architecture Pillars",
    ...sp.strategicPillars.map(
      (pillar) => `- **${pillar.title}**: ${pillar.description} (${pillar.bullet})`
    ),
    "",
    "---",
    "",
    "## 3. Engagement & Delivery Comparison",
    "| Dimension | Factual Technologies | Traditional Agency | In-House Hiring |",
    "| --- | --- | --- | --- |",
    ...SERVICES_COMPARISON_ROWS.map(
      (row) => `| ${row.dimension} | ${row.factual} | ${row.agency} | ${row.inHouse} |`
    ),
    "",
    "---",
    "",
    "## 4. Engineering Process & Onboarding Timeline",
    "### Four-Stage Delivery Process",
    ...sp.processSteps.map((step) => `- **${step.step} — ${step.title}**: ${step.description}`),
    "",
    "### Technical Onboarding Timeline",
    ...cp.timeline.map(
      (tl) => `- **${tl.phase} (${tl.timeframe}) — ${tl.title}**: ${tl.description}`
    ),
    "",
    "---",
    "",
    "## 5. Production Case Studies",
    ...content.projects.flatMap((project) => [
      `### ${project.title} (${normalizeSiteUrl(`/work/${getCaseStudySlug(project)}`)})`,
      `- Category: ${project.category.toUpperCase()}`,
      `- Outcome Metric: ${project.metrics}`,
      `- Summary: ${project.description}`,
      `- Stack: ${project.tags.join(", ")}`,
      "",
    ]),
    "---",
    "",
    "## 6. Published Engineering Blog Articles",
    ...articles.flatMap((art) => [
      `### ${art.title} (${normalizeSiteUrl(`/blog/${art.slug}`)})`,
      `By ${art.authorName}${art.authorRole ? `, ${art.authorRole}` : ""} · Category: ${art.category} · ${art.readingTimeMinutes} min read`,
      art.excerpt,
      ...(art.faqs.length > 0
        ? art.faqs.map((f) => `- Q: ${f.q}\n  A: ${f.a}`)
        : []),
      "",
    ]),
    "---",
    "",
    "## 7. Supported Technology Stack & Regulated Industries",
    ...techStack.map((cat) => `- **${cat.name}**: ${cat.items.join(", ")}`),
    "",
    "### Primary Industry Domains",
    ...industries.map((ind) => `- ${ind}`),
    "",
    "---",
    "",
    "## 8. Frequently Asked Questions",
    ...[...HOME_FAQS, ...sp.faqs, ...cp.faqs].flatMap((faq) => [
      `### ${faq.q}`,
      faq.a,
      "",
    ]),
    "---",
    "",
    "## 9. Client Engineering Feedback",
    ...content.testimonials.map(
      (t) => `> "${t.quote}" — ${t.author}, ${t.role}, ${t.company}`
    ),
    "",
    "---",
    "",
    "## 10. Direct Engagement & Contact",
    ...formatContactChannel(content),
    "",
  ];

  return lines.join("\n");
}
