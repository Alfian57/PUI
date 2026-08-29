import { Grid2X2, List } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

export type ViewMode = "list" | "grid";

type ViewToggleProps = {
    value: ViewMode;
    onChange: (value: ViewMode) => void;
};

export function ViewToggle({ value, onChange }: ViewToggleProps): JSX.Element {
    return (
        <div className="flex items-center gap-2">
            <IconButton
                label="Tampilan daftar"
                icon={<List className="h-4 w-4" aria-hidden="true" />}
                active={value === "list"}
                onClick={() => onChange("list")}
            />
            <IconButton
                label="Tampilan grid"
                icon={<Grid2X2 className="h-4 w-4" aria-hidden="true" />}
                active={value === "grid"}
                onClick={() => onChange("grid")}
            />
        </div>
    );
}
