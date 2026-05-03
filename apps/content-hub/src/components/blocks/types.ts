/* PageBlock type. Imported by both the Astro renderer (which uses it for
 * props typing) and the CMS (which uses it for template manifests + edit-page
 * skill output). Keeping it in a Next-safe pure-TS file avoids pulling .astro
 * imports into the CMS bundle. */

export type PageBlock =
  | {
      type: "hero";
      props: {
        title: string;
        subtitle?: string;
        eyebrow?: string;
        image_url?: string;
        cta_label?: string;
        cta_href?: string;
      };
    }
  | { type: "prose"; props: { markdown: string } }
  | {
      type: "feature_grid";
      props: {
        heading?: string;
        items: Array<{
          title: string;
          description?: string;
          icon?: string;
          href?: string;
        }>;
      };
    }
  | {
      type: "testimonial";
      props: {
        quote: string;
        author?: string;
        role?: string;
        avatar_url?: string;
      };
    }
  | {
      type: "cta";
      props: { heading: string; body?: string; label: string; href: string };
    }
  | { type: "image"; props: { src: string; alt?: string; caption?: string } }
  | {
      type: "link_list";
      props: {
        heading?: string;
        items: Array<{ label: string; href: string; description?: string }>;
      };
    }
  | {
      type: "faq";
      props: {
        heading?: string;
        items: Array<{ question: string; answer: string }>;
      };
    };
