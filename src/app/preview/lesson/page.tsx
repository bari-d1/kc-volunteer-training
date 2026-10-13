import type { Metadata } from "next";
import { CourseLayout } from "@/components/blocks/course-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PillTag } from "@/components/ui/pill-tag";
import { mockCourse } from "@/lib/mock-course";

export const metadata: Metadata = {
  title: "Lesson preview",
  robots: { index: false },
};

const currentModuleId = "what-we-believe";

export default function LessonPreviewPage() {
  const index = mockCourse.modules.findIndex((m) => m.id === currentModuleId);
  const lesson = mockCourse.modules[index];

  return (
    <CourseLayout course={mockCourse} currentModuleId={currentModuleId}>
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <PillTag>
            Module {index + 1} of {mockCourse.modules.length}
          </PillTag>
          <h1 className="text-h1">{lesson.title}</h1>
          <p className="text-body-lg text-muted">
            Placeholder lesson content. This page previews the course layout
            with mock data; real lessons arrive with the data model.
          </p>
        </header>

        <div className="flex flex-col gap-5 text-body">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer
            posuere erat a ante venenatis dapibus. Donec ullamcorper nulla non
            metus auctor fringilla. Vestibulum id ligula porta felis euismod
            semper.
          </p>
          <h2 className="text-h2">A section heading</h2>
          <p>
            Cras mattis consectetur purus sit amet fermentum. Aenean lacinia
            bibendum nulla sed consectetur. Maecenas faucibus mollis interdum.
            Nullam quis risus eget urna mollis ornare vel eu leo.
          </p>
          <Card header={<h3 className="text-h3">Key takeaway</h3>}>
            <p className="text-body text-muted">
              Sed posuere consectetur est at lobortis. Praesent commodo cursus
              magna, vel scelerisque nisl consectetur et.
            </p>
          </Card>
          <p>
            Etiam porta sem malesuada magna mollis euismod. Duis mollis, est non
            commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem
            nec elit.
          </p>
        </div>

        <footer className="flex flex-wrap justify-between gap-4 border-t border-surface-2 pt-8">
          <Button href="/preview/lesson" variant="ghost">
            ← Previous
          </Button>
          <Button href="/preview/lesson">Mark complete &amp; continue</Button>
        </footer>
      </article>
    </CourseLayout>
  );
}
