import { env } from "~/env";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = "jev-latest";
// A hung request would otherwise stall the whole scan; callers treat the
// resulting error like any other Jev failure.
const JEV_TIMEOUT_MS = 10_000;
const PURCHASE_QUESTION =
  "Is this email subject line from a purchase or order confirmation?";

type SystemOneResponse = {
  answers: {
    answer: { type: "noul"; noul: number };
  };
};

/**
 * Asks Jev one yes/no question about `state` and returns the probability
 * (0-1) that the answer is yes. Jev answers questions about one `state` at a
 * time, so every email or subject is a separate request.
 */
async function askJev(state: string, question: string): Promise<number> {
  const res = await fetch(JEV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.JEV_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: JEV_MODEL,
      state,
      questions: {
        answer: {
          type: "noul",
          instructions: question,
        },
      },
    }),
    signal: AbortSignal.timeout(JEV_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Jev request failed with status ${res.status}`);
  }

  const data = (await res.json()) as SystemOneResponse;
  const score = data?.answers?.answer?.noul;
  if (typeof score !== "number") {
    throw new Error("Jev returned an unexpected response");
  }
  return score;
}

/**
 * Asks Jev whether a single email subject looks like a purchase or order
 * confirmation. Returns the probability (0-1) that it does.
 */
export function scoreSubjectAsPurchase(subject: string): Promise<number> {
  return askJev(subject, PURCHASE_QUESTION);
}

/**
 * Asks Jev whether an order email includes at least one item in the user's
 * scan categories. `emailText` should already be trimmed (it is mostly item
 * names and prices); `categories` is a plain-language list such as
 * "clothing (tops, shoes), beauty (makeup, skincare)". Returns the
 * probability (0-1) that it does.
 */
export function scoreEmailForCategories(
  emailText: string,
  categories: string,
): Promise<number> {
  return askJev(
    emailText,
    `Does this order or receipt include at least one purchased item that is ${categories}? Ignore recommended or advertised products that weren't bought.`,
  );
}
