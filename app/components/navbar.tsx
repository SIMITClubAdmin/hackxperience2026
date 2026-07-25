"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IBM_Plex_Mono } from "next/font/google";
import { useRouter, usePathname } from "next/navigation";
import { REVEAL_TRACKS_AND_JUDGES } from "@/lib/event-reveal";
import { isCommunityLeaderboardLive } from "@/lib/community-voting-release";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Nav links. `target` items smooth-scroll to a homepage section; `href` items
// route to a standalone page. Kept short on purpose — only the essentials.
type NavItem =
  | { label: string; target: string }
  | { label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { label: REVEAL_TRACKS_AND_JUDGES ? "TRACKS" : "THEME", target: "tracks" },
  { label: "PRIZES", target: "prizes" },
  { label: "TIMELINE", target: "timeline" },
  { label: "FAQ", target: "faq" },
  { label: "GALLERY", href: "/gallery" },
  // { label: "SUBMIT", href: "/submit" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaderboardLive, setLeaderboardLive] = useState(() => isCommunityLeaderboardLive());
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (leaderboardLive) return;

    const id = window.setInterval(() => {
      if (isCommunityLeaderboardLive()) {
        setLeaderboardLive(true);
        window.clearInterval(id);
      }
    }, 30000);

    return () => window.clearInterval(id);
  }, [leaderboardLive]);

  const navItems = leaderboardLive
    ? [...NAV_ITEMS, { label: "LEADERBOARD", href: "/community-favourites" } satisfies NavItem]
    : NAV_ITEMS;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleNavClick = (item: NavItem) => {
    // Standalone pages route directly.
    if ("href" in item) {
      router.push(item.href);
      return;
    }
    // Section anchors: route home with the hash if we're elsewhere,
    // otherwise smooth-scroll in place.
    if (pathname !== "/") {
      router.push(`/#${item.target}`);
    } else {
      scrollTo(item.target);
    }
  };

  const handleLogoClick = () => {
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/");
    }
  };

  return (
    <nav
      className={`${ibmPlexMono.className} fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-10 h-11 transition-shadow duration-300 ${
        scrolled ? "shadow-[0_2px_12px_rgba(0,0,0,0.5)]" : ""
      }`}
      style={{ backgroundColor: "#1d1c17" }}
    >
      {/* Left — Logo */}
      <motion.button
        onClick={handleLogoClick}
        className="flex items-center gap-0 text-white text-[13px] sm:text-[14px] font-bold tracking-wide cursor-pointer whitespace-nowrap"
        whileHover={reduceMotion ? undefined : { scale: 1.03, color: "#fef9f1" }}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      >
        <span className="text-[#c00000] mr-1">&gt;_</span>
        HACKXPERIENCE
      </motion.button>

      {/* Center — Nav links */}
      <div className="hidden md:flex items-center gap-1">
        {navItems.map((item) => (
          <motion.button
            key={item.label}
            onClick={() => handleNavClick(item)}
            className="relative text-[12px] font-medium tracking-[0.08em] cursor-pointer px-2.5 py-1 whitespace-nowrap text-white/70"
            whileHover={reduceMotion ? undefined : { color: "#ffffff", y: -1 }}
            whileTap={reduceMotion ? undefined : { y: 0 }}
          >
            [{item.label}]
          </motion.button>
        ))}
      </div>

      {/* Right — Login button + mobile menu toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        <motion.button
          id="login_secure"
          onClick={() => router.push("/login")}
          className="login_secure bg-[#c00000] text-white text-[11px] sm:text-[12px] font-bold tracking-[0.10em] px-4 py-1.5 cursor-pointer whitespace-nowrap"
          whileHover={reduceMotion ? undefined : { backgroundColor: "#a00000", y: -1 }}
          whileTap={reduceMotion ? undefined : { y: 0, scale: 0.98 }}
        >
          LOGIN_SECURE
        </motion.button>
        {/* Hamburger — only below md, where the center links are hidden */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          className="md:hidden flex items-center justify-center text-white cursor-pointer p-1"
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="3" x2="15" y2="15" />
              <line x1="15" y1="3" x2="3" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
              <rect width="18" height="2" />
              <rect y="6" width="18" height="2" />
              <rect y="12" width="18" height="2" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown — replaces the hidden center links below md */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="md:hidden absolute top-11 left-0 right-0 flex flex-col border-t border-white/10 overflow-hidden"
            style={{ backgroundColor: "#1d1c17" }}
          >
            {navItems.map((item, i) => (
              <motion.button
                key={item.label}
                initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduceMotion ? 0 : i * 0.04 }}
                onClick={() => { handleNavClick(item); setMenuOpen(false); }}
                className="text-left text-[12px] font-medium tracking-[0.08em] px-4 sm:px-6 py-3 border-b border-white/5 text-white/70 hover:text-white"
              >
                [{item.label}]
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
