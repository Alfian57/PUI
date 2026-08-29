import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { ACTIONS, EVENTS, STATUS, type EventData } from "react-joyride";
import type { NavigateFunction } from "react-router-dom";
import {
    cleanupTourOverlay,
    getDashboardTourSteps,
    type DashboardTourRole,
    type DashboardTourStep
} from "@/widgets/dashboard/lib/dashboardTour";
import { ROUTES } from "@/app/routes";

type DashboardTourOptions = {
    role: DashboardTourRole;
    navigate: NavigateFunction;
    pathname: string;
    setSidebarOpen: Dispatch<SetStateAction<boolean>>;
};

export type DashboardTourController = {
    running: boolean;
    stepIndex: number;
    steps: DashboardTourStep[];
    start: () => void;
    onEvent: (data: EventData) => void;
};

export function useDashboardTour({
    role,
    navigate,
    pathname,
    setSidebarOpen
}: DashboardTourOptions): DashboardTourController {
    const [running, setRunning] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const steps = getDashboardTourSteps(role);

    function start(): void {
        setStepIndex(0);
        setRunning(true);
        navigate(role === "admin" ? ROUTES.app.analytics.overview : ROUTES.app.files);
    }

    function finish(): void {
        setRunning(false);
        setStepIndex(0);
        setSidebarOpen(false);
        window.setTimeout(cleanupTourOverlay, 0);
    }

    function onEvent(data: EventData): void {
        const { action, index, status, type } = data;
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            finish();
            return;
        }
        if (type !== EVENTS.STEP_AFTER && type !== EVENTS.TARGET_NOT_FOUND) {
            return;
        }
        const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
        const nextStep = steps[nextIndex];
        if (!nextStep) {
            finish();
            return;
        }
        setStepIndex(nextIndex);
        if (nextStep.route && pathname !== nextStep.route) navigate(nextStep.route);
        setSidebarOpen(Boolean(nextStep.sidebar));
    }

    return { running, stepIndex, steps, start, onEvent };
}
