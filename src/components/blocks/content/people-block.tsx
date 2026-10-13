import { Avatar } from "@/components/ui/avatar";
import type { BlockProps } from "../block-props";

export function PeopleBlock({ people }: BlockProps<"PEOPLE">) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {people.map((person, index) => (
        <li
          key={index}
          className="flex flex-col items-center gap-3 text-center"
        >
          <Avatar
            name={person.name}
            src={person.photoUrl}
            ring={person.ringColour}
            size="lg"
            className="size-24 text-h3 sm:size-28"
          />
          <div className="flex flex-col gap-1">
            <span className="text-body font-extrabold uppercase">
              {person.name}
            </span>
            <span className="text-small text-muted">{person.role}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
