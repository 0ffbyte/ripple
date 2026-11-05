import registerJobs from "./jobs";
import { warmUp } from "../ai/model";
import registerPorts from "./ports";
import registerCommands from "./commands";

export default function server() {
  warmUp();
  registerPorts();
  registerJobs();
  registerCommands();
}
