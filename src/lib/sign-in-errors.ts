/**
 * What to tell the volunteer when Supabase won't send. A 429 is either the
 * gap Supabase needs between emails to one address ("…after 42 seconds") or
 * the project-wide hourly cap.
 */
export function sendErrorMessage(error: { status?: number; message: string }) {
  if (error.status !== 429) {
    return "We couldn't send your link right now. Please try again in a moment.";
  }
  const seconds = error.message.match(/after (\d+) seconds?/)?.[1];
  if (seconds) {
    return `We've just sent you a link. Please wait about ${seconds} seconds before asking for another one.`;
  }
  return "We've sent a lot of sign-in emails in the last hour. Please try again in a few minutes.";
}
