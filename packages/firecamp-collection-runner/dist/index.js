var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import EventEmitter from "eventemitter3";
const delay = async (ts) => {
  return new Promise((rs) => {
    setTimeout(() => {
      rs();
    }, ts);
  });
};
var ERunnerEvents = /* @__PURE__ */ ((ERunnerEvents2) => {
  ERunnerEvents2["Start"] = "start";
  ERunnerEvents2["BeforeRequest"] = "beforeRequest";
  ERunnerEvents2["Request"] = "request";
  ERunnerEvents2["Done"] = "done";
  return ERunnerEvents2;
})(ERunnerEvents || {});
class Runner {
  constructor(collection, options) {
    __publicField(this, "collection");
    __publicField(this, "options");
    __publicField(this, "requestOrdersForExecution");
    __publicField(this, "executedRequestQueue");
    __publicField(this, "currentRequestInExecution");
    __publicField(this, "testResults", []);
    __publicField(this, "emitter");
    __publicField(this, "i", 0);
    this.collection = collection;
    this.options = options;
    this.requestOrdersForExecution = /* @__PURE__ */ new Set();
    this.executedRequestQueue = /* @__PURE__ */ new Set();
    this.currentRequestInExecution = "";
    this.emitter = new EventEmitter();
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
  /**
   * prepare an Set of request execution order
   */
  prepareRequestExecutionOrder() {
    const { collection, folders } = this.collection;
    const { __meta: { fOrders: rootFolderIds = [], rOrders: rootRequestIds = [] } } = collection;
    const extractRequestIdsFromFolder = (fId, requestIds = []) => {
      const folder = folders.find((f) => f.__ref.id == fId);
      if (!folder)
        return requestIds;
      if (folder.__meta.fOrders?.length) {
        const rIds = folder.__meta.fOrders.map((fId2) => extractRequestIdsFromFolder(fId2, requestIds));
        requestIds = [...requestIds, ...rIds];
      }
      if (folder.__meta.rOrders?.length) {
        requestIds = [...requestIds, ...folder.__meta.rOrders];
      }
      return requestIds;
    };
    if (Array.isArray(rootFolderIds)) {
      rootFolderIds.map((fId) => {
        const requestIds = extractRequestIdsFromFolder(fId);
        requestIds.forEach(this.requestOrdersForExecution.add, this.requestOrdersForExecution);
      });
    }
    if (Array.isArray(rootRequestIds)) {
      rootRequestIds.forEach(this.requestOrdersForExecution.add, this.requestOrdersForExecution);
    }
  }
  async executeRequest(requestId) {
    const { folders, requests } = this.collection;
    const request = requests.find((r) => r.__ref.id == requestId);
    this.emitter.emit("beforeRequest" /* BeforeRequest */, {
      name: request.__meta.name,
      url: request.url.raw,
      method: request.method.toUpperCase(),
      path: fetchRequestPath(folders, request),
      id: request.__ref.id
    });
    await delay(500);
    const response = await this.options.executeRequest(request);
    this.emitter.emit("request" /* Request */, {
      id: request.__ref.id,
      response
    });
    return { request, response };
  }
  async start() {
    try {
      const { value: requestId, done } = this.requestOrdersForExecution.values().next();
      this.i = this.i + 1;
      if (!done) {
        this.currentRequestInExecution = requestId;
        const res = await this.executeRequest(requestId);
        this.testResults.push(res);
        this.executedRequestQueue.add(requestId);
        this.requestOrdersForExecution.delete(requestId);
        await this.start();
      }
    } catch (error) {
      console.error(`Error while running the collection:`, error);
    }
  }
  exposeOnlyOn() {
    return {
      on: (evt, fn) => {
        this.emitter.on(evt, fn);
        return this.exposeOnlyOn();
      }
    };
  }
  run() {
    try {
      this.validate();
    } catch (e) {
      throw e;
    }
    this.prepareRequestExecutionOrder();
    setTimeout(async () => {
      const { collection } = this.collection;
      this.emitter.emit("start" /* Start */, {
        name: collection.name,
        id: collection.__ref.id
      });
      await this.start();
      this.emitter.emit("done" /* Done */);
    });
    return this.exposeOnlyOn();
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
export {
  ERunnerEvents,
  Runner as default
};
