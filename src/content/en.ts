import type { Content } from "./types";

// Mirrors vi.ts in meaning and rhythm, not word for word. vi.ts wins on any
// disagreement.
export const en: Content = {
  meta: {
    title: "Nguyễn Ngọc Anh — Business · Projects · Creativity",
    description:
      "Portfolio of Nguyễn Ngọc Anh — International Economics student at Foreign Trade University. Project management, business operations, communications and design.",
  },
  nav: {
    skipToContent: "Skip to main content",
    switchLocale: "VI",
    switchLocaleLabel: "Xem bản tiếng Việt",
    contact: "Contact",
    backToTop: "Back to top",
    chapterRail: "Chapters",
    sound: "Sound",
  },
  chapters: {
    hero: "Opening",
    about: "About",
    journey: "Journey",
    principles: "How I work",
    projects: "Projects",
    education: "Education",
    direction: "Direction",
    skills: "Skills",
    hobby: "Off-hours",
    contact: "Contact",
  },
  present: "Present",
  hero: {
    kicker: "Opening",
    tagline: ["Business", "Projects", "Creativity"],
    intro: [
      "I'm an *International Economics* student at *Foreign Trade University*, with hands-on experience in project management, business operations, and communications & design.",
      "I'm drawn to how an idea gets organized, carried out, and grown into real results.",
    ],
    cta: "Explore my journey",
    scrollHint: "Scroll",
  },
  about: {
    kicker: "About me",
    heading: "I'm Ngọc Anh.",
    paragraphs: [
      "I'm currently studying International Economics at Foreign Trade University.",
      "Through my studies and work, I've had the chance to experience very different environments — from running an online business and designing brand identities to supporting IT project management.",
      "Each role gave me a new perspective on how an organization runs, and on how a project travels from an idea to reality.",
      "Along the way, I've shaped a way of working built on three things: *clear organization*, *effective coordination*, and *proactive problem-solving*.",
      "Next, I want to grow in *Logistics & Supply Chain*, while building more experience in project management and business operations.",
    ],
  },
  journey: {
    kicker: "Journey",
    heading: "The experiences that shaped how I work.",
    items: {
      design: {
        role: "Brand Identity Design",
        org: "Freelance",
        story: [
          "I started out with brand identity and communications design projects.",
          "To date, I've delivered *5+ projects*, each reaching *100–300+ participants*.",
          "This work taught me that a design has to do more than look good — it has to fit the project's message and goals.",
        ],
        tags: ["Design", "Brand identity", "Communications"],
      },
      silk: {
        role: "Online Business",
        org: "Artisan Silk Products",
        story: [
          "I'm directly involved in running the business — from sourcing and pricing to inventory management, order processing, and customer care.",
          "It lets me see business from a practical angle — where every step of the process shapes both operational efficiency and the customer experience.",
        ],
        tags: ["Business operations", "Inventory", "Orders", "Customers"],
      },
      dongAm: {
        role: "Communications Lead",
        org: "Đông Ấm Campaign",
        story: [
          "As Communications Lead, I designed the campaign's visual identity and managed the quality of its communications content.",
          "Beyond the craft itself, I worked closely with the team to make sure the project's image and message were delivered consistently.",
        ],
        tags: ["Communications", "Visual identity", "Teamwork"],
      },
      vmo: {
        role: "Project Assistant",
        org: "VMO Group",
        story: [
          "At VMO Group, I supported the Project Manager in tracking the progress, risks, changes, and reporting of IT projects under the PMO process.",
          "I also managed documentation and coordinated with stakeholders in an Agile environment.",
          "It gave me a clearer view of the work behind a project — where tracking information, progress, and coordination between parties is central to delivery.",
        ],
        tags: ["Project management", "PMO", "Coordination", "Documentation"],
      },
    },
    designStats: ["projects", "participants"],
    silkStages: ["Sourcing", "Pricing", "Inventory", "Orders", "Customers"],
    vmoTracks: ["Progress", "Risks", "Changes", "Reports"],
  },
  principles: {
    kicker: "What I bring",
    heading: "How I work",
    items: [
      {
        title: "Organization",
        body: "I build clear ways of working — from planning and tracking progress to managing information and documents.",
      },
      {
        title: "Coordination",
        body: "I'm used to working across teams and stakeholders, making sure information travels clearly and the work moves forward as one.",
      },
      {
        title: "Analysis",
        body: "My studies and hands-on experience have given me a systematic approach to problems — define the problem first, then find the right way through it.",
      },
      {
        title: "Creativity",
        body: "Design and communications taught me to see a problem not only through logic, but through how an idea is expressed and carried to other people.",
      },
    ],
  },
  projects: {
    kicker: "Projects & work",
    heading: "What I've made happen",
    lead: "Every project is a chance to try a new approach, solve a specific problem, and build more experience.",
    items: [
      {
        title: "Brand identity",
        body: "Identity systems and visual assets designed for projects.",
      },
      {
        title: "Communications",
        body: "Content and visuals for campaigns and community initiatives.",
      },
      {
        title: "Business operations",
        body: "Hands-on management of products, orders, inventory, and customers.",
      },
      {
        title: "Project management",
        body: "Tracking progress, managing documentation, and coordinating stakeholders.",
      },
    ],
  },
  education: {
    kicker: "Education",
    items: {
      ftu: { school: "Foreign Trade University", major: "International Economics" },
      hnams: {
        school: "Hanoi – Amsterdam High School for the Gifted",
        major: "Specialized Mathematics",
      },
    },
  },
  direction: {
    kicker: "Direction",
    heading: "Where am I headed?",
    focus: "Logistics & Supply Chain",
    paragraphs: [
      "Right now, I want to focus on building knowledge and experience in *Logistics & Supply Chain*.",
      "Alongside my grounding in economics and international trade, I want to keep sharpening my skills in project management, operations, and cross-functional coordination.",
      "I'm especially interested in how a system runs behind the final results — from *people* and *processes* to how departments *coordinate* with each other.",
      "That's the direction I want to keep exploring in my next experiences.",
    ],
    network: {
      people: "People",
      process: "Process",
      coordination: "Coordination",
      result: "Results",
    },
  },
  skills: {
    kicker: "Skills",
    toolsHeading: "Proficient with",
    languageHeading: "Languages",
    language: "English",
  },
  hobby: {
    kicker: "Off the clock",
    heading: "And when I'm free, I play guitar.",
    lead: "Outside class and work, I play guitar. This one's yours — try *strumming a few chords*.",
    guitar: {
      stageLabel:
        "Guitar: sweep the mouse across the strings over the body to strum; press and hold on the neck to fret a note.",
      start: "Click to hear it",
      soundOff: "Sound is off — click to turn it on",
      chords: "Chords",
      strings: "Strings",
      string: "String",
      strumDown: "Strum down",
      strumUp: "Strum up",
      capo: "Capo",
      capoDown: "Lower the capo",
      capoUp: "Raise the capo",
      fullscreen: "Full screen",
      exitFullscreen: "Exit full screen",
      pointerHelp:
        "Sweep the mouse across the strings over the body to strum; hold it still to mute. Press and hold on the neck to fret a note, and drag along the string to slide.",
      touchHelp:
        "Swipe across the strings over the body to strum, tap the neck to play a note, and hold a finger still on the body to mute.",
      keys: [
        { keys: "1–6", action: "pluck one string (1 is the thinnest)" },
        { keys: "Q … ]", action: "choose a chord" },
        { keys: "Space", action: "strum down" },
        { keys: "Shift + Space", action: "strum up" },
        { keys: "↑ ↓", action: "capo" },
        { keys: "0", action: "let go of the chord" },
        { keys: "Esc", action: "mute" },
      ],
    },
  },
  contact: {
    kicker: "Contact",
    heading: "Let's connect.",
    body: "If you'd like to talk about a project, a collaboration, or simply connect, I'd love to chat.",
    emailLabel: "Email",
    phoneLabel: "Phone",
    copy: "Copy",
    copied: "Copied",
  },
  marquee: ["Business", "Projects", "Creativity", "Logistics", "Supply Chain"],
  eggs: {
    hint: "This page hides {count} small secrets — try strumming the silk at the top, tapping the cocoon, or typing my name. Turn the sound on.",
    found: "Secrets",
    allFound: "You found every secret! Thanks for staying to play.",
    cocoonLabel: "Tap the silk cocoon",
    replayLabel: "Replay the illustration",
    messages: {
      pluck: "You just plucked the silk. Hear it hum?",
      strum: "A đàn tranh tune on silk strings — lovely!",
      hatch: "The cocoon hatched — a silk moth just flew out!",
      secretWord: "Now you know my name.",
      dispatch: "One order just delivered to Results.",
      replay: "Once more — just as neat as before.",
      spin: "You just spun the world. The cargo still arrived on time.",
      knot: "Knot tied. Let's connect!",
      progression: "C – G – Am – F: the four chords behind a thousand songs. You can play!",
    },
  },
};
