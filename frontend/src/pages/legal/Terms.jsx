import LegalPage from "./LegalPage";

const SECTIONS = [
  {
    heading: "Acceptance of terms",
    body: "By accessing or using LearNova (the “Service”), you agree to be bound by these Terms of Use. If you do not agree, please do not use the Service.",
  },
  {
    heading: "Your account",
    body: "You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must provide accurate information when creating an account and keep it up to date. Notify us immediately at support@learnova.app if you suspect unauthorised use.",
  },
  {
    heading: "Courses and enrolment",
    body: "Enrolment grants you a personal, non-transferable licence to view the course content for which you have enrolled. You may not copy, redistribute, resell or publicly share course materials without the instructor's and LearNova's written permission.",
  },
  {
    heading: "Instructor responsibilities",
    body: "Instructors own the content they publish and are responsible for its accuracy, quality and legality. Instructors must not publish content that infringes third-party rights, contains malware, or violates applicable law. LearNova may remove content or suspend accounts that breach these terms.",
  },
  {
    heading: "Payments and refunds",
    body: "Paid courses are priced in Indian Rupees (₹). Purchases are final unless a refund is required by applicable law or offered by the instructor. LearNova does not store payment card details.",
  },
  {
    heading: "Prohibited conduct",
    body: "You agree not to: abuse or harass other users; scrape or crawl the Service; attempt to gain unauthorised access to accounts or systems; upload malicious content; or use the Service for any unlawful purpose.",
  },
  {
    heading: "Content ownership",
    body: "LearNova's interface, branding and platform software remain the property of LearNova. Course content remains the property of the respective instructors. Feedback you submit may be used to improve the Service.",
  },
  {
    heading: "Termination",
    body: "We may suspend or terminate access to the Service for conduct that violates these terms, harms other users, or creates legal risk. You may close your account at any time from your profile settings.",
  },
  {
    heading: "Disclaimers and limitation of liability",
    body: "The Service is provided “as is” without warranties of any kind. To the maximum extent permitted by law, LearNova is not liable for indirect, incidental or consequential damages arising from your use of the Service.",
  },
  {
    heading: "Changes to these terms",
    body: "We may update these terms from time to time. Material changes will be announced on the Service. Continued use after changes take effect constitutes acceptance of the revised terms.",
  },
];

export default function Terms() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Use"
      updated="23 October 2026"
      intro="Welcome to LearNova. These Terms of Use govern your access to and use of the LearNova platform, including our website, courses and related services. Please read them carefully."
      sections={SECTIONS}
    />
  );
}
