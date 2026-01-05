"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What counts as a transaction?",
    answer:
      "Every payment attempt analyzed by Orylo, whether successful or failed.",
  },
  {
    question: "Can I change plans anytime?",
    answer: "Yes. Upgrade or downgrade anytime. No hidden fees.",
  },
  {
    question: "What if I exceed my transaction limit?",
    answer:
      "We'll notify you. You can upgrade or we'll pause detection until next month.",
  },
  {
    question: "How long does the early bird price last?",
    answer:
      "Lock in €39/mo forever if you're among the first 100 customers. This price never increases for you.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-16 md:py-24">
      <div className="relative mx-auto max-w-3xl px-6">
        {/* Header */}
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-xl border border-white/10 bg-zinc-900/50 px-6 backdrop-blur-xl"
            >
              <AccordionTrigger className="py-4 text-left text-white hover:no-underline [&[data-state=open]>svg]:rotate-180">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-zinc-400">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
