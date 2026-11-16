/** Brand-level configuration. Nothing here is invented: empty values render as placeholders. */
export const site = {
  name: "MOOD",
  slogan: "PICK YOUR MOOD.",
  secondarySlogan: "EVERY BITE IS A MOOD.",
  orderUrl: process.env.NEXT_PUBLIC_ORDER_URL || "",
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
};

export const navLinks = [
  { label: "Experience", href: "#experience" },
  { label: "Flavors", href: "#flavors" },
  { label: "Our Story", href: "#story" },
] as const;
