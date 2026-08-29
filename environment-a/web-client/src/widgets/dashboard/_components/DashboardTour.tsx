import { Joyride, type EventData } from "react-joyride";
import { DashboardTourTooltip } from "@/widgets/dashboard/_components/DashboardTourTooltip";
import { joyrideStyles, type DashboardTourStep } from "@/widgets/dashboard/lib/dashboardTour";

type DashboardTourProps = {
    run: boolean;
    stepIndex: number;
    steps: DashboardTourStep[];
    onEvent: (data: EventData) => void;
};

export function DashboardTour({ run, stepIndex, steps, onEvent }: DashboardTourProps): JSX.Element {
    return (
        <Joyride
            continuous
            run={run}
            stepIndex={stepIndex}
            steps={steps}
            styles={joyrideStyles}
            tooltipComponent={DashboardTourTooltip}
            options={{ closeButtonAction: "skip", overlayClickAction: "close", showProgress: true }}
            locale={{ back: "Kembali", close: "Tutup", last: "Selesai", next: "Lanjut", skip: "Lewati" }}
            onEvent={onEvent}
        />
    );
}
