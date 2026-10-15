import "server-only";
import { join } from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatCertificateDate, type CertificateDetails } from "./certificates";

const asset = (...path: string[]) => join(process.cwd(), "src/assets", ...path);

Font.register({
  family: "Inter",
  fonts: [
    { src: asset("fonts/Inter-Regular.ttf"), fontWeight: 400 },
    { src: asset("fonts/Inter-Bold.ttf"), fontWeight: 700 },
    { src: asset("fonts/Inter-ExtraBold.ttf"), fontWeight: 800 },
  ],
});
// Names shouldn't break mid-word.
Font.registerHyphenationCallback((word) => [word]);

const INK = "#191919";
const LIME = "#D9FF3D";
const MUTED = "#9A9A9A";

// The white wordmark is 1028×618.
const LOGO_HEIGHT = 48;
const LOGO_WIDTH = (LOGO_HEIGHT * 1028) / 618;

const styles = StyleSheet.create({
  page: {
    backgroundColor: INK,
    color: "#FFFFFF",
    fontFamily: "Inter",
    padding: 40,
  },
  frame: {
    flex: 1,
    borderWidth: 2,
    borderColor: LIME,
    borderRadius: 16,
    paddingVertical: 44,
    paddingHorizontal: 56,
    justifyContent: "space-between",
  },
  top: { flexDirection: "row", justifyContent: "space-between" },
  pill: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: LIME,
    borderRadius: 999,
    paddingTop: 7,
    paddingBottom: 6,
    paddingHorizontal: 14,
  },
  pillText: {
    color: LIME,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.5,
    lineHeight: 1,
  },
  heading: {
    color: LIME,
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: 1,
  },
  presented: { color: MUTED, fontSize: 12, marginTop: 28 },
  name: { fontSize: 44, fontWeight: 800, marginTop: 8 },
  rule: { height: 3, width: 72, backgroundColor: LIME, marginTop: 20 },
  completed: { color: MUTED, fontSize: 12, marginTop: 20 },
  course: { fontSize: 20, fontWeight: 700, marginTop: 6 },
  bottom: { flexDirection: "row", justifyContent: "space-between" },
  label: {
    color: MUTED,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.2,
  },
  value: { fontSize: 13, fontWeight: 700, marginTop: 4 },
});

export function CertificateDocument({
  certificate,
}: {
  certificate: CertificateDetails;
}) {
  const name = `${certificate.firstName} ${certificate.lastName}`.trim();
  return (
    <Document
      title={`Certificate ${certificate.certificateNumber}`}
      author="Kingdom Culture"
      subject={`${certificate.courseTitle}: ${name}`}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.top}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            <Image
              src={asset("brand/kc-logo-white.png")}
              style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT }}
            />
            <View style={styles.pill}>
              <Text style={styles.pillText}>VOLUNTEERS TRAINING</Text>
            </View>
          </View>

          <View>
            <Text style={styles.heading}>CERTIFICATE OF COMPLETION</Text>
            <Text style={styles.presented}>This certifies that</Text>
            <Text style={styles.name}>{name}</Text>
            <View style={styles.rule} />
            <Text style={styles.completed}>has completed</Text>
            <Text style={styles.course}>{certificate.courseTitle}</Text>
          </View>

          <View style={styles.bottom}>
            <View>
              <Text style={styles.label}>COMPLETED</Text>
              <Text style={styles.value}>
                {formatCertificateDate(certificate.issuedAt)}
              </Text>
            </View>
            <View>
              <Text style={styles.label}>CERTIFICATE NUMBER</Text>
              <Text style={styles.value}>{certificate.certificateNumber}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function renderCertificatePdf(certificate: CertificateDetails) {
  return renderToBuffer(<CertificateDocument certificate={certificate} />);
}
