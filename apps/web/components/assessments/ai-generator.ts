import {
  createId,
  type AiGeneratorConfig,
  type AssessmentPolicy,
  type AssessmentQuestion,
  type Difficulty,
  type QuestionType,
} from "./types";

type QuestionTemplate = {
  topics: string[];
  type: QuestionType;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
};

const templates: QuestionTemplate[] = [
  {
    topics: ["access control", "least privilege", "permissions"],
    type: "MULTIPLE_CHOICE",
    prompt: "Which of the following best describes the principle of Least Privilege?",
    choices: [
      "Giving users more access than they need to complete their tasks",
      "Limiting user access to only what is necessary to perform their duties",
      "Sharing accounts to make work easier for the team",
      "Allowing administrators to access all systems at all times",
    ],
    correctIndex: 1,
    explanation:
      "Least Privilege means users hold only the minimum access needed for their role, which limits the damage a compromised or misused account can cause.",
  },
  {
    topics: ["password security", "credentials", "authentication"],
    type: "TRUE_FALSE",
    prompt: "Passwords should never be shared with anyone, including supervisors.",
    choices: ["True", "False"],
    correctIndex: 0,
    explanation:
      "Credentials are personal. Sharing them removes accountability because system activity can no longer be traced to one individual.",
  },
  {
    topics: ["password security", "credentials"],
    type: "MULTIPLE_CHOICE",
    prompt: "Which of the following is considered a strong password?",
    choices: [
      "password123",
      "Your first name followed by your birth year",
      "A passphrase of at least 12 characters mixing words, numbers, and symbols",
      "The same password used for personal accounts",
    ],
    correctIndex: 2,
    explanation:
      "Length contributes more to password strength than complexity alone, and the password must be unique to prevent credential stuffing.",
  },
  {
    topics: ["incident response", "reporting"],
    type: "MULTIPLE_CHOICE",
    prompt: "What should you do first if you suspect a security incident?",
    choices: [
      "Wait to see whether the issue resolves itself",
      "Report it to the Information Security team immediately",
      "Attempt to fix it yourself before telling anyone",
      "Discuss it with colleagues before escalating",
    ],
    correctIndex: 1,
    explanation:
      "Immediate reporting limits the blast radius. The security team owns containment, investigation, and any regulatory notification.",
  },
  {
    topics: ["data protection", "encryption", "data transfer"],
    type: "MULTIPLE_CHOICE",
    prompt: "How should confidential customer records be sent to an external auditor?",
    choices: [
      "As an unprotected email attachment",
      "Through the approved encrypted file transfer service",
      "On a personal USB drive",
      "Through a personal cloud storage account",
    ],
    correctIndex: 1,
    explanation:
      "Only approved encrypted channels provide both the transport security and the audit trail required for confidential customer data.",
  },
  {
    topics: ["physical security", "clear desk", "workstation"],
    type: "TRUE_FALSE",
    prompt: "It is acceptable to leave your workstation unlocked when stepping away briefly.",
    choices: ["True", "False"],
    correctIndex: 1,
    explanation:
      "The clear desk and clear screen rule requires locking your workstation every time you leave it, no matter how short the absence.",
  },
  {
    topics: ["phishing", "social engineering", "email"],
    type: "MULTIPLE_CHOICE",
    prompt: "Which of these is the strongest indicator of a phishing email?",
    choices: [
      "It was sent during business hours",
      "It urgently requests credentials or a change of payment details",
      "It contains the company logo",
      "It addresses you by name",
    ],
    correctIndex: 1,
    explanation:
      "Urgency paired with a request for credentials or payment changes is the most reliable signal. Logos and personalisation are trivial to fake.",
  },
  {
    topics: ["access control", "review", "audit"],
    type: "MULTIPLE_CHOICE",
    prompt: "How often must access rights for privileged accounts be reviewed?",
    choices: ["Annually", "Every six months", "Quarterly", "Only when an employee leaves"],
    correctIndex: 2,
    explanation:
      "A quarterly review prevents entitlement creep, where users accumulate access they no longer need.",
  },
  {
    topics: ["data protection", "devices", "mobile"],
    type: "TRUE_FALSE",
    prompt: "Company data may be stored on a personal device as long as the device has a password.",
    choices: ["True", "False"],
    correctIndex: 1,
    explanation:
      "Company data may only be stored on managed devices enrolled in the bank's mobile device management programme.",
  },
  {
    topics: ["governance", "responsibility"],
    type: "MULTIPLE_CHOICE",
    prompt: "Who is responsible for protecting the bank's information assets?",
    choices: [
      "The IT department only",
      "The Information Security team only",
      "Every employee, contractor, and third party with access",
      "Location managers only",
    ],
    correctIndex: 2,
    explanation:
      "Information security is a shared responsibility that applies to everyone granted access to bank systems or data.",
  },
  {
    topics: ["data classification", "handling"],
    type: "MULTIPLE_CHOICE",
    prompt: "A document contains customer account numbers. How should it be classified?",
    choices: ["Public", "Internal", "Confidential", "No classification is required"],
    correctIndex: 2,
    explanation:
      "Customer account data is Confidential. That classification drives the encryption, retention, and sharing controls that must be applied.",
  },
  {
    topics: ["third party", "vendors"],
    type: "TRUE_FALSE",
    prompt: "Third-party vendors must sign a confidentiality agreement before being granted system access.",
    choices: ["True", "False"],
    correctIndex: 0,
    explanation:
      "Vendor access is only granted after a confidentiality agreement and a security review have been completed.",
  },
  {
    topics: ["business continuity", "backup"],
    type: "MULTIPLE_CHOICE",
    prompt: "Where should critical work files be stored so they are backed up?",
    choices: [
      "On the local desktop",
      "On the approved network or cloud location",
      "In a personal email account",
      "On an external hard drive at home",
    ],
    correctIndex: 1,
    explanation:
      "Only approved network and cloud locations are covered by the backup and recovery schedule.",
  },
  {
    topics: ["social engineering", "phone", "verification"],
    type: "MULTIPLE_CHOICE",
    prompt:
      "A caller claiming to be from IT asks for your password to fix an urgent issue. What should you do?",
    choices: [
      "Provide the password because the request is urgent",
      "Refuse and report the call to the Information Security team",
      "Give a partial password to verify their identity",
      "Ask a colleague to share theirs instead",
    ],
    correctIndex: 1,
    explanation:
      "IT will never ask for your password. This is a classic pretexting attack and must be reported.",
  },
];

function scoreTemplate(template: QuestionTemplate, focusTerms: string[]) {
  if (focusTerms.length === 0) {
    return 0;
  }

  return focusTerms.reduce((score, term) => {
    const matchesTopic = template.topics.some((topic) => topic.includes(term) || term.includes(topic));
    const matchesPrompt = template.prompt.toLowerCase().includes(term);

    return score + (matchesTopic ? 2 : 0) + (matchesPrompt ? 1 : 0);
  }, 0);
}

function difficultyFor(config: AiGeneratorConfig, index: number): Difficulty {
  if (config.bloomLevel === "MIXED_ALL" || config.bloomLevel === "MIXED_UNDERSTAND_APPLY") {
    const rotation: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
    return rotation[index % rotation.length];
  }

  return config.difficulty;
}

/**
 * Produces draft questions for the AI Assistant tab.
 *
 * This is the single integration point for real generation: replace the body
 * with a call to the backend (which already has an OpenAI client in
 * PolicyAnalysisService) and the rest of the tab keeps working unchanged.
 */
export async function generateAssessmentQuestions(
  config: AiGeneratorConfig,
  policy: AssessmentPolicy,
): Promise<AssessmentQuestion[]> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const focusTerms = config.focusAreas
    .toLowerCase()
    .split(/[,\n]/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

  const allowedTypes = config.questionTypes.length > 0 ? config.questionTypes : (["MULTIPLE_CHOICE"] as QuestionType[]);

  const ranked = templates
    .filter((template) => allowedTypes.includes(template.type))
    .map((template, index) => ({ template, index, score: scoreTemplate(template, focusTerms) }))
    .sort((a, b) => (b.score === a.score ? a.index - b.index : b.score - a.score))
    .map((entry) => entry.template);

  if (ranked.length === 0) {
    return [];
  }

  return Array.from({ length: config.questionCount }, (_, index) => {
    const template = ranked[index % ranked.length];
    const id = createId("ai");
    const options = template.choices.map((text, choiceIndex) => ({
      id: `${id}-opt-${choiceIndex}`,
      text,
    }));

    return {
      id,
      type: template.type,
      prompt: template.prompt,
      options,
      correctOptionId: options[template.correctIndex].id,
      explanation: `${template.explanation} (Source: ${policy.fileName})`,
      points: 1,
      difficulty: difficultyFor(config, index),
      aiGenerated: true,
    } satisfies AssessmentQuestion;
  });
}
