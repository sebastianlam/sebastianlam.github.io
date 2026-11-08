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
        "Intern (full-time) Sep 2025 - Sep 2026; Test Analyst (part-time) Sep 2026 - Present. Guildford, on-site.",
        "Type Approval campaigns for EMVCo Contact Level 2 (EMV L2) and Contactless kernels (VISA/AMEX), plus card testing per PURE and CCD.",
        "Wrote custom scripts that parse vendor-locked tool logs into required reporting documents.",
        "Built a local LLM PDF spec parser that uses fewer tokens than pypdf."
      ]
    },
    {
      role: "VP Missions; Team Lead & TT&C Lead (UKSEDS SDC)",
      company: "Peryton Space",
      period: "September 2024 - Present",
      tags: ["space", "satellite", "TT&C", "computer-vision", "AprilTags", "C++", "Next.js", "Cloudflare", "ECSS"],
      highlights: [
        "VP Missions (May 2026 - Present): mentor non-rocketry competition teams (Olympus Rover, Satellite Design, Airbus Space). Migrated the society site from WordPress to Cloudflare.",
        "Team Lead and TT&C Lead, Satellite Design Competition (Sep 2025 - Jul 2026): 3U CubeSat lunar simulation with stereoscopic computer-vision depth maps. Ran ECSS (European Cooperation for Space Standardization) PDR/CDR. Finished 6th of 20 nationally.",
        "TT&C (telemetry, tracking and command) and Payload Lead (Sep 2024 - Jul 2025): Best Innovation Award (Airbus Defence and Space, Stevenage). AprilTags CV navigation with attitude/orbit control, link margin under mass/budget, low-latency video, and Next.js + C++ ground station."
      ]
    },
    {
      role: "LAB Pal for COM1026 & Buddy Scheme Mentor",
      company: "University of Surrey",
      period: "September 2024 - June 2025",
      tags: ["university", "mentoring", "mathematics", "probability", "automata"],
      description: "Supported first-year students in discrete mathematics, automata theory, and probability during COM1026 lab sessions, alongside academic mentoring through the Buddy Scheme."
    },
    {
      role: "Computer Vision Lead",
      company: "Sports Vision",
      period: "2023 - 2024",
      tags: ["computer-vision", "yolo", "python", "pyside", "blender", "synthetic-data", "backend"],
      description: "Built the computer vision backend for a visual snooker scoring system using YOLO. Created a custom image annotation tool in PySide6 and generated synthetic training data via the Blender Python API."
    },
    {
      role: "Software Developer",
      company: "Next Token Solutions",
      period: "October 2020 - January 2023",
      tags: ["fintech", "aws", "php", "clojure", "vue", "mysql", "s3", "apache", "ec2", "flutter", "ios"],
      highlights: [
        "Built and maintained web features for Finmonster, an SME loan-matching fintech platform.",
        "Automated server management tasks on AWS using Shell scripting.",
        "Executed a full stack migration across PHP, jQuery, Vue.js, Clojure, MySQL, S3, and Apache on EC2.",
        "Developed mobile applications in Flutter and native iOS (migrating legacy React Native apps), and handled client requirements and proposals."
      ]
    },
    {
      role: "English Tutor",
      company: "Freelance",
      period: "Q2 2021 - Q1 2023",
      tags: ["teaching", "english", "stem", "tutoring"],
      description: "Tutored Years 6-8 students in English with a focus on STEM terminology and technical vocabulary."
    },
    {
      role: "Part-Time Web Developer",
      company: "Tommax",
      period: "January 2020 - October 2021",
      tags: ["e-commerce", "php", "client", "translation", "marketing"],
      description: "Worked with clients on e-commerce solutions and PHP web development projects, alongside translation and region-specific subtitling for marketing campaigns."
    },
    {
      role: "Team Member",
      company: "Barangaroo Promenade Pavilion Design Competition",
      period: "Summer 2020",
      tags: ["architecture", "competition", "parametric-design", "pavilion"],
      description: "Co-designed a competition pavilion entry for a public shelter based on a parametric interpretation of the Aboriginal coolamon."
    },
    {
      role: "Audio Assistant",
      company: "“Innonation” Live Music Company",
      period: "December 2018",
      tags: ["audio", "events", "live", "installation"],
      description: "Installed and operated live audio equipment for concerts, weddings, and corporate events across Hong Kong."
    },
    {
      role: "Finalist",
      company: "HKU Decacorn Entrepreneurial Camp Case Competition",
      period: "June 2018",
      tags: ["entrepreneurship", "competition", "startup", "pitch"],
      description: "Pitched a startup proposal for an integrated knowledge and graduate headhunting platform within 24 hours, advised by HKU mentors."
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
