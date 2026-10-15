/**
 * Course content from the KC New Members Onboarding and Volunteers' Training
 * decks. Scripture text (NKJV) and the narrator's lines are drafts for KC to
 * approve. The WhatsApp group link is left out for now.
 */
import type {
  BlockType,
  BranchCode,
  LeaderGroup,
} from "@/generated/prisma/client";
import { BlockSchema } from "@/lib/schemas/blocks";
import {
  siteSettingSchemas,
  type SiteSettingKey,
} from "@/lib/schemas/site-settings";

type SeedBlock = { type: BlockType; content: unknown };

/** Also in siteSettings.links. */
const INCIDENT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdYVJZzoEwR3-x-gKFlMlvFXuVfA3loqhY0If4ropWuZqcjvw/viewform?usp=send_form";

const narrator = (
  state: "wave" | "point" | "think" | "celebrate" | "encourage",
  text: string,
): SeedBlock => ({ type: "NARRATOR_CALLOUT", content: { state, text } });

export const course = {
  slug: "volunteers-onboarding",
  title: "Volunteers' Onboarding",
  description:
    "Everything you need to start serving with Kingdom Culture: who we are, what we believe and how we work together.",
  isPublished: true,
  order: 0,
};

export const modules: Array<{
  slug: string;
  title: string;
  summary: string;
  requiresCheck?: boolean;
  narratorIntro?: string;
  blocks: SeedBlock[];
}> = [
  {
    slug: "welcome",
    title: "Welcome to the Spiritual Costco",
    summary: "Where variety is the norm, and the norm is variety.",
    narratorIntro:
      "Hey, welcome! I'm your guide. I'll pop up along the way to point things out.",
    blocks: [
      {
        type: "HEADING",
        content: {
          text: "Welcome to the Spiritual Costco",
          level: 1,
          pill: "VOLUNTEERS' ONBOARDING",
        },
      },
      {
        type: "TEXT",
        content: {
          markdown:
            "Where variety is the norm, and the norm is variety.\n\nThank you for saying yes to serving in Kingdom Culture. This course walks you through who we are, what we believe and how we serve together, so you can step into your team with confidence.",
        },
      },
      {
        type: "CHECKLIST",
        content: {
          title: "What you'll cover",
          items: [
            "Who KC is and where we've come from",
            "Our values and what we believe",
            "How KC is organised",
            "What's expected of a volunteer",
            "Giving and safeguarding",
            "Our branches and teams",
            "A final quiz to wrap it all up",
          ],
        },
      },
      narrator(
        "point",
        "Take your time. If you need to stop, you can pick up where you left off.",
      ),
    ],
  },
  {
    slug: "about-kc",
    title: "About KC",
    summary: "Who we are, our mission and our story so far.",
    narratorIntro: "Let's start with who we are and how we got here.",
    blocks: [
      {
        type: "HEADING",
        content: { text: "About KC", level: 1, pill: "SPIRITUAL COSTCO" },
      },
      {
        type: "TEXT",
        content: {
          markdown: [
            "**Who we are**  \nThe young adult expression of Jubilee Church Manchester, RCCG, and an ARC.",
            "**Our mission**  \nRaising kingdom-minded disciples.",
            "**Our story**  \nFounded in 2015 as a fellowship, now 100s of young adults.",
            "**Our culture**  \nA “Spiritual Costco”: an Apostolic/Prophetic movement where variety is the norm, and the norm is variety.",
          ].join("\n\n"),
        },
      },
      narrator(
        "point",
        "From a small fellowship in 2015 to hundreds of young adults. Here's how it's unfolded.",
      ),
      {
        type: "HEADING",
        content: { text: "Seasons of KC", level: 2, pill: "OUR JOURNEY" },
      },
      {
        type: "TIMELINE",
        content: {
          events: [
            { year: "2015", title: "KC birthed" },
            { year: "2019", title: "Pastor Joshua Komolafe as Team Lead" },
            {
              year: "2024",
              title: "New Wine Season",
              body: "Judah First, Testimonies, Words of Knowledge, Creative Overflow.",
            },
            { year: "2025", title: "From Mobility to Stability" },
          ],
        },
      },
    ],
  },
  {
    slug: "our-values",
    title: "Our Values",
    summary: "Kingdom, Excellence and Discipleship.",
    narratorIntro: "Three values shape everything we do at KC.",
    blocks: [
      {
        type: "HEADING",
        content: { text: "Our Values", level: 1, pill: "OUR VALUES" },
      },
      {
        type: "FLIP_CARDS",
        content: {
          cards: [
            {
              front: "Kingdom",
              back: "“But seek first the kingdom of God and His righteousness, and all these things shall be added to you.”",
              reference: "Matthew 6:33",
            },
            {
              front: "Excellence",
              back: "“…an excellent spirit, knowledge, understanding… were found in this Daniel.”",
              reference: "Daniel 5:12",
            },
            {
              front: "Discipleship",
              back: "“Go therefore and make disciples of all the nations… teaching them to observe all things that I have commanded you.”",
              reference: "Matthew 28:19-20",
            },
          ],
        },
      },
      narrator(
        "think",
        "Which of the three comes most naturally to you? And which would you like to grow in?",
      ),
    ],
  },
  {
    slug: "our-church-family",
    title: "Our Church Family",
    summary: "Jubilee Church Manchester and the people who lead us.",
    narratorIntro:
      "KC doesn't stand alone. We're part of a bigger church family.",
    blocks: [
      {
        type: "HEADING",
        content: {
          text: "Our Church Family",
          level: 1,
          pill: "JUBILEE CHURCH MCR",
        },
      },
      {
        type: "TEXT",
        content: {
          markdown:
            "We belong to an amazing church family! Jubilee has been in Manchester for over 20 years and has grown so much over that time. Here are some key people to take note of.",
        },
      },
      {
        type: "PEOPLE",
        content: {
          people: [
            { name: "Pastor E.A. Adeboye", role: "General Overseer, RCCG" },
            { name: "Pastor Leke Sanusi", role: "RCCG Chairman" },
            {
              name: "Pastors Abimbola & Bisi Komolafe",
              role: "Senior Pastors, JCM",
            },
            {
              name: "Asst. Pastor Adele Ige",
              role: "Overseeing young adults",
            },
            {
              name: "Pastor Joshua Komolafe",
              role: "Team Lead",
              ringColour: "lime",
            },
          ],
        },
      },
      narrator(
        "point",
        "Pastor Joshua is KC's Team Lead, so you'll see him a lot!",
      ),
    ],
  },
  {
    slug: "what-we-believe",
    title: "What We Believe",
    summary: "Our statement of faith and the foundation we stand on.",
    narratorIntro:
      "This is the heart of it: what we believe, and what we stand on.",
    blocks: [
      {
        type: "HEADING",
        content: {
          text: "What We Believe",
          level: 1,
          pill: "STATEMENT OF FAITH",
        },
      },
      {
        type: "ACCORDION",
        content: {
          items: [
            {
              title: "God the Father",
              body: "We believe in God the Father, the Creator of heaven and Earth.",
            },
            {
              title: "Jesus, the only way",
              body: "Jesus was born of a virgin, lived a sinless life, and gave Himself as a sacrifice for our sins: the only way to know God.",
            },
            {
              title: "Heaven and hell",
              body: "We believe in a literal heaven and hell; those who receive Jesus will spend eternity in heaven, those who reject Him are lost forever.",
            },
            {
              title: "The cross and resurrection",
              body: "Jesus Christ, God's son, was crucified for the sins of all mankind and rose on the third day to sit at the right hand of the Father.",
            },
            {
              title: "The Holy Spirit",
              body: "We believe in the Holy Spirit who dwells in us and guides us according to the will of the Father.",
            },
            {
              title: "Salvation",
              body: "Salvation is freely given to all who accept Jesus Christ as their Lord and Saviour.",
            },
            {
              title: "Baptism",
              body: "Following faith in Jesus, every believer is to be baptised by immersion in the name of the Father, Son and Holy Spirit.",
            },
            {
              title: "The Bible",
              body: "We believe in the Bible as the infallible Word of God.",
            },
            {
              title: "Jesus' return",
              body: "Jesus Christ will physically and visibly return to earth a second time to establish His kingdom on earth.",
            },
            {
              title: "Divine healing",
              body: "We believe in divine healing: the restoration of health to those who believe and act on God's word, and that Jesus is the Healer.",
            },
            {
              title: "God is in control",
              body: "God has all the events of this world in full control, and one day every knee will bow to Him.",
            },
            {
              title: "Excellence",
              body: "We believe in and strive for excellence in our worship of and service to God: the process matters as much as the product.",
            },
          ],
        },
      },
      {
        type: "HEADING",
        content: { text: "Our Foundation", level: 2, pill: "WHAT WE STAND ON" },
      },
      {
        type: "TEXT",
        content: {
          markdown: [
            "**In line with RCCG**  \nOur full statement of beliefs is in line with the Redeemed Christian Church of God (RCCG).",
            "**The Creeds**  \nWe believe wholeheartedly in the Nicene Creed and the Apostles' Creed.",
            "**Women in leadership**  \nWe believe in women in leadership, including on the stage.",
          ].join("\n\n"),
        },
      },
      narrator(
        "point",
        "If you've been around Jubilee, this will feel familiar: our beliefs line up with the RCCG.",
      ),
    ],
  },
  {
    slug: "how-were-organised",
    title: "How We're Organised",
    summary: "How KC is structured, from Team Lead to volunteers.",
    narratorIntro: "Ever wondered who does what? Here's how KC fits together.",
    blocks: [
      {
        type: "HEADING",
        content: {
          text: "KC Structure",
          level: 1,
          pill: "HOW WE'RE ORGANISED",
        },
      },
      {
        type: "PYRAMID",
        content: {
          levels: [
            { title: "Team Lead" },
            { title: "Branch Leads & Stewards" },
            { title: "Pillars" },
            { title: "Champions" },
            { title: "Volunteers" },
          ],
        },
      },
      narrator(
        "point",
        "Leadership flows from the Team Lead, through Branch Leads & Stewards, Pillars and Champions, down to volunteers like you.",
      ),
    ],
  },
  {
    slug: "expectations",
    title: "Expectations",
    summary: "What it takes to serve, and what it doesn't.",
    narratorIntro:
      "Let's get practical. What does it actually take to serve at KC?",
    blocks: [
      {
        type: "HEADING",
        content: { text: "Expectations", level: 1, pill: "EXPECTATIONS" },
      },
      {
        type: "REFLECTION",
        content: {
          prompt:
            "What do you think is required to serve as a volunteer in KC?",
          revealTitle: "What isn't required",
          revealBody:
            "- Perfection\n- Knowing every scripture back to front\n- Reaching a certain spiritual rank\n- Experience",
        },
      },
      narrator(
        "encourage",
        "Feeling relieved? You don't need to have it all together to serve.",
      ),
      {
        type: "HEADING",
        content: {
          text: "Attitudes of a Servant",
          level: 2,
          pill: "THE FOUR H'S",
        },
      },
      {
        type: "TEXT",
        content: {
          markdown: "- **Humble**\n- **Hunger**\n- **Heart**\n- **Honour**",
        },
      },
      {
        type: "CHECKLIST",
        content: {
          title: "Things to take note of",
          items: [
            "Be born again",
            "Christ-like behaviour (dressing, online, offline, etc.)",
            "Faithfulness & availability in service and commitment",
            "Teachable & obedient hearts",
            "Open and honest communication",
          ],
        },
      },
      {
        type: "HEADING",
        content: { text: "What You Should Be Prepared For", level: 2 },
      },
      {
        type: "TEXT",
        content: {
          markdown: [
            "1. Monthly RECHARGE",
            "2. Prayer Watches (times shared in the volunteers chat)",
            "3. Arrive at **1.30pm on Sundays** for service prep",
            "4. Calls for Prayer and Fasting",
            "5. Workers empowerment with Parent Church",
            "6. Potential impromptu combined programmes",
          ].join("\n"),
        },
      },
      narrator(
        "point",
        "Don't miss this one: on Sundays, volunteers arrive at 1.30pm for service prep.",
      ),
    ],
  },
  {
    slug: "giving",
    title: "Giving",
    summary: "Why we give offering and why we tithe.",
    narratorIntro: "Let's talk about giving: not how much, but why.",
    blocks: [
      {
        type: "HEADING",
        content: {
          text: "Offering and Tithes",
          level: 1,
          pill: "THINGS TO KNOW",
        },
      },
      {
        type: "TEXT",
        content: {
          markdown: [
            "**Why we give offering**",
            "- Giving shows He is Lord of our lives.\n- Giving pleases God.\n- It's an expression of our thankfulness and praise to God. It comes from a heart of worship that recognises everything we have already belongs to the Lord.",
            "**Why we tithe**",
            "- The word “tithe” literally means tenth, or 10%.\n- It's a symbol of how God calls us to live as stewards rather than owners.\n- It helps us not to be slaves to money.",
            "**Things to know**",
            "- Giving is not by force, but it is an important form of worship.",
          ].join("\n\n"),
        },
      },
      narrator(
        "encourage",
        "Remember: it's about the heart behind it, not the amount.",
      ),
    ],
  },
  {
    slug: "safeguarding",
    title: "Safeguarding",
    summary:
      "Who to contact and how to report a concern. Includes a short check.",
    requiresCheck: true,
    narratorIntro:
      "This one's important. Safeguarding is how we keep everyone at KC safe.",
    blocks: [
      {
        type: "HEADING",
        content: { text: "Safeguarding", level: 1, pill: "IMPORTANT" },
      },
      {
        type: "TEXT",
        content: {
          markdown:
            "This safeguarding team is in place for all volunteers and members.",
        },
      },
      {
        type: "CONTACT",
        content: {
          title: "Key contact details",
          email: "safeguarding@kingdomculturejcm.co.uk",
          contacts: [
            {
              label: "Designated Safeguarding Lead (DSL)",
              name: "Yemi",
              phone: "07582 847316",
            },
            { label: "Deputy DSL", name: "Runor", phone: "07446 534029" },
          ],
        },
      },
      narrator(
        "point",
        "If something worries you, report it. Use the incident report form or contact the safeguarding team.",
      ),
      {
        type: "LINK_QR",
        content: {
          label: "Incident report form",
          url: INCIDENT_FORM_URL,
        },
      },
      {
        type: "KNOWLEDGE_CHECK",
        content: {
          questions: [
            {
              prompt: "Who is the safeguarding team in place for?",
              options: [
                { id: "all", text: "All volunteers and members" },
                { id: "kids", text: "Only children" },
                { id: "leaders", text: "Only leaders" },
              ],
              correctOptionId: "all",
              explanation:
                "The safeguarding team is in place for all volunteers and members.",
            },
            {
              prompt: "Who should you contact with a safeguarding concern?",
              options: [
                {
                  id: "team",
                  text: "The safeguarding team: Yemi (DSL) or Runor (Deputy DSL)",
                },
                { id: "self", text: "Nobody: deal with it yourself" },
                { id: "chat", text: "Post about it in the group chat" },
              ],
              correctOptionId: "team",
              explanation:
                "Contact the safeguarding team: Yemi, Runor or safeguarding@kingdomculturejcm.co.uk.",
            },
            {
              prompt: "Where do you report a safeguarding incident?",
              options: [
                { id: "form", text: "The incident report form" },
                { id: "social", text: "On social media" },
                { id: "none", text: "There's no need to report it" },
              ],
              correctOptionId: "form",
              explanation:
                "Use the incident report form, or contact the safeguarding team directly.",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "branches-and-teams",
    title: "Branches and Teams",
    summary: "Variety is the norm: find where you fit.",
    narratorIntro: "Variety is the norm here. Let's find where you might fit.",
    blocks: [
      {
        type: "HEADING",
        content: { text: "KC Branches", level: 1, pill: "VARIETY = NORM" },
      },
      {
        type: "TABS",
        content: {
          tabs: [
            {
              label: "Experience",
              colour: "experience",
              body: "**Worship Services.** Teams that make our services work and function excellently well.\n\nLed by Adanna Anthony-Okeke.",
              items: [
                "Service Management",
                "Hosting Team",
                "Welfare/Hospitality",
                "Prayer Team",
                "Production",
                "Ushers",
                "Teaching Team",
                "KC Kids",
                "Wellbeing Team",
              ],
            },
            {
              label: "Ministry",
              colour: "ministry",
              body: "**Beyond Sunday Teams.** Teams that might not feature on a Sunday, but focus on the community, discipleship & engagement of KC.\n\nLed by Princess Omosebi and Bami Komolafe.\n\n_The Ministry branch is currently being restructured, so team names and structure may change._",
              items: [
                "Evangelism/Outreach",
                "23+",
                "ISHA",
                "CTRL C",
                "Rapha Mentorship",
                "Events",
                "Nectar Team",
                "Nectar X",
                "KC First Years",
                "Bubbles",
                "Volunteers' Training",
                "Grad+",
                "Locker Room",
              ],
            },
            {
              label: "Creative",
              colour: "creative",
              body: "**Creativ // Bara.** “Gartisan!” Teams that enable our inner Garti to thrive, revealing the creative nature of God in all we do.\n\nLed by Maame Ama Acquah.",
              items: [
                "Adobe+",
                "Videography",
                "The Gartisan Collective",
                "Photography",
                "Social Media",
                "Dance",
                "KC Merch",
                "Set Design & Decor",
                "Drama",
                "Post Production",
                "KC Podcast",
                "Worship Team",
              ],
            },
            {
              label: "Systems",
              colour: "systems",
              body: "**Our newest branch.** Supporting KC's behind-the-scenes operations, including comms and safeguarding.\n\nLed by Dr Anna Fatunla.",
              items: ["Comms Team", "Safeguarding Team"],
            },
          ],
        },
      },
      narrator(
        "think",
        "Which teams caught your eye? Your gifting might fit more than one!",
      ),
      {
        type: "HEADING",
        content: { text: "Branch Leadership", level: 2, pill: "LEADERSHIP" },
      },
      {
        type: "PEOPLE",
        content: {
          people: [
            {
              name: "Adanna Anthony-Okeke",
              role: "Experience Lead",
              ringColour: "experience",
            },
            {
              name: "Princess Omosebi",
              role: "Ministry Lead",
              ringColour: "ministry",
            },
            {
              name: "Bami Komolafe",
              role: "Ministry Lead",
              ringColour: "ministry",
            },
            {
              name: "Maame Ama Acquah",
              role: "Creative Lead",
              ringColour: "creative",
            },
            {
              name: "Dr Anna Fatunla",
              role: "Systems Lead",
              ringColour: "systems",
            },
          ],
        },
      },
    ],
  },
  {
    slug: "final-quiz",
    title: "Final Quiz",
    summary: "Check what you've learned.",
    narratorIntro: "Last stretch! Let's see what stuck.",
    blocks: [
      {
        type: "TEXT",
        content: {
          markdown:
            "The final quiz has 10 questions drawn from everything you've covered. You need 80% to pass.",
        },
      },
      narrator(
        "encourage",
        "Not sure about something? You can look back at any module before you start.",
      ),
    ],
  },
  {
    slug: "part-of-the-family",
    title: "You're Part of the Family",
    summary: "You've finished. What's next.",
    narratorIntro: "You made it to the end!",
    blocks: [
      {
        type: "HEADING",
        content: {
          text: "You're part of the family now. Welcome to KC!",
          level: 1,
          pill: "KINGDOM CULTURE",
        },
      },
      narrator("celebrate", "You did it! Welcome to the family."),
      {
        type: "HEADING",
        content: { text: "What We Offer", level: 2, pill: "GET INVOLVED" },
      },
      {
        type: "FLIP_CARDS",
        content: {
          cards: [
            {
              front: "Worship Experiences",
              back: "Encounter God through passionate, Spirit-led worship every week.",
            },
            {
              front: "Discipleship & Growth",
              back: "MASTERLIFE and TOBS sessions to build your walk with Christ.",
            },
            {
              front: "Community & Fellowship",
              back: "Life-on-life connection through our Hives.",
            },
            {
              front: "Opportunities to Serve",
              back: "Discover your gifting and put it to work in a team.",
            },
          ],
        },
      },
      {
        type: "TEXT",
        content: {
          markdown: "_Thank you for saying yes to serving in Kingdom Culture._",
        },
      },
    ],
  },
];

export const branches: Array<{
  code: BranchCode;
  name: string;
  description: string;
  colour: string;
  teams: string[];
}> = [
  {
    code: "EXPERIENCE",
    name: "Experience",
    description:
      "Worship Services: teams that make our services work and function excellently well.",
    colour: "#D9FF3D",
    teams: [
      "Service Management",
      "Hosting Team",
      "Welfare/Hospitality",
      "Prayer Team",
      "Production",
      "Ushers",
      "Teaching Team",
      "KC Kids",
      "Wellbeing Team",
    ],
  },
  {
    code: "MINISTRY",
    name: "Ministry",
    description:
      "Beyond Sunday Teams: teams that focus on the community, discipleship & engagement of KC.",
    colour: "#FF5FC8",
    teams: [
      "Evangelism/Outreach",
      "23+",
      "ISHA",
      "CTRL C",
      "Rapha Mentorship",
      "Events",
      "Nectar Team",
      "Nectar X",
      "KC First Years",
      "Bubbles",
      "Volunteers' Training",
      "Grad+",
      "Locker Room",
    ],
  },
  {
    code: "CREATIVE",
    name: "Creative",
    description:
      "Creativ // Bara: teams revealing the creative nature of God in all we do.",
    colour: "#FF7A1A",
    teams: [
      "Adobe+",
      "Videography",
      "The Gartisan Collective",
      "Photography",
      "Social Media",
      "Dance",
      "KC Merch",
      "Set Design & Decor",
      "Drama",
      "Post Production",
      "KC Podcast",
      "Worship Team",
    ],
  },
  {
    code: "SYSTEMS",
    name: "Systems",
    description:
      "Our newest branch: supporting KC's behind-the-scenes operations, including comms and safeguarding.",
    colour: "#33D6F5",
    teams: ["Comms Team", "Safeguarding Team"],
  },
];

export const leaders: Array<{
  name: string;
  role: string;
  group: LeaderGroup;
  branch?: BranchCode;
}> = [
  {
    name: "Pastor E.A. Adeboye",
    role: "General Overseer, RCCG",
    group: "CHURCH_FAMILY",
  },
  { name: "Pastor Leke Sanusi", role: "RCCG Chairman", group: "CHURCH_FAMILY" },
  {
    name: "Pastors Abimbola & Bisi Komolafe",
    role: "Senior Pastors, JCM",
    group: "CHURCH_FAMILY",
  },
  {
    name: "Asst. Pastor Adele Ige",
    role: "Overseeing young adults",
    group: "CHURCH_FAMILY",
  },
  {
    name: "Pastor Joshua Komolafe",
    role: "Team Lead",
    group: "CHURCH_FAMILY",
  },
  {
    name: "Adanna Anthony-Okeke",
    role: "Experience Lead",
    group: "BRANCH_LEAD",
    branch: "EXPERIENCE",
  },
  {
    name: "Princess Omosebi",
    role: "Ministry Lead",
    group: "BRANCH_LEAD",
    branch: "MINISTRY",
  },
  {
    name: "Bami Komolafe",
    role: "Ministry Lead",
    group: "BRANCH_LEAD",
    branch: "MINISTRY",
  },
  {
    name: "Maame Ama Acquah",
    role: "Creative Lead",
    group: "BRANCH_LEAD",
    branch: "CREATIVE",
  },
  {
    name: "Dr Anna Fatunla",
    role: "Systems Lead",
    group: "BRANCH_LEAD",
    branch: "SYSTEMS",
  },
];

export const siteSettings: { [K in SiteSettingKey]: unknown } = {
  quiz: { passMark: 80, questionsPerAttempt: 10 },
  safeguarding: {
    email: "safeguarding@kingdomculturejcm.co.uk",
    contacts: [
      {
        label: "Designated Safeguarding Lead (DSL)",
        name: "Yemi",
        phone: "07582 847316",
      },
      { label: "Deputy DSL", name: "Runor", phone: "07446 534029" },
    ],
  },
  links: {
    incidentFormUrl: INCIDENT_FORM_URL,
  },
};

/**
 * Validates every block and setting against the app's Zod
 * schemas. Throws one error listing every problem, before anything is written.
 */
export function validateSeedData() {
  const problems: string[] = [];
  const check = (
    label: string,
    result: {
      success: boolean;
      error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
    },
  ) => {
    if (result.success) return;
    for (const issue of result.error!.issues) {
      problems.push(
        `${label} ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      );
    }
  };

  for (const seedModule of modules) {
    if (seedModule.blocks.length === 0)
      problems.push(`Module ${seedModule.slug} has no blocks`);
    seedModule.blocks.forEach((block, index) =>
      check(
        `Module ${seedModule.slug} block ${index} (${block.type})`,
        BlockSchema.safeParse(block),
      ),
    );
  }
  for (const [key, value] of Object.entries(siteSettings) as Array<
    [SiteSettingKey, unknown]
  >) {
    check(`SiteSetting ${key}`, siteSettingSchemas[key].safeParse(value));
  }

  if (problems.length > 0) {
    throw new Error(`Seed data is invalid:\n  - ${problems.join("\n  - ")}`);
  }
}
