import { ChatGPTMessage } from "../../models";
import { searchDocsActionName } from "../../builtinActions";
import { snakeToCamel } from "../../utils";

export function actionFilteringPrompt(args: {
  userRequest: string;
  actionDescriptions: string[];
  orgName: string;
}): ChatGPTMessage[] {
  const containsDocs = args.actionDescriptions.some((a) =>
    a.includes(snakeToCamel(searchDocsActionName)),
  );
  return [
    {
      role: "system",
      content: `You are ${
        args.orgName || "a"
      } chatbot AI. Your task is to select functions that can be used to answer a user's request. A developer will use these to write code to answer the user's request${
        !containsDocs ? "" : " or write the answer based on the relevant docs"
      }

Below are all ${
        args.actionDescriptions.length
      } functions. You MUST ONLY select from these
\`\`\`
${args.actionDescriptions.map((a, idx) => `${idx + 1}. ${a}`).join("\n")}
\`\`\`

RULES:
1. Select the functions needed to fulfill the user's request by writing them as a list under 'Selected functions'. Leave it empty if none are relevant or the user's request isn't possible. If the user's request is unclear, also leave it empty.
2. NEVER write code or pseudocode
3. STOP WRITING after the selected functions list
4. ${
        containsDocs
          ? ""
          : `CONSIDER whether ${searchDocsActionName} is relevant\n5. `
      }Respond in the following format (Thoughts as numbered list):
\`\`\`
Thoughts:
1. Think step-by-step how to use the functions to answer the user's request
2. break down the user's request into steps in extreme detail
3. specifically name EVERY SINGLE function and variable you will use
4. specify where you'll get every variable from - you may need to call another function first. THIS IS VERY IMPORTANT. DO NOT FORGET THIS

Selected functions:
selected_function_1
selected_function_2
\`\`\`

User's request: ${args.userRequest}`,
    },
  ];
}

export interface ActionFilteringOutput {
  thoughts: string;
  selectedFunctions: string[];
}
export function parseActionFilteringOutput(
  output: string,
  possibleOutputs: string[],
): ActionFilteringOutput {
  // Split out into thoughts and selected functions
  if (!output.includes("Selected functions:")) {
    return { thoughts: "", selectedFunctions: [] };
  }
  const thoughts = output.split("Selected functions:")[0].split("Thoughts:")[1];
  return {
    thoughts: thoughts ? thoughts.trim() : "",
    selectedFunctions: output
      .split("Selected functions:")[1]
      .trim()
      .split("\n")
      .filter((s) => s.trim() !== "")
      .map((s) => {
        const match = s.match(/^(\d. |- )?([\w_]+).*\s?.*$/);
        if (!match) return "";
        return match[2];
      })
      .filter(Boolean)
      .filter((s) => possibleOutputs.includes(s)),
  };
}
