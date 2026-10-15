import { describe, expect, it } from "vitest";
import {
  LinksSettingSchema,
  QuizSettingSchema,
  SafeguardingSettingSchema,
  siteSettingSchemas,
} from "@/lib/schemas";

describe("site setting schemas", () => {
  it("covers each documented key", () => {
    expect(Object.keys(siteSettingSchemas).sort()).toEqual([
      "links",
      "quiz",
      "safeguarding",
    ]);
  });

  it("validates safeguarding contacts", () => {
    const value = {
      email: "safeguarding@example.com",
      contacts: [{ label: "DSL", name: "Grace Mensah", phone: "07700 900123" }],
    };
    expect(SafeguardingSettingSchema.parse(value)).toEqual(value);
    expect(
      SafeguardingSettingSchema.safeParse({ ...value, contacts: [] }).success,
    ).toBe(false);
    expect(
      SafeguardingSettingSchema.safeParse({ ...value, email: "nope" }).success,
    ).toBe(false);
  });

  it("validates links as http(s) URLs", () => {
    const value = {
      incidentFormUrl: "https://forms.example.com/incident",
      whatsappUrl: "https://chat.whatsapp.com/abc",
    };
    expect(LinksSettingSchema.parse(value)).toEqual(value);
    expect(
      LinksSettingSchema.safeParse({
        ...value,
        whatsappUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false); // The WhatsApp link is optional until KC shares it.
    expect(
      LinksSettingSchema.parse({ incidentFormUrl: value.incidentFormUrl }),
    ).toEqual({ incidentFormUrl: value.incidentFormUrl });
  });

  it("validates quiz settings ranges", () => {
    expect(
      QuizSettingSchema.parse({ passMark: 80, questionsPerAttempt: 10 }),
    ).toEqual({
      passMark: 80,
      questionsPerAttempt: 10,
    });
    expect(
      QuizSettingSchema.safeParse({ passMark: 101, questionsPerAttempt: 10 })
        .success,
    ).toBe(false);
    expect(
      QuizSettingSchema.safeParse({ passMark: 80, questionsPerAttempt: 0 })
        .success,
    ).toBe(false);
    expect(
      QuizSettingSchema.safeParse({ passMark: 79.5, questionsPerAttempt: 10 })
        .success,
    ).toBe(false);
  });
});
