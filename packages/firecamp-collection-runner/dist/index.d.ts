import { IRunnerOptions } from './types.js';
export { ERunnerEvents, IRunStatistics } from './types.js';
import '@firecamp/types';

declare class Runner {
    private collection;
    private options;
    private folderRunSequence;
    private testResults;
    private emitter;
    private runStatistics;
    constructor(collection: any, options: IRunnerOptions);
    private assignDefaultOptions;
    /**
     * validate that the collection format is valid
     * TODO: late we need to add the zod or json schema here for strong validation
     *
     * @param collection "collection json payload"
     * @returns boolean
     */
    private validate;
    private prepareFolderRunSequence;
    private updateResponseStatistics;
    private runRequest;
    private runFolder;
    private runRootRequests;
    private runIteration;
    run(): {
        on: (evt: string, fn: (...a: any[]) => void) => any;
    };
    private exposeOnlyOn;
}

export { IRunnerOptions, Runner as default };
