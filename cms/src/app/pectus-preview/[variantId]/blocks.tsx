import type { PageBlock } from "@pectus/content-insights/blocks";

/* Simple React renderers for every PageBlock type. Used by the in-CMS
 * preview iframe — fidelity is "good enough to edit against", not
 * pixel-perfect with the Astro published output. Production rendering
 * still goes through the Astro app. */

export function BlockRenderer({ block }: { block: PageBlock }) {
  switch (block.type) {
    case "hero":
      return <HeroBlock {...block.props} />;
    case "prose":
      return <ProseBlock {...block.props} />;
    case "feature_grid":
      return <FeatureGridBlock {...block.props} />;
    case "testimonial":
      return <TestimonialBlock {...block.props} />;
    case "cta":
      return <CtaBlock {...block.props} />;
    case "image":
      return <ImageBlock {...block.props} />;
    case "link_list":
      return <LinkListBlock {...block.props} />;
    case "faq":
      return <FaqBlock {...block.props} />;
    default:
      return null;
  }
}

function HeroBlock({
  title,
  subtitle,
  eyebrow,
  image_url,
  cta_label,
  cta_href,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  image_url?: string;
  cta_label?: string;
  cta_href?: string;
}) {
  return (
    <section className="border-b border-zinc-200 bg-white px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl text-center">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            {eyebrow}
          </p>
        )}
        <h1
          className="mt-3 font-bold tracking-tight text-zinc-900"
          style={{ fontSize: "var(--brand-h1-size)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
            {subtitle}
          </p>
        )}
        {cta_label && cta_href && (
          <a
            href={cta_href}
            className="mt-8 inline-flex items-center justify-center rounded-md bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700"
          >
            {cta_label}
          </a>
        )}
      </div>
      {image_url && (
        <div className="mx-auto mt-12 max-w-5xl">
          <img
            src={image_url}
            alt={title}
            className="w-full rounded-lg object-cover shadow-lg"
          />
        </div>
      )}
    </section>
  );
}

function ProseBlock({ markdown }: { markdown: string }) {
  /* Minimal markdown: paragraphs split on blank lines. Heavy lifting
   * happens in the Astro production renderer with marked. */
  const paragraphs = markdown.split(/\n{2,}/);
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-4 text-base leading-relaxed text-zinc-800">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}

function FeatureGridBlock({
  heading,
  items,
}: {
  heading?: string;
  items: Array<{
    title: string;
    description?: string;
    icon?: string;
    href?: string;
  }>;
}) {
  return (
    <section className="bg-zinc-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {heading && (
          <h2 className="mb-10 text-center font-bold text-zinc-900"
            style={{ fontSize: "var(--brand-h2-size)" }}>
            {heading}
          </h2>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.href ?? "#"}
              className="rounded-lg border border-zinc-200 bg-white p-6 transition hover:border-zinc-400"
            >
              {item.icon && (
                <span className="text-2xl" aria-hidden>
                  {item.icon}
                </span>
              )}
              <h3
                className="mt-3 font-semibold text-zinc-900"
                style={{ fontSize: "var(--brand-h3-size)" }}
              >
                {item.title}
              </h3>
              {item.description && (
                <p className="mt-2 text-sm text-zinc-600">{item.description}</p>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialBlock({
  quote,
  author,
  role,
  avatar_url,
}: {
  quote: string;
  author?: string;
  role?: string;
  avatar_url?: string;
}) {
  return (
    <section className="px-6 py-16">
      <figure className="mx-auto max-w-3xl text-center">
        <blockquote className="text-2xl font-medium leading-snug text-zinc-900">
          &ldquo;{quote}&rdquo;
        </blockquote>
        {(author || role) && (
          <figcaption className="mt-6 flex items-center justify-center gap-3 text-sm text-zinc-600">
            {avatar_url && (
              <img
                src={avatar_url}
                alt={author ?? ""}
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
            <span>
              {author && <span className="font-semibold">{author}</span>}
              {author && role && <span className="mx-1.5">·</span>}
              {role && <span>{role}</span>}
            </span>
          </figcaption>
        )}
      </figure>
    </section>
  );
}

function CtaBlock({
  heading,
  body,
  label,
  href,
}: {
  heading: string;
  body?: string;
  label: string;
  href: string;
}) {
  return (
    <section className="bg-zinc-900 px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl text-center">
        <h2
          className="font-bold tracking-tight"
          style={{ fontSize: "var(--brand-h2-size)" }}
        >
          {heading}
        </h2>
        {body && <p className="mx-auto mt-4 max-w-xl text-zinc-300">{body}</p>}
        <a
          href={href}
          className="mt-8 inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
        >
          {label}
        </a>
      </div>
    </section>
  );
}

function ImageBlock({
  src,
  alt,
  caption,
}: {
  src: string;
  alt?: string;
  caption?: string;
}) {
  return (
    <section className="px-6 py-12">
      <figure className="mx-auto max-w-4xl">
        <img
          src={src}
          alt={alt ?? ""}
          className="w-full rounded-lg object-cover"
        />
        {caption && (
          <figcaption className="mt-2 text-center text-sm text-zinc-500">
            {caption}
          </figcaption>
        )}
      </figure>
    </section>
  );
}

function LinkListBlock({
  heading,
  items,
}: {
  heading?: string;
  items: Array<{ label: string; href: string; description?: string }>;
}) {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {heading && (
          <h2
            className="mb-6 font-bold text-zinc-900"
            style={{ fontSize: "var(--brand-h2-size)" }}
          >
            {heading}
          </h2>
        )}
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
          {items.map((item, i) => (
            <li key={i}>
              <a
                href={item.href}
                className="flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-zinc-50"
              >
                <div>
                  <span className="font-medium text-zinc-900">
                    {item.label}
                  </span>
                  {item.description && (
                    <p className="mt-0.5 text-sm text-zinc-600">
                      {item.description}
                    </p>
                  )}
                </div>
                <span aria-hidden className="text-zinc-400">
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FaqBlock({
  heading,
  items,
}: {
  heading?: string;
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {heading && (
          <h2
            className="mb-6 font-bold text-zinc-900"
            style={{ fontSize: "var(--brand-h2-size)" }}
          >
            {heading}
          </h2>
        )}
        <dl className="space-y-6">
          {items.map((item, i) => (
            <div key={i}>
              <dt className="text-base font-semibold text-zinc-900">
                {item.question}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-700">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
