import { registry } from "@jahia/ui-extender";
import type { ComponentType } from "react";

type SelectorType = { cmp: ComponentType<Record<string, unknown>> };

// The choice list of the Content Editor, which jContent registers as the selector type Choicelist.
const ChoiceList = (props: Record<string, unknown>) => {
  const Cmp = (registry.get("selectorType", "Choicelist") as unknown as SelectorType).cmp;
  return <Cmp {...props}/>;
};

export default ChoiceList;
