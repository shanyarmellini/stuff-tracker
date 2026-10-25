import { env } from "~/env";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = "jev-latest";
const PURCHASE_QUESTION =
  "Is this email subject line from a purchase or order confirmation?";

type SystemOneResponse = {
  answers: {
    purchase: { type: "noul"; noul: number };
  };
};

/**
 * Asks Jev whether a single email subject looks like a purchase or order
 * confirmation. Returns the probability (0-1) that it does. Each subject is a
 * separate request because Jev answers questions about one `state` at a time.
 */
export async function scoreSubjectAsPurchase(subject: string): Promise<number> {
  const res = await fetch(JEV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.JEV_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: JEV_MODEL,
      state: subject,
      questions: {
        purchase: {
          type: "noul",
          instructions: PURCHASE_QUESTION,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Jev request failed with status ${res.status}`);
  }

  const data = (await res.json()) as SystemOneResponse;
  return data.answers.purchase.noul;
}
