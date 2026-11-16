import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="bg-butter px-5 pb-8 text-choc md:px-[5vw]">
      <div className="flex flex-col gap-4 border-t-2 border-choc/15 pt-6 font-display text-sm font-medium uppercase tracking-[0.14em] md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} MOOD. All rights reserved.</span>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {/* Placeholders until real accounts are provided (see .env.example) */}
          {site.instagramUrl ? (
            <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-pink">
              Instagram
            </a>
          ) : (
            <span className="opacity-60">Instagram — coming soon</span>
          )}
          {site.contactEmail ? (
            <a href={`mailto:${site.contactEmail}`} className="hover:text-pink">
              {site.contactEmail}
            </a>
          ) : (
            <span className="opacity-60">Contact — coming soon</span>
          )}
        </div>
      </div>
    </footer>
  );
}
