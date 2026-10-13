import { Button, type ButtonProps } from "@/components/ui/button";
import { signOut } from "@/lib/auth-actions";

export function SignOutButton({
  variant = "ghost",
  size = "sm",
}: Pick<ButtonProps, "variant" | "size">) {
  return (
    <form action={signOut}>
      <Button type="submit" variant={variant} size={size}>
        Sign out
      </Button>
    </form>
  );
}
