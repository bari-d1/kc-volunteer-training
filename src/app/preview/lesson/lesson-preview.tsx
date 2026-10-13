import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PillTag } from "@/components/ui/pill-tag";
import { Reveal } from "@/components/ui/reveal";
import { mockCourse } from "@/lib/mock-course";

/** Placeholder lesson body for the given module. */
export function LessonPreview({ moduleId }: { moduleId: string }) {
  const { modules } = mockCourse;
  const index = modules.findIndex((m) => m.id === moduleId);
  const lesson = modules[index];
  const previous = modules
    .slice(0, index)
    .findLast((m) => m.status !== "locked");
  const next = modules.slice(index + 1).find((m) => m.status !== "locked");

  return (
    <article className="flex flex-col gap-8">
      <Reveal className="flex flex-col gap-4">
        <PillTag>
          Module {index + 1} of {modules.length}
        </PillTag>
        <h1 className="text-h1">{lesson.title}</h1>
        <p className="text-body-lg text-muted">
          Placeholder lesson content. This page previews the course layout with
          mock data; real lessons arrive with the data model.
        </p>
      </Reveal>

      <div className="flex flex-col gap-5 text-body">
        <Reveal>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer
            posuere erat a ante venenatis dapibus. Donec ullamcorper nulla non
            metus auctor fringilla. Vestibulum id ligula porta felis euismod
            semper.
          </p>
        </Reveal>
        <Reveal className="flex flex-col gap-5">
          <h2 className="text-h2">A section heading</h2>
          <p>
            Cras mattis consectetur purus sit amet fermentum. Aenean lacinia
            bibendum nulla sed consectetur. Maecenas faucibus mollis interdum.
            Nullam quis risus eget urna mollis ornare vel eu leo.
          </p>
        </Reveal>
        <Reveal>
          <Card header={<h3 className="text-h3">Key takeaway</h3>}>
            <p className="text-body text-muted">
              Sed posuere consectetur est at lobortis. Praesent commodo cursus
              magna, vel scelerisque nisl consectetur et.
            </p>
          </Card>
        </Reveal>
        <Reveal>
          <p>
            Etiam porta sem malesuada magna mollis euismod. Duis mollis, est non
            commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem
            nec elit.
          </p>
        </Reveal>
      </div>

      <Reveal className="flex flex-wrap justify-between gap-4 border-t border-surface-2 pt-8">
        <Button
          href={previous ? `/preview/lesson/${previous.id}` : "/preview/lesson"}
          variant="ghost"
          disabled={!previous}
        >
          ← Previous
        </Button>
        <Button
          href={next ? `/preview/lesson/${next.id}` : "/preview/lesson"}
          disabled={!next}
        >
          Next module →
        </Button>
      </Reveal>
    </article>
  );
}
