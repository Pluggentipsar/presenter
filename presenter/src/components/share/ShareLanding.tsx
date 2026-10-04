import Link from "next/link";
import { AGARE } from "@/lib/agare";
import type { ShareArticle } from "@/lib/share/article";
import { SHARE_AUTHOR } from "@/lib/share/author";
import { StageFrame } from "./StageFrame";
import styles from "./share.module.css";

interface ShareLandingProps {
  slug: string;
  title: string;
  kicker?: string;
  intro?: string;
  meta: string[];
  hero: { slideIndex: number; step: number | "last" };
  article: ShareArticle | null;
}

/**
 * Landningssidan för en delad föreläsning: levande hero (en riktig slide, inte
 * en skärmdump), vad föreläsningen handlar om och två dörrar in — se eller läs.
 * Saknas lästext visas bara dörren till visningen.
 */
export function ShareLanding({ slug, title, kicker, intro, meta, hero, article }: ShareLandingProps) {
  const links = [...(article?.links ?? []), ...SHARE_AUTHOR.links];
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.top}>
          <span className={styles.mono}>Delad föreläsning</span>
          {AGARE.webbplats ? <a className={styles.mono} href={AGARE.webbplats.href}>{AGARE.webbplats.label}</a> : null}
        </div>

        <div className={styles.hero}>
          <StageFrame slug={slug} slide={hero.slideIndex} step={hero.step} label={`Omslag: ${title}`} />
          <Link href={`/${slug}`} className={styles.heroLink} aria-label="Se föreläsningen" />
          <span className={`${styles.heroBadge} ${styles.mono}`}>▶ Se föreläsningen</span>
        </div>

        <section className={styles.intro}>
          <div>
            {kicker ? <span className={`${styles.mono} ${styles.introKicker}`}>{kicker}</span> : null}
            <h1 className={`${styles.display} ${styles.introTitle}`}>{title}</h1>
          </div>
          <div>
            {intro ? <p className={styles.introText}>{intro}</p> : null}
            <ul className={`${styles.meta} ${styles.mono}`}>
              {meta.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <div className={styles.doors}>
          <Link href={`/${slug}`} className={`${styles.door} ${styles.doorWatch}`}>
            <div>
              <h2 className={`${styles.display} ${styles.doorTitle}`}>Se föreläsningen</h2>
              <p className={styles.doorText}>
                Bilderna som de visades, steg för steg. Klicka eller använd piltangenterna.
              </p>
            </div>
            <div className={styles.doorFoot}>
              <span className={styles.mono}>Visning · helskärm</span>
              <span className={styles.doorArrow} aria-hidden>→</span>
            </div>
          </Link>
          {article ? (
            <Link href={`/${slug}/las`} className={`${styles.door} ${styles.doorRead}`}>
              <div>
                <h2 className={`${styles.display} ${styles.doorTitle}`}>Läs föreläsningen</h2>
                <p className={styles.doorText}>
                  Bilderna tillsammans med det som sades. Texten rullar, bilden följer med.
                </p>
              </div>
              <div className={styles.doorFoot}>
                <span className={styles.mono}>
                  Läsläge · {article.chapters.length} kapitel · ca {article.minutes} min
                </span>
                <span className={styles.doorArrow} aria-hidden>→</span>
              </div>
            </Link>
          ) : null}
        </div>

        {article && article.chapters.length > 0 ? (
          <section className={`${styles.section} ${styles.sectionGrid}`}>
            <div>
              <span className={styles.mono}>Innehåll</span>
              <h2 className={`${styles.display} ${styles.sectionTitle}`}>Kapitel</h2>
            </div>
            <ol className={styles.chapters}>
              {article.chapters.map((chapter, i) => (
                <li key={chapter.id}>
                  <Link href={`/${slug}/las#${article.blocks[chapter.firstBlock]?.id ?? ""}`}>
                    <span className={styles.mono}>{String(i + 1).padStart(2, "0")}</span>
                    <span>{chapter.title}</span>
                    <span className={styles.mono}>{chapter.minutes} min</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {SHARE_AUTHOR.name || links.length > 0 ? (
          <section className={`${styles.section} ${styles.sectionGrid}`}>
            <div>
              <span className={styles.mono}>{SHARE_AUTHOR.name ? "Föreläsare" : "Länkar"}</span>
              {SHARE_AUTHOR.name ? <h2 className={`${styles.display} ${styles.sectionTitle}`}>{SHARE_AUTHOR.name}</h2> : null}
            </div>
            <div>
              {SHARE_AUTHOR.bio ? <p className={styles.about}>{SHARE_AUTHOR.bio}</p> : null}
              {links.length > 0 ? (
                <ul className={styles.linkRow}>
                  {links.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ) : null}

        <footer className={`${styles.foot} ${styles.mono}`}>
          {[SHARE_AUTHOR.name, title].filter(Boolean).join(" · ")}
        </footer>
      </div>
    </div>
  );
}
