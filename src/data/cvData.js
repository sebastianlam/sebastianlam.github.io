export const cvData = {
  personal: {
    name: "Jim Lam",
    title: "Test Analyst | VP Missions, Peryton Space",
    email: "jim.sebastian.lam@gmail.com",
    uniEmail: "jl03093@surrey.ac.uk",
    linkedin: "https://www.linkedin.com/in/jim-l-3154a0102/",
    github: "https://github.com/sebastianlam",
    cv: "/cv.pdf",
    alumni: "University of Surrey",
    location: "Guildford / Hong Kong",
  },
  skills: [
    // Languages
    { name: "C++", category: "Languages", level: 90 },
    { name: "Python", category: "Languages", level: 90 },
    { name: "Clojure / CLJS", category: "Languages", level: 85 },
    { name: "Swift", category: "Languages", level: 80 },
    { name: "Node.js", category: "Languages", level: 85 },
    { name: "PHP", category: "Languages", level: 80 },
    { name: "SQL", category: "Languages", level: 85 },
    { name: "Shell Scripting", category: "Languages", level: 85 },

    // AI & Computer Vision
    {
      name: "Computer Vision", category: "AI & Computer Vision", level: 85, children: [
        { name: "YOLO", level: 90 },
        { name: "AprilTags", level: 85 },
        { name: "Synthetic Data (Blender API)", level: 85 },
        { name: "PySide6", level: 80 }
      ]
    },
    {
      name: "LLM Orchestration", category: "AI & Computer Vision", level: 80, children: [
        { name: "TTS / STT", level: 85 },
        { name: "Voice Interfaces", level: 80 }
      ]
    },
    {
      name: "Data Analytics", category: "AI & Computer Vision", level: 80, children: [
        { name: "Data Visualisation", level: 85 },
        { name: "Forecasting", level: 80 },
        { name: "Anomaly Detection", level: 75 }
      ]
    },

    // Specialised Engineering
    {
      name: "Space Systems", category: "Specialised Engineering", level: 85, children: [
        { name: "Telemetry & Tracking (TT&C)", level: 90 },
        { name: "Link Resilience", level: 85 },
        { name: "Satellite Design", level: 80 }
      ]
    },
    {
      name: "Payment Systems", category: "Specialised Engineering", level: 80, children: [
        { name: "EMVCo / VISA / AMEX L2", level: 85 },
        { name: "PURE & CCD Card Testing", level: 80 }
      ]
    },
    { name: "Fintech", category: "Specialised Engineering", level: 85 },

    // Web & Mobile
    { name: "Next.js", category: "Web & Mobile", level: 85 },
    { name: "Vue.js", category: "Web & Mobile", level: 85 },
    { name: "Flutter", category: "Web & Mobile", level: 80 },
    { name: "Three.js", category: "Web & Mobile", level: 75 },
    { name: "Tailwind CSS", category: "Web & Mobile", level: 90 },

    // Infrastructure
    {
      name: "AWS", category: "Infrastructure", level: 80, children: [
        { name: "EC2", level: 85 },
        { name: "S3", level: 90 }
      ]
    },
    { name: "Backend Architecture", category: "Infrastructure", level: 85 },

    // Design & 3D
    {
      name: "3D Modelling", category: "Design & 3D", level: 85, children: [
        { name: "Blender", level: 90 },
        { name: "Rhino / Grasshopper", level: 85 }
      ]
    },
    { name: "Figma", category: "Design & 3D", level: 85 },
  ],
  languages: [
    { name: "English", level: "IELTS 8.5" },
    { name: "Cantonese", level: "Native" },
    { name: "German", level: "Intermediate" },
    { name: "Mandarin", level: "Fluent" },
  ],
  experience: [
    {
      role: "Test Analyst",
      company: "Fime",
      period: "September 2025 - Present",
      tags: ["testing", "verification", "EMVCo", "VISA", "AMEX", "PURE", "CCD", "python", "LLM"],
      highlights: [
        "Progressed from a full-time intern (Sep 2025 - Sep 2026) to part-time Test Analyst (Sep 2026 - Present), working on-site in Guildford.",
        "Supported Type Approval campaigns where payment kernels had to meet scheme requirements, testing EMVCo Contact Level 2 and VISA/AMEX contactless kernels alongside PURE and CCD cards.",
        "Vendor-locked testing tools made logs difficult to use in reports; wrote custom parsers to turn them into the required reporting documents.",
        "To reduce token use when working with PDF specifications, built a local LLM parser that uses fewer tokens than pypdf."
      ]
    },
    {
      role: "VP Missions; Team Lead & TT&C Lead (UKSEDS SDC)",
      company: "Peryton Space",
      period: "September 2024 - Present",
      tags: ["space", "satellite", "TT&C", "computer-vision", "AprilTags", "C++", "Next.js", "Cloudflare", "ECSS"],
      highlights: [
        "As VP Missions (May 2026 - Present), mentored the Olympus Rover, Satellite Design, and Airbus Space competition teams; also moved the society website from WordPress to Cloudflare.",
        "As Team Lead and TT&C Lead (Sep 2025 - Jul 2026), tackled depth mapping for a 3U CubeSat lunar simulation with stereoscopic computer vision, led ECSS PDR/CDR reviews, and finished 6th out of 20 teams nationally.",
        "As TT&C and Payload Lead (Sep 2024 - Jul 2025), addressed navigation and communications within mass and budget constraints using AprilTags, attitude/orbit control, link-margin analysis, low-latency video, and a Next.js/C++ ground station; the team received the Airbus Defence and Space Best Innovation Award."
      ]
    },
    {
      role: "LAB Pal for COM1026 & Buddy Scheme Mentor",
      company: "University of Surrey",
      period: "September 2024 - June 2025",
      tags: ["university", "mentoring", "mathematics", "probability", "automata"],
      highlights: [
        "To help first-year students work through abstract course material, supported COM1026 lab sessions in discrete mathematics, automata theory, and probability, alongside ongoing academic mentoring through the Buddy Scheme."
      ]
    },
    {
      role: "Computer Vision Lead",
      company: "Sports Vision",
      period: "2023 - 2024",
      tags: ["computer-vision", "yolo", "python", "pyside", "blender", "synthetic-data", "backend"],
      highlights: [
        "To power a visual snooker scoring system, built a YOLO computer-vision backend and the supporting data workflow: a PySide6 annotation tool and synthetic training data generated with Blender's Python API."
      ]
    },
    {
      role: "Software Developer",
      company: "Next Token Solutions",
      period: "October 2020 - January 2023",
      tags: ["fintech", "aws", "php", "clojure", "vue", "mysql", "s3", "apache", "ec2", "flutter", "ios"],
      highlights: [
        "Finmonster needed ongoing product development as an SME loan-matching platform; built and maintained its web features.",
        "Automated AWS server-management tasks with shell scripts to replace manual execution.",
        "Delivered a full-stack migration across PHP, jQuery, Vue.js, Clojure, MySQL, S3, and Apache on EC2.",
        "To move beyond legacy React Native apps, developed mobile applications in Flutter and native iOS, while also gathering client requirements and preparing proposals."
      ]
    },
    {
      role: "English Tutor",
      company: "Freelance",
      period: "Q2 2021 - Q1 2023",
      tags: ["teaching", "english", "stem", "tutoring"],
      highlights: [
        "To help Years 6-8 students use technical language with confidence, tutored English with a focus on STEM terminology and vocabulary."
      ]
    },
    {
      role: "Part-Time Web Developer",
      company: "Tommax",
      period: "January 2020 - October 2021",
      tags: ["e-commerce", "php", "client", "translation", "marketing"],
      highlights: [
        "Worked with clients to deliver e-commerce solutions and PHP development, then adapted marketing campaigns for regional audiences through translation and subtitling."
      ]
    },
    {
      role: "Team Member",
      company: "Barangaroo Promenade Pavilion Design Competition",
      period: "Summer 2020",
      tags: ["architecture", "competition", "parametric-design", "pavilion"],
      highlights: [
        "For a public-shelter design competition, co-designed a pavilion entry around a parametric interpretation of the Aboriginal coolamon."
      ]
    },
    {
      role: "Audio Assistant",
      company: "“Innonation” Live Music Company",
      period: "December 2018",
      tags: ["audio", "events", "live", "installation"],
      highlights: [
        "To support live performances and events, installed and operated audio equipment for concerts, weddings, and corporate events across Hong Kong."
      ]
    },
    {
      role: "Finalist",
      company: "HKU Decacorn Entrepreneurial Camp Case Competition",
      period: "June 2018",
      tags: ["entrepreneurship", "competition", "startup", "pitch"],
      highlights: [
        "With 24 hours to develop a case, shaped and pitched a proposal for an integrated knowledge and graduate headhunting platform with guidance from HKU mentors, reaching finalist stage."
      ]
    }
  ],
  projects: [
    {
      title: "peryton.space",
      status: "Live",
      tags: ["cloudflare", "web", "migration", "space"],
      description: "Peryton Space society website, rebuilt and migrated from WordPress onto Cloudflare.",
      link: "https://peryton.space"
    },
    {
      title: "DrunkGPT",
      status: "Open Source",
      tags: ["cli", "accessibility", "voice", "llm", "tts", "stt"],
      description: "CLI LLM client with a voice interface, built when OpenAI opened the public GPT-3.5 API.",
      link: "https://github.com/sebastianlam/drunkgpt"
    },
    {
      title: "URL+",
      status: "Open Source",
      tags: ["clojurescript", "plugin", "logseq", "tailwindcss", "rum"],
      description: "Contributor to the ClojureScript Logseq plugin for fetching URLs and displaying dictionary-style definitions."
    }
  ],
  bio: [
    "I started my journey in parametric architecture in Sydney, where I first learned to appreciate the rhythm of precise design. Over time, I realized that my interest in how structures are built was naturally shifting towards the digital systems that power them. I've always been driven by a quiet curiosity to understand not just how a system works, but how it handles failure and where its true limits lie.",
    "Moving from the drafting table to the terminal felt less like a career change and more like a return to first principles. Whether I'm working on satellite link resilience, experimenting with computer vision backends, or exploring the functional patterns of Clojure, I try to bring a sense of spatial logic to my code. I aim for software that is both structurally sound and open to the kind of creative improvisation I find in music.",
    "When I’m not at my desk, I’m usually trying to solve a different set of problems on a bouldering wall or immersing myself in flight simulation—places where my interest in telemetry and physics feels most at home. This portfolio isn't a finished story, but a record of my attempts to bridge the gap between low-level engineering and the broader challenges of space and fintech."
  ],
  education: [
    {
      school: "University of Surrey",
      degree: "BSc (Hons) Computer Science with Professional Training Year",
      period: "September 2023 - August 2027",
      details: "Year 1: 86.13% | Year 2: 75.5% | Professional Training Year (PTY).",
      tags: ["university", "computer-science", "satellite", "TT&C", "leadership", "space"]
    },
    {
      school: "University of Sydney",
      degree: "Bachelor of Design in Architecture (Hons)",
      period: "January 2019 - June 2020",
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
  interests: "Bouldering (V7/7A+), Debating, Piano, Flight Simulation (X-Plane 12)"
};
