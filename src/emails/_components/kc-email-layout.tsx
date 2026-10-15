import type { CSSProperties, ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

/** Brand colours, repeated here because email can't use the app's CSS. */
export const emailColours = {
  background: "#191919",
  surface: "#222222",
  text: "#FFFFFF",
  muted: "#9A9A9A",
  lime: "#D9FF3D",
  ink: "#191919",
};

const font =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const styles = {
  body: {
    margin: 0,
    padding: "32px 16px",
    backgroundColor: emailColours.background,
    color: emailColours.text,
    fontFamily: font,
  },
  container: { maxWidth: "560px", margin: "0 auto" },
  wordmark: {
    margin: "0 0 32px",
    fontSize: "18px",
    fontWeight: 800,
    fontStyle: "italic",
    letterSpacing: "0.02em",
    lineHeight: "1.1",
    color: emailColours.text,
  },
  heading: {
    margin: "0 0 16px",
    fontSize: "26px",
    fontWeight: 800,
    lineHeight: "1.2",
    color: emailColours.text,
  },
  paragraph: {
    margin: "0 0 16px",
    fontSize: "16px",
    lineHeight: "1.6",
    color: emailColours.text,
  },
  button: {
    display: "inline-block",
    padding: "14px 32px",
    borderRadius: "9999px",
    backgroundColor: emailColours.lime,
    color: emailColours.ink,
    fontSize: "16px",
    fontWeight: 700,
    textDecoration: "none",
  },
  rule: { borderColor: "#2C2C2C", margin: "32px 0 24px" },
  link: { color: emailColours.muted, textDecoration: "underline" },
  footer: {
    margin: "0 0 8px",
    fontSize: "13px",
    lineHeight: "1.5",
    color: emailColours.muted,
  },
} satisfies Record<string, CSSProperties>;

/**
 * The frame every KC email shares: dark background, KC wordmark as text,
 * content up to 560px wide, and a footer with who it's from and that
 * replies aren't read (questions go to their KC contact person). Inline styles only, for Gmail, Outlook and Apple Mail. It declares
 * a dark colour scheme so clients that respect it don't invert the colours.
 */
export function KcEmailLayout({
  preview,
  children,
  unsubscribeUrl,
}: {
  /** Inbox preview text shown after the subject. */
  preview: string;
  children: ReactNode;
  /** Adds an unsubscribe line to the footer (reminder emails). */
  unsubscribeUrl?: string;
}) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.wordmark}>
            KINGDOM
            <br />
            CULTURE
          </Text>
          {children}
          <Hr style={styles.rule} />
          <Text style={styles.footer}>
            Kingdom Culture, Jubilee Church Manchester (RCCG)
          </Text>
          <Text style={styles.footer}>
            This inbox isn&apos;t monitored, so please don&apos;t reply to this
            email. If you have any questions, speak to your contact person at
            KC.
          </Text>
          {unsubscribeUrl && (
            <Text style={styles.footer}>
              Don&apos;t want these reminders?{" "}
              <Link href={unsubscribeUrl} style={styles.link}>
                Unsubscribe
              </Link>
              .
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  );
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function EmailText({ children }: { children: ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

const secondaryButton: CSSProperties = {
  ...styles.button,
  padding: "12px 30px",
  backgroundColor: "transparent",
  border: `2px solid ${emailColours.lime}`,
  color: emailColours.lime,
};

/** The lime call-to-action button, or an outlined one for a second action. */
export function EmailButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Section style={{ margin: "8px 0 24px" }}>
      <Button
        href={href}
        style={variant === "primary" ? styles.button : secondaryButton}
      >
        {children}
      </Button>
    </Section>
  );
}

/** Small grey text, e.g. a note under a button. */
export function EmailNote({ children }: { children: ReactNode }) {
  return (
    <Text style={{ ...styles.footer, margin: "-12px 0 24px" }}>{children}</Text>
  );
}
