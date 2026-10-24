import LegalPage from "./LegalPage";

const SECTIONS = [
  {
    heading: "Information we collect",
    body: "We collect information you provide directly: your name, email address, password (stored only as a salted hash), profile details, course enrolments, lesson progress and reviews. When you sign in with Google, we receive your name, email address and profile picture from Google.",
  },
  {
    heading: "How we use your information",
    body: "We use your information to operate the Service: authenticating you, showing your courses and progress, personalising recommendations, processing purchases, and sending transactional messages such as enrolment confirmations.",
  },
  {
    heading: "What we do not do",
    body: "We do not sell your personal information. We do not store payment card numbers — payments are handled by our payment processors. We do not use your account content for advertising.",
  },
  {
    heading: "Cookies and local storage",
    body: "We use browser storage to keep you signed in and to remember your theme preference. If you choose “Keep me signed in”, your session token is stored on your device until you log out.",
  },
  {
    heading: "Third-party services",
    body: "The Service uses Google Sign-In for authentication (Google Privacy Policy applies to Google's processing) and a payment processor for purchases. Course video content may be delivered by a content delivery network.",
  },
  {
    heading: "Data retention",
    body: "We keep account data while your account is active. You may request deletion of your account and associated personal data at any time by emailing support@learnova.app. Some records (such as completed purchases) may be retained where required by law.",
  },
  {
    heading: "Security",
    body: "Passwords are hashed with bcrypt. Sessions use signed JWT tokens. Access to production data is restricted to authorised personnel. No system is perfectly secure, and we encourage you to use a strong, unique password.",
  },
  {
    heading: "Your rights",
    body: "Depending on your location, you may have rights to access, correct, export or delete your personal data, and to object to certain processing. Contact support@learnova.app to exercise these rights.",
  },
  {
    heading: "Children",
    body: "The Service is not directed to children under 13 (or the minimum age in your jurisdiction). We do not knowingly collect data from children.",
  },
  {
    heading: "Changes to this policy",
    body: "We may update this Privacy Policy from time to time. Material changes will be announced on the Service. Continued use after changes take effect constitutes acceptance.",
  },
];

export default function Privacy() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="23 October 2026"
      intro="This Privacy Policy explains how LearNova collects, uses and protects your personal information when you use our learning platform."
      sections={SECTIONS}
    />
  );
}
