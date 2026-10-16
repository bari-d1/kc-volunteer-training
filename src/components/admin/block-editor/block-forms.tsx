"use client";

import { useId, type ReactNode } from "react";
import type { BlockType } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import type { BlockContent } from "@/lib/schemas/blocks";
import type { ColourToken } from "@/lib/schemas/common";
import {
  MarkdownField,
  optional,
  RepeatableList,
  SelectInput,
  TextArea,
  TextInput,
  type Errors,
} from "./fields";

type FormProps<T extends BlockType> = {
  content: BlockContent<T>;
  onChange: (content: BlockContent<T>) => void;
  errors: Errors;
};

const BRANCH_COLOURS: Array<{
  value: ColourToken;
  label: string;
  hex: string;
}> = [
  { value: "experience", label: "Experience", hex: "#D9FF3D" },
  { value: "ministry", label: "Ministry", hex: "#FF5FC8" },
  { value: "creative", label: "Creative", hex: "#FF7A1A" },
  { value: "systems", label: "Systems", hex: "#33D6F5" },
];

/** Swatches limited to the branch colours, plus "None". */
function ColourPicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: ColourToken | undefined;
  onChange: (value: ColourToken | undefined) => void;
  error?: string;
}) {
  const name = useId();
  const options = [
    { value: undefined, label: "None", hex: "transparent" },
    ...BRANCH_COLOURS,
  ];
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-small font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.label}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-pill border-2 px-2.5 py-1 text-[12px] font-bold has-focus-visible:outline-2 has-focus-visible:outline-lime",
              value === o.value ? "border-lime" : "border-surface-2",
            )}
          >
            <input
              type="radio"
              name={name}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="size-3 rounded-pill border border-muted"
              style={{ background: o.hex }}
            />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function Stack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

function StringList({
  legend,
  itemLabel,
  items,
  onChange,
  errors,
  path,
  min = 1,
}: {
  legend: string;
  itemLabel: string;
  items: string[];
  onChange: (items: string[]) => void;
  errors: Errors;
  path: string;
  min?: number;
}) {
  return (
    <RepeatableList
      legend={legend}
      itemLabel={itemLabel}
      items={items}
      onChange={onChange}
      create={() => ""}
      min={min}
      error={errors[path]}
      render={(item, update, i) => (
        <TextInput
          label="Text"
          value={item}
          onChange={update}
          error={errors[`${path}.${i}`]}
        />
      )}
    />
  );
}

// ─── One form per block type ────────────────────────────────────────────────

function HeadingForm({ content, onChange, errors }: FormProps<"HEADING">) {
  return (
    <Stack>
      <TextInput
        label="Heading"
        value={content.text}
        onChange={(text) => onChange({ ...content, text })}
        error={errors.text}
      />
      <SelectInput
        label="Size"
        value={String(content.level) as "1" | "2" | "3"}
        options={[
          { value: "1", label: "Large (page title)" },
          { value: "2", label: "Medium (section)" },
          { value: "3", label: "Small (sub-section)" },
        ]}
        onChange={(level) =>
          onChange({ ...content, level: Number(level ?? 2) as 1 | 2 | 3 })
        }
        error={errors.level}
      />
      <TextInput
        label="Pill tag (optional)"
        hint="Small label above the heading, e.g. OUR VALUES."
        value={content.pill}
        onChange={(pill) => onChange({ ...content, pill: optional(pill) })}
        error={errors.pill}
      />
    </Stack>
  );
}

function TextForm({ content, onChange, errors }: FormProps<"TEXT">) {
  return (
    <MarkdownField
      label="Text"
      rows={10}
      value={content.markdown}
      onChange={(markdown) => onChange({ ...content, markdown })}
      error={errors.markdown}
    />
  );
}

function ImageForm({ content, onChange, errors }: FormProps<"IMAGE">) {
  return (
    <Stack>
      <TextInput
        label="Image URL"
        hint="An https:// address, or a path in the site such as /images/team.jpg."
        value={content.url}
        onChange={(url) => onChange({ ...content, url })}
        error={errors.url}
      />
      <TextInput
        label="Alt text"
        hint="Describe the image for people who can't see it. Leave empty only if it's purely decorative."
        value={content.alt}
        onChange={(alt) => onChange({ ...content, alt })}
        error={errors.alt}
      />
      <TextInput
        label="Caption (optional)"
        value={content.caption}
        onChange={(caption) =>
          onChange({ ...content, caption: optional(caption) })
        }
        error={errors.caption}
      />
    </Stack>
  );
}

function VideoForm({ content, onChange, errors }: FormProps<"VIDEO">) {
  return (
    <Stack>
      <TextInput
        label="Video URL"
        value={content.url}
        onChange={(url) => onChange({ ...content, url })}
        error={errors.url}
      />
      <TextInput
        label="Captions file URL (optional)"
        hint="A .vtt file, so the video has subtitles."
        value={content.captionsUrl}
        onChange={(v) => onChange({ ...content, captionsUrl: optional(v) })}
        error={errors.captionsUrl}
      />
      <TextInput
        label="Poster image URL (optional)"
        value={content.poster}
        onChange={(v) => onChange({ ...content, poster: optional(v) })}
        error={errors.poster}
      />
    </Stack>
  );
}

function FlipCardsForm({ content, onChange, errors }: FormProps<"FLIP_CARDS">) {
  return (
    <RepeatableList
      legend="Cards"
      itemLabel="Card"
      items={content.cards}
      onChange={(cards) => onChange({ ...content, cards })}
      create={() => ({ front: "", back: "" })}
      error={errors.cards}
      render={(card, update, i) => (
        <>
          <TextInput
            label="Front"
            value={card.front}
            onChange={(front) => update({ ...card, front })}
            error={errors[`cards.${i}.front`]}
          />
          <TextArea
            label="Back"
            value={card.back}
            onChange={(back) => update({ ...card, back })}
            error={errors[`cards.${i}.back`]}
          />
          <TextInput
            label="Reference (optional)"
            hint="e.g. a scripture reference such as Matthew 6:33."
            value={card.reference}
            onChange={(v) => update({ ...card, reference: optional(v) })}
            error={errors[`cards.${i}.reference`]}
          />
        </>
      )}
    />
  );
}

function AccordionForm({ content, onChange, errors }: FormProps<"ACCORDION">) {
  return (
    <RepeatableList
      legend="Items"
      itemLabel="Item"
      items={content.items}
      onChange={(items) => onChange({ ...content, items })}
      create={() => ({ title: "", body: "" })}
      error={errors.items}
      render={(item, update, i) => (
        <>
          <TextInput
            label="Title"
            value={item.title}
            onChange={(title) => update({ ...item, title })}
            error={errors[`items.${i}.title`]}
          />
          <TextArea
            label="Body"
            value={item.body}
            onChange={(body) => update({ ...item, body })}
            error={errors[`items.${i}.body`]}
          />
        </>
      )}
    />
  );
}

function TabsForm({ content, onChange, errors }: FormProps<"TABS">) {
  return (
    <RepeatableList
      legend="Tabs"
      itemLabel="Tab"
      items={content.tabs}
      onChange={(tabs) => onChange({ ...content, tabs })}
      create={() => ({ label: "", body: "" })}
      error={errors.tabs}
      render={(tab, update, i) => (
        <>
          <TextInput
            label="Label"
            value={tab.label}
            onChange={(label) => update({ ...tab, label })}
            error={errors[`tabs.${i}.label`]}
          />
          <ColourPicker
            label="Colour"
            value={tab.colour}
            onChange={(colour) => update({ ...tab, colour })}
            error={errors[`tabs.${i}.colour`]}
          />
          <MarkdownField
            label="Body"
            value={tab.body}
            onChange={(body) => update({ ...tab, body })}
            error={errors[`tabs.${i}.body`]}
            rows={4}
          />
          <StringList
            legend="Items (optional)"
            itemLabel="Item"
            items={tab.items ?? []}
            min={0}
            onChange={(items) =>
              update({ ...tab, items: items.length ? items : undefined })
            }
            errors={errors}
            path={`tabs.${i}.items`}
          />
        </>
      )}
    />
  );
}

function TimelineForm({ content, onChange, errors }: FormProps<"TIMELINE">) {
  return (
    <RepeatableList
      legend="Events"
      itemLabel="Event"
      items={content.events}
      onChange={(events) => onChange({ ...content, events })}
      create={() => ({ year: "", title: "" })}
      error={errors.events}
      render={(event, update, i) => (
        <>
          <TextInput
            label="Year"
            hint="Text, so “2019–2021” or “Today” work."
            value={event.year}
            onChange={(year) => update({ ...event, year })}
            error={errors[`events.${i}.year`]}
          />
          <TextInput
            label="Title"
            value={event.title}
            onChange={(title) => update({ ...event, title })}
            error={errors[`events.${i}.title`]}
          />
          <TextArea
            label="Details (optional)"
            value={event.body}
            onChange={(v) => update({ ...event, body: optional(v) })}
            error={errors[`events.${i}.body`]}
          />
        </>
      )}
    />
  );
}

function PyramidForm({ content, onChange, errors }: FormProps<"PYRAMID">) {
  return (
    <RepeatableList
      legend="Levels (top first)"
      itemLabel="Level"
      items={content.levels}
      onChange={(levels) => onChange({ ...content, levels })}
      create={() => ({ title: "" })}
      error={errors.levels}
      render={(level, update, i) => (
        <>
          <TextInput
            label="Title"
            value={level.title}
            onChange={(title) => update({ ...level, title })}
            error={errors[`levels.${i}.title`]}
          />
          <TextArea
            label="Description (optional)"
            hint="With a description, volunteers can tap the level to read it."
            value={level.body}
            onChange={(v) => update({ ...level, body: optional(v) })}
            error={errors[`levels.${i}.body`]}
          />
        </>
      )}
    />
  );
}

function PeopleForm({ content, onChange, errors }: FormProps<"PEOPLE">) {
  return (
    <RepeatableList
      legend="People"
      itemLabel="Person"
      items={content.people}
      onChange={(people) => onChange({ ...content, people })}
      create={() => ({ name: "", role: "" })}
      error={errors.people}
      render={(person, update, i) => (
        <>
          <TextInput
            label="Name"
            value={person.name}
            onChange={(name) => update({ ...person, name })}
            error={errors[`people.${i}.name`]}
          />
          <TextInput
            label="Role"
            value={person.role}
            onChange={(role) => update({ ...person, role })}
            error={errors[`people.${i}.role`]}
          />
          <TextInput
            label="Photo URL (optional)"
            value={person.photoUrl}
            onChange={(v) => update({ ...person, photoUrl: optional(v) })}
            error={errors[`people.${i}.photoUrl`]}
          />
          <ColourPicker
            label="Ring colour"
            value={person.ringColour}
            onChange={(ringColour) => update({ ...person, ringColour })}
            error={errors[`people.${i}.ringColour`]}
          />
        </>
      )}
    />
  );
}

function ReflectionForm({
  content,
  onChange,
  errors,
}: FormProps<"REFLECTION">) {
  return (
    <Stack>
      <TextArea
        label="Question"
        value={content.prompt}
        onChange={(prompt) => onChange({ ...content, prompt })}
        error={errors.prompt}
        rows={2}
      />
      <TextInput
        label="Answer title"
        hint="Shown when they tap Save, e.g. “What isn't required”."
        value={content.revealTitle}
        onChange={(revealTitle) => onChange({ ...content, revealTitle })}
        error={errors.revealTitle}
      />
      <MarkdownField
        label="Answer"
        value={content.revealBody}
        onChange={(revealBody) => onChange({ ...content, revealBody })}
        error={errors.revealBody}
        rows={4}
      />
    </Stack>
  );
}

function ChecklistForm({ content, onChange, errors }: FormProps<"CHECKLIST">) {
  return (
    <Stack>
      <TextInput
        label="Title (optional)"
        value={content.title}
        onChange={(v) => onChange({ ...content, title: optional(v) })}
        error={errors.title}
      />
      <StringList
        legend="Items"
        itemLabel="Item"
        items={content.items}
        onChange={(items) => onChange({ ...content, items })}
        errors={errors}
        path="items"
      />
    </Stack>
  );
}

function ContactForm({ content, onChange, errors }: FormProps<"CONTACT">) {
  return (
    <Stack>
      <TextInput
        label="Title"
        value={content.title}
        onChange={(title) => onChange({ ...content, title })}
        error={errors.title}
      />
      <TextInput
        label="Email (optional)"
        value={content.email}
        onChange={(v) => onChange({ ...content, email: optional(v) })}
        error={errors.email}
      />
      <RepeatableList
        legend="Contacts"
        itemLabel="Contact"
        items={content.contacts}
        onChange={(contacts) => onChange({ ...content, contacts })}
        create={() => ({ label: "", name: "" })}
        error={errors.contacts}
        render={(person, update, i) => (
          <>
            <TextInput
              label="Role"
              hint="e.g. Designated Safeguarding Lead (DSL)."
              value={person.label}
              onChange={(label) => update({ ...person, label })}
              error={errors[`contacts.${i}.label`]}
            />
            <TextInput
              label="Name"
              value={person.name}
              onChange={(name) => update({ ...person, name })}
              error={errors[`contacts.${i}.name`]}
            />
            <TextInput
              label="Phone (optional)"
              value={person.phone}
              onChange={(v) => update({ ...person, phone: optional(v) })}
              error={errors[`contacts.${i}.phone`]}
            />
          </>
        )}
      />
    </Stack>
  );
}

function LinkQrForm({ content, onChange, errors }: FormProps<"LINK_QR">) {
  return (
    <Stack>
      <TextInput
        label="Button label"
        value={content.label}
        onChange={(label) => onChange({ ...content, label })}
        error={errors.label}
      />
      <TextInput
        label="Link"
        hint="A full https:// address, so the QR code works when scanned."
        value={content.url}
        onChange={(url) => onChange({ ...content, url })}
        error={errors.url}
      />
      <TextArea
        label="Description (optional)"
        value={content.description}
        onChange={(v) => onChange({ ...content, description: optional(v) })}
        error={errors.description}
        rows={2}
      />
    </Stack>
  );
}

/** The next unused option id: a, b, c… */
function nextOptionId(options: Array<{ id: string }>) {
  const used = new Set(options.map((o) => o.id));
  for (const letter of "abcdefghijklmnopqrstuvwxyz") {
    if (!used.has(letter)) return letter;
  }
  return `o${options.length + 1}`;
}

function KnowledgeCheckForm({
  content,
  onChange,
  errors,
}: FormProps<"KNOWLEDGE_CHECK">) {
  return (
    <RepeatableList
      legend="Questions"
      itemLabel="Question"
      items={content.questions}
      onChange={(questions) => onChange({ ...content, questions })}
      create={() => ({
        prompt: "",
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
        ],
        correctOptionId: "a",
        explanation: "",
      })}
      error={errors.questions}
      render={(question, update, q) => (
        <>
          <TextArea
            label="Question"
            rows={2}
            value={question.prompt}
            onChange={(prompt) => update({ ...question, prompt })}
            error={errors[`questions.${q}.prompt`]}
          />
          <RepeatableList
            legend="Options"
            itemLabel="Option"
            items={question.options}
            min={2}
            onChange={(options) => update({ ...question, options })}
            create={() => ({ id: nextOptionId(question.options), text: "" })}
            error={errors[`questions.${q}.options`]}
            render={(option, updateOption, o) => (
              <div className="flex flex-col gap-2">
                <TextInput
                  label="Answer"
                  value={option.text}
                  onChange={(text) => updateOption({ ...option, text })}
                  error={errors[`questions.${q}.options.${o}.text`]}
                />
                <label className="flex items-center gap-2 text-small">
                  <input
                    type="radio"
                    name={`correct-${q}`}
                    checked={question.correctOptionId === option.id}
                    onChange={() =>
                      update({ ...question, correctOptionId: option.id })
                    }
                    className="accent-lime"
                  />
                  This is the correct answer
                </label>
              </div>
            )}
          />
          {errors[`questions.${q}.correctOptionId`] && (
            <p role="alert" className="text-[12px] text-danger">
              Choose the correct answer.
            </p>
          )}
          <TextArea
            label="Explanation"
            hint="Shown after they answer."
            rows={2}
            value={question.explanation}
            onChange={(explanation) => update({ ...question, explanation })}
            error={errors[`questions.${q}.explanation`]}
          />
        </>
      )}
    />
  );
}

const NARRATOR_STATES = [
  { value: "wave", label: "Wave (hello)" },
  { value: "point", label: "Point (look at this)" },
  { value: "think", label: "Think" },
  { value: "encourage", label: "Encourage" },
  { value: "celebrate", label: "Celebrate" },
] as const;

function NarratorCalloutForm({
  content,
  onChange,
  errors,
}: FormProps<"NARRATOR_CALLOUT">) {
  return (
    <Stack>
      <SelectInput
        label="Pose"
        value={content.state}
        options={[...NARRATOR_STATES]}
        onChange={(state) => onChange({ ...content, state: state ?? "point" })}
        error={errors.state}
      />
      <TextArea
        label="What the guide says"
        value={content.text}
        onChange={(text) => onChange({ ...content, text })}
        error={errors.text}
        rows={3}
      />
    </Stack>
  );
}

const FORMS: {
  [T in BlockType]: (props: FormProps<T>) => ReactNode;
} = {
  HEADING: HeadingForm,
  TEXT: TextForm,
  IMAGE: ImageForm,
  VIDEO: VideoForm,
  FLIP_CARDS: FlipCardsForm,
  ACCORDION: AccordionForm,
  TABS: TabsForm,
  TIMELINE: TimelineForm,
  PYRAMID: PyramidForm,
  PEOPLE: PeopleForm,
  REFLECTION: ReflectionForm,
  CHECKLIST: ChecklistForm,
  CONTACT: ContactForm,
  LINK_QR: LinkQrForm,
  KNOWLEDGE_CHECK: KnowledgeCheckForm,
  NARRATOR_CALLOUT: NarratorCalloutForm,
};

/** The form for a block of the given type. */
export function BlockForm({
  type,
  content,
  onChange,
  errors,
}: {
  type: BlockType;
  content: unknown;
  onChange: (content: unknown) => void;
  errors: Errors;
}) {
  const Form = FORMS[type] as (props: FormProps<BlockType>) => ReactNode;
  return (
    <Form
      content={content as BlockContent<BlockType>}
      onChange={onChange}
      errors={errors}
    />
  );
}
