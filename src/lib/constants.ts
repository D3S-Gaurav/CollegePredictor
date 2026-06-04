/** All available categories for JEE counselling */
export const CATEGORIES = ["OPEN", "EWS", "OBC-NCL", "SC", "ST"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Gender options */
export const GENDERS = ["Gender-Neutral", "Female-only (Supernumerary)"] as const;
export type Gender = (typeof GENDERS)[number];

/** Counselling types */
export const COUNSELLING_TYPES = ["JOSAA", "CSAB"] as const;
export type CounsellingType = (typeof COUNSELLING_TYPES)[number];

/** Institute types */
export const INSTITUTE_TYPES = ["NIT", "IIIT", "GFTI"] as const;
export type InstituteType = (typeof INSTITUTE_TYPES)[number];

/** Available years */
export const YEARS = [2024, 2025] as const;

/** Branch group definitions for quick filtering */
export const BRANCH_GROUPS = {
  "CSE Related": [
    "Computer Science and Engineering",
    "Computer Science",
    "CSE",
    "Artificial Intelligence",
    "AI",
    "AI and Data Science",
    "AIDS",
    "Information Technology",
    "IT",
    "Data Science",
    "Machine Learning",
    "Computer Engineering",
    "Software Engineering",
    "Cyber Security",
    "AI and ML",
    "Computer Science and Business",
  ],
  "Circuital": [
    "Electronics and Communication Engineering",
    "ECE",
    "Electrical Engineering",
    "EE",
    "Electrical and Electronics Engineering",
    "EEE",
    "Instrumentation",
    "Instrumentation and Control",
    "Electronics",
    "Electronics and Instrumentation",
    "Microelectronics",
  ],
  "Core Engineering": [
    "Mechanical Engineering",
    "Civil Engineering",
    "Chemical Engineering",
    "Production Engineering",
    "Production and Industrial",
    "Metallurgical Engineering",
    "Mining Engineering",
    "Textile Engineering",
    "Manufacturing",
  ],
} as const;

/** Indian states for Home State selector */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Chandigarh",
  "Ladakh",
  "Lakshadweep",
  "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu",
] as const;

/** Prediction confidence thresholds */
export const CONFIDENCE_THRESHOLDS = {
  SAFE: 0.8,
  LIKELY: 1.0,
  DREAM: 1.2,
} as const;

export type ConfidenceLevel = "SAFE" | "LIKELY" | "DREAM" | "REACH";
