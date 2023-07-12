import { TId, TVariable } from '@firecamp/types';

declare enum ERunnerEvents {
    Start = "start",
    BeforeRequest = "beforeRequest",
    Request = "request",
    BeforeFolder = "beforeFolder",
    Folder = "folder",
    BeforeIteration = "beforeIteration",
    Iteration = "iteration",
    Done = "done"
}
interface IRunnerOptions {
    getExecutor: () => any;
    environment?: TId | TVariable[];
    globals?: TId | TVariable[];
    iterationCount?: number;
    iterationData?: string;
    delayRequest?: number;
    timeout?: number;
    timeoutRequest?: number;
}
type TStats = {
    total: number;
    failed: number;
};
interface IRunStatistics {
    /** stats contains the meta information of every components of run, every component will have 'total' and 'failed' count refs */
    stats: {
        iterations: TStats;
        requests: TStats;
        tests: TStats;
    };
    timings: {
        /** run start time */
        started: number;
        /** total time of the run */
        runDuration: number;
        /** average response time of the run */
        responseAvg: number;
        /** minimum response time of the run */
        responseMin: number;
        /** maximum response time of the run */
        responseMax: number;
        /** total response time of all requests */
        responseTotal: number;
    };
    transfers: {
        /** total response data received in run */
        responseTotal: 0;
    };
}

export { ERunnerEvents, IRunStatistics, IRunnerOptions };
