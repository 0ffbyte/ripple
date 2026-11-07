import type { ComponentType } from "react";
import { motion } from "motion/react";
import { getToolName, type DynamicToolUIPart, type ToolUIPart } from "ai";
import type { ToolName } from "@/lib/ai/agent/tools";
import Markdown from "./markdown";

type WidgetProps = {
  part: ToolUIPart | DynamicToolUIPart;
  hasResponse?: boolean;
};

const widgets: Partial<Record<ToolName, ComponentType<WidgetProps>>> = {
  get_time: TimeWidget,
};

function hasWidget(name: string): name is ToolName {
  return name in widgets;
}

export default function ToolWidget({ part }: WidgetProps) {
  if (part.state !== "output-available") return null;

  const name = getToolName(part);
  if (!hasWidget(name)) return null;

  const Widget = widgets[name];
  return Widget ? (
    <motion.div
      initial={{ opacity: 0, filter: "blur(4px)", y: 12 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Widget part={part} />
    </motion.div>
  ) : null;
}

function TimeWidget({ part }: WidgetProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      <Markdown
        value="It's Nimrod Workman's time, nigga."
        streaming={part.state !== "output-available"}
      />
      <img
        src="https://www.arts.gov/sites/default/files/styles/portrait/public/images/heritage1986-workman.jpg?itok=vfDgRsT3"
        className="w-full h-64 object-cover rounded-xl"
      />
    </div>
  );
}
