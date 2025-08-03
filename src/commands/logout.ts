import { CommandOptionValues } from "../Types";

export default function (input: CommandOptionValues) {
  return Promise.resolve()
    .then(() => {
      console.log(JSON.stringify(input, null, 2));
    })
    .catch((error) => {
      console.error(error);
    });
}
