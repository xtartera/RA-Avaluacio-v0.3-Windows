import type {ReactNode} from "react";
import type {SortDirection} from "../lib/tableWorkflow";

export function SortHeading({children, active, direction, onClick}: {children: ReactNode; active: boolean; direction: SortDirection; onClick: () => void}) {
 return <th aria-sort={active ? direction === "asc" ? "ascending" : "descending" : "none"}><button className="sortHeading" onClick={onClick}>{children}<span aria-hidden="true">{active ? direction === "asc" ? "↑" : "↓" : "↕"}</span></button></th>;
}
