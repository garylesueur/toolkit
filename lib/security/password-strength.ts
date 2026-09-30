export type PasswordStrength = {
  estimatedEntropy: number;
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
  score: 0 | 1 | 2 | 3 | 4;
  suggestions: string[];
  warnings: string[];
};

const COMMON_WORDS = [
  "password",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "login",
  "secret",
  "dragon",
  "football",
  "monkey",
];

const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
];

function characterPool(password: string) {
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/\d/.test(password)) pool += 10;
  if (/[^A-Za-z0-9]/.test(password)) pool += 33;
  return pool;
}

export function hasSequence(password: string, minimumLength = 4) {
  const lower = password.toLowerCase();
  const reversed = [...lower].reverse().join("");
  return SEQUENCES.some((sequence) => {
    for (let index = 0; index <= sequence.length - minimumLength; index++) {
      const part = sequence.slice(index, index + minimumLength);
      if (lower.includes(part) || reversed.includes(part)) return true;
    }
    return false;
  });
}

export function analysePassword(password: string): PasswordStrength {
  if (!password) {
    return {
      estimatedEntropy: 0,
      label: "Very weak",
      score: 0,
      suggestions: ["Enter a password to analyse."],
      warnings: [],
    };
  }

  const lower = password.toLowerCase();
  const warnings: string[] = [];
  let penalty = 0;
  if (password.length < 12) {
    warnings.push("It is shorter than 12 characters.");
    penalty += (12 - password.length) * 2;
  }
  if (COMMON_WORDS.some((word) => lower.includes(word))) {
    warnings.push("It contains a commonly guessed word.");
    penalty += 28;
  }
  if (/(.)\1{2,}/i.test(password)) {
    warnings.push("It contains repeated characters.");
    penalty += 14;
  }
  if (hasSequence(password)) {
    warnings.push("It contains a predictable sequence or keyboard walk.");
    penalty += 18;
  }
  if (/(?:19|20)\d{2}/.test(password) || /\b\d{6,8}\b/.test(password)) {
    warnings.push("It contains a date-like number pattern.");
    penalty += 12;
  }
  if (/^[A-Za-z]+\d{1,4}[!?.]?$/.test(password)) {
    warnings.push("It follows a common word-plus-number pattern.");
    penalty += 12;
  }
  const uniqueRatio = new Set(password).size / password.length;
  if (password.length >= 8 && uniqueRatio < 0.5) {
    warnings.push("It uses relatively few unique characters.");
    penalty += 12;
  }

  const pool = characterPool(password);
  const rawEntropy = pool > 1 ? password.length * Math.log2(pool) : 0;
  const estimatedEntropy = Math.max(0, Math.round(rawEntropy - penalty));
  const score: 0 | 1 | 2 | 3 | 4 =
    estimatedEntropy >= 80 && password.length >= 14 && warnings.length === 0
      ? 4
      : estimatedEntropy >= 60 && password.length >= 12
        ? 3
        : estimatedEntropy >= 40 && password.length >= 10
          ? 2
          : estimatedEntropy >= 24
            ? 1
            : 0;
  const labels = [
    "Very weak",
    "Weak",
    "Fair",
    "Strong",
    "Very strong",
  ] as const;
  const suggestions: string[] = [];
  if (password.length < 14)
    suggestions.push(
      "Use 14 or more characters; length is usually the biggest improvement.",
    );
  if (warnings.length > 0)
    suggestions.push(
      "Replace predictable words, dates, repeats, and sequences.",
    );
  if (characterPool(password) < 62)
    suggestions.push(
      "Mix character types when the site allows it, without sacrificing length.",
    );
  if (score < 4)
    suggestions.push(
      "Consider a password manager-generated password or several unrelated words.",
    );

  return {
    estimatedEntropy,
    label: labels[score],
    score,
    suggestions: [...new Set(suggestions)],
    warnings,
  };
}
