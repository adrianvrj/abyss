import Link from "next/link";
import { ABYSS_LOGO_SRC, PLAY_GAME_URL } from "@/lib/constants";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-header-logo-link" aria-label="Abyss home">
          <img
            src={ABYSS_LOGO_SRC}
            alt=""
            width={50}
            height={50}
            className="site-header-logo"
          />
        </Link>
        <a
          href={PLAY_GAME_URL}
          className="site-header-play"
          target="_blank"
          rel="noopener noreferrer"
        >
          PLAY NOW
        </a>
      </div>
    </header>
  );
}
