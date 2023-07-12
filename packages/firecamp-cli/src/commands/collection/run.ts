import { Args, Command, Flags } from '@oclif/core'
import { loadJsonFile } from 'load-json-file';
import c from 'kleur';
import figlet from 'figlet'
//@ts-ignore https://github.com/egoist/tsup/issues/760
import Runner, { ERunnerEvents, IRunnerOptions } from '@firecamp/collection-runner'
import _RestExecutor from '@firecamp/rest-executor';
//@ts-ignore //TODO: rest-executor is commonjs lib while runner is esm. we'll move all lib in esm in future
const RestExecutor = _RestExecutor.default
import CliReporter from '../../reporters/cli.js'
/**
 * Run command example
 * ./bin/dev run ../../test/data/FirecampRestEchoServer.firecamp_collection.json
 */
export default class Run extends Command {
  static description = 'Run Firecamp Collection'

  static examples = [
    '<%= config.bin %> <%= command.id %> ./echo.firecamp_collection.json',
  ]

  static flags = {
    'environment': Flags.string({ char: 'e', description: 'Provide a path to a Firecamp Environment file' }),
    'globals': Flags.string({ char: 'g', description: 'Provide a path to a Firecamp Globals file' }),
    'iteration-count': Flags.string({ char: 'n', description: 'Set the number of iterations for the collection run' }),
    // 'iteration-data': Flags.string({ char: 'd', description: 'Provide the data file to be used for iterations. (should be JSON or CSV) file to use for iterations JSON or CSV' }),
    'delay-request': Flags.integer({ description: 'Set the extent of delay between requests in milliseconds (default: 0)' }),
    // timeout: Flags.integer({ description: 'Set a timeout for collection run in milliseconds (default: 0)' }),
    // 'timeout-request': Flags.integer({ description: 'Set a timeout for requests in milliseconds (default: 0)' }),
  }

  static args = {
    path: Args.string({ description: 'provide the collection path' }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Run)
    const { path } = args
    if (!path) {
      this.logError('The collection path is missing')
      return
    }
    const {
      environment,
      globals,
      "iteration-count": iterationCount,
      "iteration-data": iterationData,
      timeout,
      "delay-request": delayRequest,
      "timeout-request": timeoutRequest,
    } = flags;

    // const _filepath = new URL(`../../../${path}`, import.meta.url).pathname
    loadJsonFile(path)
      .then(async (collection) => {

        let envObj = { values: [] };
        let globalObj = { values: [] };
        if (environment) {
          try {
            envObj = await loadJsonFile(environment)
          } catch (e: any) {
            this.logError('could not load environment', e, 1)
          }
        }

        if (globals) {
          try {
            globalObj = await loadJsonFile(globals)
          } catch (e: any) {
            this.logError('could not load globals', e);
          }
        }
        // this.logJson(collection);
        const options: IRunnerOptions = {
          getExecutor: () => new RestExecutor(),
          environment: envObj.values || [],
          globals: globalObj.values || []
        }
        if (iterationCount) options.iterationCount = +iterationCount;
        if (iterationData) options.iterationData = iterationData;
        if (timeout) options.timeout = +timeout;
        if (delayRequest) options.delayRequest = +delayRequest;
        if (timeoutRequest) options.timeoutRequest = +timeoutRequest;

        this.log(c.gray(figlet.textSync("Firecamp")));

        const runner = new Runner(collection, options);
        const emitter = runner.run()
        new CliReporter(emitter);
      })
      .catch(e => {
        // console.error(e)
        if (e.code == 'ENOENT') this.logError(`Error: could not load collection file`, e, 1);
        else this.logError('The collection file is not valid', null, 1);
      })
  }

  logError(title: string, e?: any, exitCode?: number) {
    if (title) this.logToStderr(`${c.red('Error')}: ${title}`);
    if (e?.message) this.logToStderr(`    `, e.message);
    if (Number.isInteger(exitCode)) process.exit(exitCode);
  }
}
