-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "questions" JSONB;

-- Snapshot existing attempts from the questions as they are now, so later
-- edits don't change their review or marking. Attempts with a question that
-- no longer exists are left null (the app falls back to the live rows).
UPDATE "QuizAttempt" a
SET "questions" = snap.questions
FROM (
  SELECT a2.id,
         jsonb_agg(
           jsonb_build_object(
             'id', q.id,
             'prompt', q.prompt,
             'options', q.options,
             'correctOptionId', q."correctOptionId",
             'explanation', q.explanation
           ) ORDER BY ids.ord
         ) AS questions,
         count(q.id) AS found,
         jsonb_array_length(a2."questionIds") AS wanted
  FROM "QuizAttempt" a2
  CROSS JOIN LATERAL jsonb_array_elements_text(a2."questionIds") WITH ORDINALITY AS ids(id, ord)
  LEFT JOIN "QuizQuestion" q ON q.id::text = ids.id
  GROUP BY a2.id
) snap
WHERE a.id = snap.id AND snap.found = snap.wanted;
