import {
  __publicField
} from "./chunk-XXPGZHWZ.js";
import EventEmitter from "eventemitter3";
import { ERunnerEvents } from "./types.js";
const delay = async (ts) => {
  return new Promise((rs) => {
    setTimeout(() => {
      rs();
    }, ts);
  });
};
class Runner {
  constructor(collection, options) {
    __publicField(this, "collection");
    __publicField(this, "options");
    __publicField(this, "folderRunSequence");
    __publicField(this, "testResults", []);
    __publicField(this, "emitter");
    __publicField(this, "runStatistics", {
      stats: {
        iterations: { failed: 0, total: 0 },
        requests: { failed: 0, total: 0 },
        tests: { failed: 0, total: 0 }
      },
      timings: {
        started: 0,
        runDuration: 0,
        responseMin: 0,
        responseMax: 0,
        responseAvg: 0,
        responseTotal: 0
      },
      transfers: {
        responseTotal: 0
      }
    });
    this.collection = collection;
    this.options = options;
    this.folderRunSequence = /* @__PURE__ */ new Set();
    this.emitter = new EventEmitter();
    this.validate();
    this.assignDefaultOptions();
    this.prepareFolderRunSequence();
  }
  assignDefaultOptions() {
    if (!this.options.hasOwnProperty("iterationCount"))
      this.options.iterationCount = 1;
    if (!this.options.hasOwnProperty("delayRequest"))
      this.options.delayRequest = 0;
    if (!this.options.hasOwnProperty("timeout"))
      this.options.timeout = 0;
    if (!this.options.hasOwnProperty("timeoutRequest"))
      this.options.timeoutRequest = 0;
    if (typeof this.options.iterationCount != "number")
      throw new Error("--iteration-count is invalid", { cause: "invalidOption" });
    if (typeof this.options.delayRequest != "number")
      throw new Error("--delay-request is invalid", { cause: "invalidOption" });
    if (typeof this.options.timeout != "number")
      throw new Error("--timeout is invalid", { cause: "invalidOption" });
    if (typeof this.options.timeoutRequest != "number")
      throw new Error("--timeout-request is invalid", { cause: "invalidOption" });
  }
  /**
   * validate that the collection format is valid
   * TODO: late we need to add the zod or json schema here for strong validation
   * 
   * @param collection "collection json payload"
   * @returns boolean
   */
  validate() {
    const { collection: _c, folders: _fs, requests: _rs, requestItems: _ris, __meta } = this.collection;
    if (!__meta?.version)
      throw new Error("The collection format is invalid");
    if (_fs && !Array.isArray(_fs))
      throw new Error("The collection's folders format is invalid");
    if (_rs && !Array.isArray(_rs))
      throw new Error("The collection's requests format is invalid");
    if (_ris && !Array.isArray(_ris))
      throw new Error("The collection's request items format is invalid");
    return true;
  }
  prepareFolderRunSequence() {
    const { collection, folders } = this.collection;
    const folderMap = new Map(folders.map((folder) => [folder.__ref.id, folder]));
    const traverseFolders = (order) => order.flatMap(
      (folderId) => folderMap.has(folderId) ? [folderId, ...traverseFolders([folderMap.get(folderId).__ref.folderId])] : []
    );
    const ids = traverseFolders(collection.__meta.fOrders);
    ids.forEach(this.folderRunSequence.add, this.folderRunSequence);
  }
  updateResponseStatistics(response) {
    const {
      testResult,
      response: { code, status, responseSize, responseTime }
    } = response;
    if (Number.isInteger(testResult.total))
      this.runStatistics.stats.tests.total += testResult.total;
    if (Number.isInteger(testResult.failed))
      this.runStatistics.stats.tests.failed += testResult.failed;
    if (Number.isInteger(responseSize))
      this.runStatistics.transfers.responseTotal += responseSize;
    if (Number.isInteger(responseTime)) {
      const {
        stats: { requests },
        timings: { responseMin, responseMax }
      } = this.runStatistics;
      if (responseMin == 0)
        this.runStatistics.timings.responseMin = responseTime;
      else if (responseTime < responseMin)
        this.runStatistics.timings.responseMin = responseTime;
      if (responseMax == 0)
        this.runStatistics.timings.responseMax = responseTime;
      else if (responseTime > responseMax)
        this.runStatistics.timings.responseMax = responseTime;
      this.runStatistics.timings.responseTotal += responseTime;
      this.runStatistics.timings.responseAvg = this.runStatistics.timings.responseTotal / requests.total;
    }
  }
  async runRequest(requestId) {
    const { folders, requests } = this.collection;
    const request = requests.find((r) => r.__ref.id == requestId);
    this.emitter.emit(ERunnerEvents.BeforeRequest, {
      name: request.__meta.name,
      url: request.url.raw,
      method: request.method.toUpperCase(),
      path: fetchRequestPath(folders, request),
      id: request.__ref.id
    });
    await delay(this.options.delayRequest);
    const { globals, environment } = this.options;
    const executor = this.options.getExecutor();
    const response = await executor.send(request, { collectionVariables: [], environment, globals });
    ;
    this.updateResponseStatistics(response);
    this.emitter.emit(ERunnerEvents.Request, {
      id: request.__ref.id,
      response
    });
    this.runStatistics.stats.requests.total += 1;
    return { request, response };
  }
  async runFolder(folderId) {
    const folder = this.collection.folders.find((f) => f.__ref.id == folderId);
    const requestIds = folder.__meta.rOrders || [];
    if (!requestIds.length)
      return;
    this.emitter.emit(ERunnerEvents.BeforeFolder, {
      name: folder.name,
      id: folder.__ref.id
    });
    try {
      for (let i = 0; i < requestIds.length; i++) {
        const res = await this.runRequest(requestIds[i]);
        this.testResults.push(res);
      }
    } catch (e) {
      console.error(`Error while running the collection:`, e);
    }
    this.emitter.emit(ERunnerEvents.Folder, {
      id: folder.__ref.id
    });
  }
  async runRootRequests() {
    const { collection } = this.collection;
    const requestIds = collection.__meta.rOrders || [];
    if (!requestIds.length)
      return;
    this.emitter.emit(ERunnerEvents.BeforeFolder, {
      name: "./",
      id: collection.__ref.id
    });
    try {
      for (let i = 0; i < requestIds.length; i++) {
        const res = await this.runRequest(requestIds[i]);
        this.testResults.push(res);
      }
    } catch (e) {
      console.error(`Error while running the collection:`, e);
    }
    this.emitter.emit(ERunnerEvents.Folder, {
      id: collection.__ref.id
    });
  }
  async runIteration() {
    try {
      const folderSet = this.folderRunSequence.values();
      const next = async () => {
        const { value: folderId, done } = folderSet.next();
        if (!done) {
          await this.runFolder(folderId);
          await next();
        }
      };
      await next();
      await this.runRootRequests();
    } catch (e) {
      console.error(`Error while running the collection:`, e);
    }
  }
  run() {
    setTimeout(async () => {
      const { collection } = this.collection;
      this.runStatistics.timings.started = (/* @__PURE__ */ new Date()).valueOf();
      this.emitter.emit(ERunnerEvents.Start, {
        name: collection.name,
        id: collection.__ref.id
      });
      for (let i = 0; i < this.options.iterationCount; i++) {
        this.emitter.emit(ERunnerEvents.BeforeIteration, {
          current: i + 1,
          total: this.options.iterationCount
        });
        await this.runIteration();
        this.emitter.emit(ERunnerEvents.Iteration, {
          current: i + 1,
          total: this.options.iterationCount
        });
        this.runStatistics.stats.iterations.total += 1;
      }
      this.runStatistics.timings.runDuration = (/* @__PURE__ */ new Date()).valueOf() - this.runStatistics.timings.started;
      this.emitter.emit(ERunnerEvents.Done, this.runStatistics);
    });
    return this.exposeOnlyOn();
  }
  exposeOnlyOn() {
    return {
      on: (evt, fn) => {
        this.emitter.on(evt, fn);
        return this.exposeOnlyOn();
      }
    };
  }
}
const fetchRequestPath = (folders, request) => {
  const requestPath = [];
  const requestFolderId = request.__ref.folderId;
  let currentFolder = folders.find((folder) => folder.__ref.id === requestFolderId);
  while (currentFolder) {
    requestPath.unshift(currentFolder.name);
    const parentFolderId = currentFolder.__ref.folderId;
    currentFolder = folders.find((folder) => folder.__ref.id === parentFolderId);
  }
  return `./${requestPath.join("/")}`;
};
export * from "./types.js";
export {
  Runner as default
};
