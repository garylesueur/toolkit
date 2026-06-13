import { JsonLd } from "@/components/json-ld";
import { createHomeFaqJsonLd, HOME_FAQ_ITEMS } from "@/lib/seo/home-faq";

/** Home page FAQ section paired with matching `FAQPage` JSON-LD. */
export function HomeFaq() {
  return (
    <section
      aria-labelledby="home-faq-heading"
      className="border-t border-border/60 bg-muted/30"
    >
      <JsonLd data={createHomeFaqJsonLd()} />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h2
          id="home-faq-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Frequently asked questions
        </h2>
        <dl className="mt-6 space-y-6">
          {HOME_FAQ_ITEMS.map((item) => (
            <div key={item.question}>
              <dt className="font-medium">{item.question}</dt>
              <dd className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
