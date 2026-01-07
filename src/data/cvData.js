export const cvData = {
  personal: {
    name: "Jim Lam",
    title: "Software Engineer",
    email: "jim.sebastian.lam@gmail.com",
    uniEmail: "jl03093@surrey.ac.uk",
    linkedin: "https://www.linkedin.com/in/jim-l-3154a0102/",
    github: "https://github.com/sebastianlam",
    alumni: "University of Surrey",
    location: "Guildford / Hong Kong",
  },
  skills: [
    { name: "C++", category: "Programming Languages", level: 80 },
    { name: "Python", category: "Programming Languages", level: 90 },
    { name: "Node.js", category: "Programming Languages", level: 85 },
    { name: "Java", category: "Programming Languages", level: 80 },
    { name: "LaTeX", category: "Programming Languages", level: 75 },
    { name: "Clojure", category: "Programming Languages", level: 80 },
    { name: "ClojureScript", category: "Programming Languages", level: 80 },
    { name: "SQL", category: "Programming Languages", level: 80 },
    { name: "HTML", category: "Programming Languages", level: 90 },
    { name: "CSS", category: "Programming Languages", level: 85 },
    { name: "PHP", category: "Programming Languages", level: 80 },
    { name: "Shell Scripting", category: "Programming Languages", level: 85 },
    { name: "Swift", category: "Programming Languages", level: 70 },
    { name: "Haskell", category: "Programming Languages", level: 60 },
    { name: "Prolog", category: "Programming Languages", level: 60 },
    { name: "Next.js", category: "Frameworks & Libraries", level: 75 },
    { name: "Vue.js", category: "Frameworks & Libraries", level: 85 },
    { name: "Flutter", category: "Frameworks & Libraries", level: 80 },
    { name: "Three.js", category: "Frameworks & Libraries", level: 70 },
    { name: "SwiftUI", category: "Frameworks & Libraries", level: 75 },
    { name: "Express.js", category: "Frameworks & Libraries", level: 80 },
    { name: "AWS", category: "Cloud Platforms", level: 75 },
    { name: "OCI", category: "Cloud Platforms", level: 65 },
    { name: "Heroku", category: "Cloud Platforms", level: 70 },
    { name: "Git", category: "Version Control", level: 90 },
    { name: "3D Modelling", category: "Design Tools", level: 85, children: [
      { name: "Blender", level: 90 },
      { name: "Rhino", level: 85 },
      { name: "Grasshopper", level: 80 }
    ]},
    { name: "2D Design", category: "Design Tools", level: 80, children: [
      { name: "Photoshop", level: 85 },
      { name: "Illustrator", level: 80 },
      { name: "InDesign", level: 75 },
      { name: "Figma", level: 85 }
    ]},
    { name: "Project Coordination", category: "Software Development", level: 85 },
    { name: "Documentation", category: "Software Development", level: 85 },
    { name: "Test-Driven Development (TDD)", category: "Software Development", level: 80 },
  ],
  languages: [
    { name: "English", level: "IELTS 8.5" },
    { name: "Cantonese", level: "Native" },
    { name: "German", level: "Intermediate" },
    { name: "Mandarin", level: "Fluent" },
  ],
  experience: [
    {
      role: "Test Analyst Intern",
      company: "Fime",
      period: "September 2025 - Present",
      tags: ["testing", "qa", "L2", "EMVco", "VISA", "contactless", "FIME"],
      description: "Performing L2 testing for terminals in the EMVco contact and VISA contactless schemes, ensuring compliance and reliability for payment systems during a full-time placement year."
    },
    {
      role: "Team Lead & TT&C Lead",
      company: "Peryton Space Satellite Design Competition",
      period: "September 2025 - Present",
      tags: ["leadership", "space", "satellite", "telemetry", "tracking", "command", "SDC", "C++", "Next.js"],
      description: "Spearheading the Peryton Space team for the current competition cycle, managing overall technical direction and continuing to lead the Telemetry, Tracking, and Command workstream."
    },
    {
      role: "TT&C Team Lead",
      company: "Peryton Space Society",
      period: "September 2024 - July 2025",
      tags: ["space", "satellite", "telemetry", "tracking", "command", "leadership", "UKSEDS", "award", "innovation"],
      highlights: [
        "Led the Telemetry, Tracking, and Command workstream for the UKSEDS satellite design competition entry.",
        "Optimised communications configuration for link resilience (antenna selection, error correction, compression) and built ground station tooling (telemetry dashboard and command interface).",
        "Won the Best Innovation Award at the Airbus Defence and Space Stevenage site."
      ]
    },
    {
      role: "LAB Pal for COM1026 & Buddy Scheme Mentor",
      company: "University of Surrey",
      period: "Present",
      tags: ["university", "mentoring", "mathematics", "probability", "automata"],
      description: "Proactively supported and guided students in discrete mathematics, automata theory, and probability. Provided personal academic advice to first-year students, consistently fostering a collaborative and high-achieving learning environment."
    },
    {
      role: "Computer Vision Lead",
      company: "Sports Vision",
      period: "Present",
      tags: ["computer-vision", "yolo", "python", "pyside", "blender", "synthetic-data", "backend"],
      description: "Architected and spearheaded the development of a computer vision backend for a visual snooker scoring system using YOLO. Designed and implemented a custom image annotation tool with PySide6 and currently driving synthetic data generation via the Blender Python API to enhance system accuracy."
    },
    {
      role: "English Tutor",
      company: "Freelance",
      period: "Q2 2021 - Present",
      tags: ["teaching", "english", "stem", "tutoring"],
      description: "Deliver tailored, advanced-level English tutoring with a focus on STEM terminology, significantly improving students' technical vocabulary and domain knowledge."
    },
    {
      role: "Software Engineer",
      company: "Next Token Solutions",
      period: "October 2020 - December 2022",
      tags: ["fintech", "aws", "php", "clojure", "vue", "mysql", "s3", "apache", "ec2", "flutter", "ios"],
      highlights: [
        "Supported web development for Finmonster, a fintech platform designed for local SME loan matching.",
        "Automated server management tasks on AWS using Shell scripting to streamline operations.",
        "Performed platform maintenance and executed a successful stack migration (PHP, jQuery, Vue.js, Clojure, MySQL, S3, Apache on EC2).",
        "Gathered client requirements and prepared effective proposals in a project coordination role.",
        "Drove mobile app development with Flutter and native iOS, migrating legacy React Native apps."
      ]
    },
    {
      role: "Part-Time Developer",
      company: "Tommax",
      period: "June 2020 - October 2020",
      tags: ["e-commerce", "php", "client", "translation", "marketing"],
      description: "Collaborated directly with clients on e-commerce solutions and PHP web development projects. Enhanced company communications by providing strategic translation services and producing region-specific subtitling for marketing campaigns."
    },
    {
      role: "Team Member",
      company: "Barangaroo Promenade Pavilion Design Competition",
      period: "Summer 2020",
      tags: ["architecture", "competition", "parametric-design", "pavilion"],
      description: "Jointly put forward a pavilion design competition entry with a holistic approach to create a functional public shelter, through a supersized parametric take of the Aboriginal coolamon."
    },
    {
      role: "Audio Assistant",
      company: "“Innonation” Live Music Company",
      period: "December 2018",
      tags: ["audio", "events", "live", "installation"],
      description: "Managed live audio equipment installations for high-profile events across Hong Kong, ensuring reliable operational performance under demanding time and physical constraints."
    },
    {
      role: "Finalist",
      company: "HKU Decacorn Entrepreneurial Camp Case Competition",
      period: "June 2018",
      tags: ["entrepreneurship", "competition", "startup", "pitch"],
      description: "Conceived and pitched a startup proposal for an integrated knowledge and graduate headhunting platform within 24 hours, grounded on strategic insight from HKU industry advisors."
    }
  ],
  projects: [
    {
      title: "Lidl Spending Dashboard",
      status: "Currently Offline",
      isBroken: true,
      tags: ["dashboard", "data-visualisation", "python", "forecasting", "anomaly-detection", "treemap"],
      description: "Interactive personal finance dashboard covering 25 months of supermarket receipts with category treemaps, monthly spend trends, anomaly detection, and short-term forecasts.",
      link: "http://193.123.178.35/dashboard"
    },
    {
      title: "URL+",
      status: "Present",
      tags: ["clojurescript", "plugin", "logseq", "tailwindcss", "rum"],
      description: "Contributor to the only ClojureScript plugin for Logseq. Developed features to retrieve and organise URL responses and deliver dictionary-style definitions."
    },
    {
      title: "DrunkGPT",
      status: "Present",
      tags: ["cli", "accessibility", "voice", "llm", "tts", "stt"],
      description: "Developed an accessibility-centric, command-line LLM client featuring a pioneering voice interface."
    }
  ],
  education: [
    {
      school: "University of Surrey",
      degree: "BSc (Hons.) in Computer Science with PTY",
      period: "September 2023 - August 2027",
      details: "Year-one aggregate: 86.13%. Active member of the Mountaineering Club.",
      tags: ["university", "satellite", "telemetry", "tracking", "command", "leadership", "space"]
    },
    {
      school: "University of Sydney",
      degree: "Bachelor of Design in Architecture (Hons.)",
      period: "January 2019 - August 2020",
      tags: ["architecture", "university", "sydney", "design"]
    },
    {
      school: "Diocesan Boys’ School",
      degree: "Secondary Education",
      period: "September 2014 - August 2018",
      details: "Academic Electives: Physics, Chemistry, Biology",
      tags: ["secondary", "hong-kong", "science", "physics", "chemistry", "biology"]
    }
  ],
  interests: "Bouldering/Climbing (V7/7A+), Debating, Piano Improv, Flight Simulation (X-Plane 12)"
};
