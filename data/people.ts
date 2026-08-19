export type Person = {
  slug: string;
  name: string;
  title: string;
  bio: string;
  headshot?: string;
  /** Marks a not-yet-filled roster entry so the UI can label it clearly instead of implying a real person. */
  placeholder?: boolean;
};

export const executiveLeadership: Person[] = [
  {
    slug: "luke-jannazzo",
    name: "Luke Jannazzo",
    title: "Chief Executive Officer",
    bio: "Luke is a student at the University of South Carolina and previously served as the Event Manager of TEDxCongaree Vista.",
    headshot: "/headshots/luke.jpg",
  },
  {
    slug: "owen-coulam-ceo",
    name: "Owen Coulam",
    title: "Chief Operating Officer",
    bio: "Owen is a Computer Science and Mathematics student at the University of South Carolina and previously served as Curation Director of TEDxCongaree Vista.",
    headshot: "/headshots/owen.jpg",
  },
  {
    slug: "tyler-zolkos",
    name: "Tyler Zolkos",
    title: "Chief Marketing Officer",
    bio: "Tyler is a Computer Science student at the University of South Carolina with 8+ years of experience in graphic design and stage production.",
    headshot: "/headshots/tyler.webp",
  },
  {
    slug: "maximus-fernandez",
    name: "Maximus Fernandez",
    title: "Chief Technology Officer",
    bio: "Maximus is a Computer Science student at the University of South Carolina.",
    headshot: "/headshots/maximus.jpg",
  },
];

export const boardOfDirectors: Person[] = [
  {
    slug: "darssan-eswaramoorthi",
    name: "Darssan Eswaramoorthi",
    title: "President",
    bio: "Darssan is a Computer Engineering graduate of the University of South Carolina and previously served as Executive Producer of TEDxCongaree Vista.",
    headshot: "/headshots/darssan.jpg",
  },
  {
    slug: "shyam-ganesh-babu",
    name: "Shyam Ganesh Babu",
    title: "Secretary",
    bio: "Shyam is a Biological Sciences student at the University of South Carolina who previously served as the Lead Organizer of TEDxCongaree Vista.",
    headshot: "/headshots/shyam.jpg",
  },
  {
    slug: "sai-varun-nallu",
    name: "Sai Varun Nallu",
    title: "Treasurer",
    bio: "Sai is a Neuroscience student at the University of South Carolina and previously served as Sponsorships & Budget Director of TEDxCongaree Vista.",
    headshot: "/headshots/sai.jpg",
  },
  {
    slug: "owen-coulam-board",
    name: "Owen Coulam",
    title: "Board Member",
    bio: "Owen is a Computer Science and Mathematics student at the University of South Carolina and previously served as Curation Director of TEDxCongaree Vista.",
    headshot: "/headshots/owen.jpg",
  },
  {
    slug: "tim-george",
    name: "Tim George",
    title: "Board Member",
    bio: "Tim is a Public Health student at the University of South Carolina and previously served as a Curation Assistant for TEDxCongaree Vista.",
    headshot: "/headshots/tim.jpg",
  },
];
