import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type Props = {
  locale: string;
};

export async function SiteFooter({ locale }: Props) {
  const t = await getTranslations("Footer");
  const tSite = await getTranslations("Site");
  const tDisclaimer = await getTranslations("Disclaimer");
  const year = new Date().getFullYear();

  const sections = [
    {
      title: t("sectionProject"),
      links: [
        { href: `/${locale}/#mission`, label: t("linkMission") },
        { href: `/${locale}/#system`, label: t("linkSystem") },
        { href: `/${locale}/#disciplines`, label: t("linkDisciplines") },
        { href: `/${locale}/#roadmap`, label: t("linkRoadmap") },
        { href: `/${locale}/#principles`, label: t("linkPrinciples") },
      ],
    },
    {
      title: t("sectionParticipate"),
      links: [
        { href: `/${locale}/donate/`, label: t("linkDonate") },
        { href: `/${locale}/citizens/`, label: t("linkCitizens") },
        { href: `/${locale}/collaborators/`, label: t("linkCollaborators") },
      ],
    },
    {
      title: t("sectionLegal"),
      links: [
        { href: `/${locale}/#transparency`, label: t("linkTransparency") },
        { href: `/${locale}/#privacy`, label: t("linkPrivacy") },
        { href: "#", label: t("linkLicenses") },
        {
          href: "mailto:hello@humanagingsimulators.org",
          label: t("linkContact"),
        },
      ],
    },
  ];

  return (
    <footer className="border-t border-black/5 bg-zinc-50 dark:border-white/10 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span
                aria-hidden
                className="bg-foreground text-background inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
              >
                H
              </span>
              {tSite("name")}
            </div>
            <p
              aria-label={tSite("slogan")}
              className="mt-4 bg-gradient-to-r from-emerald-600 via-amber-500 to-rose-500 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent"
            >
              {tSite("slogan")}
            </p>
            <p className="mt-2 text-sm text-zinc-700 italic dark:text-zinc-300">
              {tSite("sloganTagline")}
            </p>
            <p className="mt-4 max-w-xs text-sm text-zinc-600 dark:text-zinc-400">
              {t("tagline")}
            </p>
            <div className="mt-6">
              <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                {t("languageLabel")}
              </p>
              <div className="mt-2">
                <LanguageSwitcher locale={locale} variant="footer" />
              </div>
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-2 text-sm">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.label}`}>
                    <a
                      href={link.href}
                      className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-black/5 pt-8 text-xs text-zinc-500 dark:border-white/10">
          <p>{t("year", { year })}</p>
          <p className="mt-2">{t("rights")}</p>
          <p className="mt-2">
            {t("createdByLabel")}{" "}
            <a
              href="https://dixi-project.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-zinc-700 hover:underline dark:text-zinc-300"
            >
              {t("createdByName")}
            </a>
          </p>
          <p className="mt-4 max-w-3xl text-zinc-500 italic">
            {tDisclaimer("notMedicalDevice")}
          </p>
        </div>
      </div>
    </footer>
  );
}
