'use client';

import { useState, useRef, useEffect } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { ShowcaseImage } from "@/components/ui/EditorialMedia";
import FaqList from "@/components/ui/FaqList";
import { siteConfig as defaultSiteConfig } from "@/lib/data";
import { addInquiry } from "@/lib/admin-store";
import { useSiteContent } from "@/lib/site-store";
import {
  Shield,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

type SubmissionState =
  | { status: "editing" }
  | { status: "submitting" }
  | { status: "submitted"; submittedName: string }
  | { status: "error"; message: string };

interface FormErrors {
  name?: string;
  email?: string;
  company?: string;
  message?: string;
}

export default function ContactPage() {
  const { content } = useSiteContent();
  const contact = content.contactPage || {
    heroBadge: "",
    heroTitle: "Tell us what you are building",
    heroSubtitle: "Share your technical goals, timeline, and stack. An engineering partner will reply within four business hours.",
    officeAddress: defaultSiteConfig.address,
    phone: defaultSiteConfig.phone,
    email: defaultSiteConfig.email,
    businessHours: "Monday - Friday, 8:00 AM - 6:00 PM PST",
    responseTime: "Within 4 business hours",
    faqs: [],
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const timelineSteps =
    contact.timeline && contact.timeline.length > 0
      ? contact.timeline
      : [
          {
            id: "tl-1",
            phase: "Same day",
            timeframe: contact.responseTime || "Within 4 hours",
            title: "Technical review",
            description:
              "An engineering lead reviews your message and notes architectural questions before the introductory call.",
            icon: "Users",
          },
          {
            id: "tl-2",
            phase: "Days 1-2",
            timeframe: "30 minutes",
            title: "Discovery call",
            description:
              "We walk through system constraints, team structure, timeline expectations, and integration boundaries.",
            icon: "Phone",
          },
          {
            id: "tl-3",
            phase: "Days 3-5",
            timeframe: "Written plan",
            title: "Scope & proposal",
            description:
              "You receive a concise engineering plan with milestones, staffing, and fixed or sprint pricing.",
            icon: "CheckCircle",
          },
        ];

  const contactFaqs = contact.faqs && contact.faqs.length > 0 ? contact.faqs : [];

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submission, setSubmission] = useState<SubmissionState>({ status: "editing" });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case "name":
        if (!value.trim()) return "Please enter your full name (minimum 2 characters).";
        if (value.trim().length < 2) return "Name must be at least 2 characters.";
        return undefined;
      case "email":
        if (!value.trim()) return "Please enter your work email so we can reply.";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          return "Please enter a valid email format, e.g. name@company.com.";
        }
        return undefined;
      case "message":
        if (!value.trim()) return "Please summarize your project goals or technical requirements.";
        if (value.trim().length < 10) return "Please provide at least 10 characters describing your project.";
        return undefined;
      default:
        return undefined;
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (touched[name]) {
      const errorMsg = validateField(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: errorMsg,
      }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errorMsg = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: errorMsg,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submission.status === "submitting") return;

    const nameError = validateField("name", formData.name);
    const emailError = validateField("email", formData.email);
    const messageError = validateField("message", formData.message);

    if (nameError || emailError || messageError) {
      setErrors({
        name: nameError,
        email: emailError,
        message: messageError,
      });
      setTouched({
        name: true,
        email: true,
        message: true,
      });
      return;
    }

    setSubmission({ status: "submitting" });
    try {
      await addInquiry({
        name: formData.name,
        email: formData.email,
        company: formData.company ? formData.company.trim() : undefined,
        message: formData.message,
      });
      if (!mountedRef.current) return;
      setErrors({});
      setSubmission({ status: "submitted", submittedName: formData.name });
    } catch (err) {
      console.error("Failed to record inquiry:", err);
      if (!mountedRef.current) return;
      setSubmission({
        status: "error",
        message: "Unable to record your inquiry right now. Please try again or email us directly.",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      company: "",
      message: "",
    });
    setErrors({});
    setTouched({});
    setSubmission({ status: "editing" });
  };

  return (
    <div className="w-full bg-white text-slate-900">
      {/* 1. HERO SECTION */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-slate-200/70 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Contact" },
            ]}
            className="mb-6"
          />
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-950 leading-[1.08] [text-wrap:balance] max-w-3xl">
            {contact.heroTitle || "Tell us what you are building"}
          </h1>

          <p className="mt-6 font-sans text-base sm:text-lg leading-relaxed text-slate-600 max-w-2xl [text-wrap:pretty]">
            {contact.heroSubtitle ||
              "Share your technical goals, timeline, and stack. An engineering partner will reply within four business hours."}
          </p>
        </div>
      </section>

      {/* 2. MAIN CONTACT SECTION */}
      <section className="py-16 sm:py-24 bg-slate-50/40 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Left Column: Direct Contact Info (Single unified borderless definition list) */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Direct Channels
                </h2>
                <p className="text-slate-600 text-base mt-2 leading-relaxed">
                  You correspond directly with the engineers scoping and writing the work.
                </p>
              </div>

              <ShowcaseImage
                src="/images/architecture-board.jpg"
                alt="System scoping table with hand-drawn flow diagrams and laptop"
                ratio="16/9"
              />

              <dl className="divide-y divide-slate-200 border-y border-slate-200 text-sm">
                <div className="py-4 flex flex-col gap-1">
                  <dt className="font-semibold text-slate-500">Office</dt>
                  <dd className="text-base text-slate-900">
                    {contact.officeAddress || defaultSiteConfig.address}
                  </dd>
                </div>

                <div className="py-4 flex flex-col gap-1">
                  <dt className="font-semibold text-slate-500">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${contact.email || defaultSiteConfig.email}`}
                      className="text-base font-medium text-slate-900 hover:text-blue-600 underline underline-offset-4 decoration-slate-300 hover:decoration-blue-600 transition-colors"
                    >
                      {contact.email || defaultSiteConfig.email}
                    </a>
                  </dd>
                </div>

                <div className="py-4 flex flex-col gap-1">
                  <dt className="font-semibold text-slate-500">Hours &amp; Response</dt>
                  <dd className="text-base text-slate-900">
                    {contact.businessHours || "Monday - Friday, 8:00 AM - 6:00 PM PST"}
                  </dd>
                  <dd className="text-xs text-slate-500 font-mono">
                    {contact.responseTime || "Within 4 business hours"}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2.5 text-sm text-slate-600">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Direct reply from an engineering partner</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-slate-700 shrink-0" />
                  <span>Mutual NDA executed before repository review</span>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <div className="lg:col-span-7">
              <div className="bg-white border-t-2 border-slate-950 p-7 sm:p-10">
                <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 mb-2">
                  Send a Message
                </h3>
                <p className="text-base font-normal text-slate-600 mb-8 max-w-[60ch] leading-[1.6] [text-wrap:pretty]">
                  Outline your system goals, current stack, and rough timeline.
                </p>

                  {submission.status === "submitted" ? (
                    <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-8 space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-2xl font-bold text-slate-950 tracking-tight">
                          Inquiry Received
                        </h4>
                        <p className="text-base font-normal text-slate-600 max-w-md leading-[1.6]">
                          Thank you, {submission.submittedName || "there"}. Your message has been sent directly to our engineering leads.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-slate-200/70 space-y-2 max-w-lg">
                        <p className="text-sm font-semibold text-slate-900">
                          What happens next
                        </p>
                        <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
                          <li>An engineering lead reviews your message ({contact.responseTime || "within 4 business hours"}).</li>
                          <li>We schedule an introductory 30-minute scoping call.</li>
                          <li>You receive a written roadmap and team structure.</li>
                        </ul>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                        <Button
                          variant="outline"
                          size="md"
                          onClick={resetForm}
                          className="w-full sm:w-auto"
                        >
                          Send Another Inquiry
                        </Button>
                        <Button
                          href="/work"
                          variant="secondary"
                          size="md"
                          className="w-full sm:w-auto"
                        >
                          See case studies
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                      {/* Name Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="name"
                            className="block text-sm font-medium text-slate-800"
                          >
                            Full Name <span className="text-blue-600">*</span>
                          </label>
                          {touched.name && errors.name && (
                            <span className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Required
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. Elena Rostova"
                          className={`rounded-xl bg-white border px-4 py-3 w-full text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-all duration-150 ${
                            touched.name && errors.name
                              ? "border-rose-400 bg-rose-50/20"
                              : "border-slate-200/80 hover:border-slate-300 focus:border-blue-600"
                          }`}
                        />
                      </div>

                      {/* Email Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="email"
                            className="block text-sm font-medium text-slate-800"
                          >
                            Work Email <span className="text-blue-600">*</span>
                          </label>
                          {touched.email && errors.email && (
                            <span className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Invalid
                            </span>
                          )}
                        </div>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="name@company.com"
                          className={`rounded-xl bg-white border px-4 py-3 w-full text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-all duration-150 ${
                            touched.email && errors.email
                              ? "border-rose-400 bg-rose-50/20"
                              : "border-slate-200/80 hover:border-slate-300 focus:border-blue-600"
                          }`}
                        />
                      </div>

                      {/* Company Field */}
                      <div>
                        <label
                          htmlFor="company"
                          className="block text-sm font-medium text-slate-800 mb-1.5"
                        >
                          Company / Organization
                        </label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          placeholder="e.g. Vanguard Systems"
                          className="rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 focus:border-blue-600 px-4 py-3 w-full text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-all duration-150"
                        />
                      </div>

                      {/* Message Field */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="message"
                            className="block text-sm font-medium text-slate-800"
                          >
                            Project Scope & Details <span className="text-blue-600">*</span>
                          </label>
                          {touched.message && errors.message && (
                            <span className="text-xs text-rose-600 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Required
                            </span>
                          )}
                        </div>
                        <textarea
                          id="message"
                          name="message"
                          rows={4}
                          required
                          value={formData.message}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="Briefly describe your current architecture, timeline, and goals..."
                          className={`rounded-xl bg-white border px-4 py-3 w-full text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-all duration-150 resize-none ${
                            touched.message && errors.message
                              ? "border-rose-400 bg-rose-50/20"
                              : "border-slate-200/80 hover:border-slate-300 focus:border-blue-600"
                          }`}
                        />
                        {touched.message && errors.message && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{errors.message}</span>
                          </p>
                        )}
                      </div>

                      {submission.status === "error" && (
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>{submission.message}</span>
                        </div>
                      )}

                      <div className="pt-2">
                        <Button
                          type="submit"
                          variant="primary"
                          size="lg"
                          disabled={submission.status === "submitting"}
                          className="w-full justify-center min-h-[48px]"
                        >
                          {submission.status === "submitting" ? "Sending..." : "Send message"}
                        </Button>
                      </div>
                    </form>
                  )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. "What Happens Next" — Editorial horizontal index */}
      <section className="py-20 sm:py-24 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeader
            align="left"
            title="What Happens After You Reach Out"
            subtitle="Clear next steps from initial message to technical scoping."
          />

          <div className="divide-y divide-slate-200 border-y border-slate-200 mt-10">
            {timelineSteps.map((step) => (
              <div
                key={step.id}
                className="py-7 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-baseline"
              >
                <div className="md:col-span-3 flex items-baseline justify-between md:block gap-2">
                  <div className="text-sm font-semibold text-slate-900">{step.phase}</div>
                  <div className="text-xs font-mono text-slate-500 mt-0.5">{step.timeframe}</div>
                </div>
                <div className="md:col-span-9 grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-8 items-baseline">
                  <h3 className="lg:col-span-4 font-display text-xl font-bold text-slate-950 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="lg:col-span-8 text-slate-600 text-base font-normal leading-[1.6] [text-wrap:pretty]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CONTACT & INTAKE FAQ */}
      {contactFaqs.length > 0 && (
        <section className="py-20 sm:py-28 bg-slate-50/40">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <SectionHeader
              align="left"
              title="Engagement Questions"
              subtitle="Answers on onboarding timing, NDAs, and team location."
            />

            <div className="mt-12">
              <FaqList faqs={contactFaqs} surface="card" defaultOpenFirst />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
