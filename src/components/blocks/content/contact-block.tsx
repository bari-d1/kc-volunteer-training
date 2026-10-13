import { Card } from "@/components/ui/card";
import type { BlockProps } from "../block-props";

/** tel: href with spaces and punctuation removed. */
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export function ContactBlock({
  title,
  email,
  contacts,
}: BlockProps<"CONTACT">) {
  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-h3">{title}</h3>
      <ul className="grid gap-4 sm:grid-cols-2">
        {contacts.map((contact, index) => (
          <li key={index}>
            <Card padding="md" className="h-full">
              <div className="flex flex-col gap-2">
                <span className="text-label text-lime">{contact.label}</span>
                <span className="text-body-lg font-bold">{contact.name}</span>
                {contact.phone && (
                  <a
                    href={telHref(contact.phone)}
                    className="w-fit text-body text-text"
                  >
                    <span className="sr-only">Call {contact.name} on</span>{" "}
                    <span className="underline decoration-lime underline-offset-4">
                      {contact.phone}
                    </span>
                  </a>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {email && (
        <p className="text-body text-muted">
          Or email{" "}
          <a
            href={`mailto:${email}`}
            className="font-bold break-all text-lime underline underline-offset-4"
          >
            {email}
          </a>
        </p>
      )}
    </section>
  );
}
