import ora, { Ora } from 'ora';
import c from 'kleur';
import figures from 'figures';
import Table from 'cli-table3';
import prettyMs from 'pretty-ms';
import prettyBytes from 'pretty-bytes';
import { ERunnerEvents } from '@firecamp/collection-runner';

export default class Reporter {

    private request: any;
    private response: any;
    private spinner: Ora;
    constructor(emitter: any) {
        this.spinner = ora();
        emitter
            .on(ERunnerEvents.Start, (col: any) => {
                this.log(figures.squareCenter, c.bold(col.name))
                this.newLine();
            })
            .on(ERunnerEvents.BeforeIteration, (it: any) => {
                if (it.total > 1) {
                    this.log(c.gray().dim().underline(`Iteration ${it.current}/${it.total}`));
                    this.newLine();
                }
            })
            .on(ERunnerEvents.Iteration, () => {
                this.newLine();
            })
            .on(ERunnerEvents.BeforeFolder, (folder: any) => {
                this.log(figures.triangleRight, c.bold(folder.name));
            })
            .on(ERunnerEvents.Folder, (folder: any) => {
                this.newLine();
            })
            .on(ERunnerEvents.BeforeRequest, (request: any) => {
                this.onBeforeRequest(request)
            })
            .on(ERunnerEvents.Request, (result: any) => {
                this.onRequest(result)
            })
            .on(ERunnerEvents.Done, (result: any) => {
                this.onDone(result)
            });
    }
    initSpinner() {
        this.spinner = ora()
        // this.newLine();
    }

    onBeforeRequest(request: any) {
        // console.log(request)
        this.initSpinner()
        this.request = request
        this.response = null;
        this.spinner.start(this._title())
    }

    onRequest(result: any) {
        this.response = result?.response?.response
        if (result.response?.testResult) {
            const { testResult, testResult: { tests } } = result.response;
            this.spinner.stopAndPersist({
                symbol: '↳', //testResult.failed == 0 ? c.green(figures.tick) : c.red(figures.cross),
                text: this._title()
            });
            tests.map((t: any) => {
                if (t.isPassed) this.logTest(t)
                else this.logTest(t, true)
            })
            // console.log(testResult)
        }
        this.newLine();
    }

    onDone(result: any) {
        this.logResult(result)
    }

    newLine(n: number = 1) {
        if (n > 10) n = 5
        if (n < 0) n = 1;
        Array.from({ length: n }).forEach(() => this.log(''))
    }

    _title() {
        const { method = '', name = '', url, path } = this.request
        let title = `${name} ${c.dim().cyan(`(${path})`)}`;

        // title with url
        title = `${title}
  ${c.gray(method.toUpperCase() + ' ' + url)}`;

        if (this.response)
            title += '  ' + this._responseMeta()
        return title;
    }

    _responseMeta() {
        const { code, status, responseTime, responseSize } = this.response
        const line = `[${code + ' ' + status}, ${prettyBytes(responseSize)}, ${prettyMs(responseTime)}]`;
        return c.dim(line)
    }

    logTest(test: any, failed = false) {
        const { name, error } = test
        const log = !failed
            ? `${c.green('  ' + figures.tick)} ${c.gray(name)}`
            : `${c.red('  ' + figures.cross)} ${c.gray(name)}`
        this.log(log)

        if (error)
            this.log(`       `, c.italic().gray().dim(error.message))
        // throw new Error(error)
    }

    logResult(summary: any) {
        const { stats: { iterations, requests, tests }, timings, transfers } = summary;
        const _header = (h: string) => c.magenta(h);
        var table = new Table();
        table.push(
            ['', { hAlign: 'right', content: _header('executed') }, { hAlign: 'right', content: _header('failed') }],
            [
                { hAlign: 'right', content: c[iterations.failed ? 'red' : 'gray']('iterations') },
                { hAlign: 'right', content: iterations.total },
                { hAlign: 'right', content: c[iterations.failed ? 'red' : 'gray'](iterations.failed) }],
            [
                { hAlign: 'right', content: c[requests.failed ? 'red' : 'gray']('requests') },
                { hAlign: 'right', content: requests.total },
                { hAlign: 'right', content: c[requests.failed ? 'red' : 'gray'](requests.failed) }
            ],
            [
                { hAlign: 'right', content: c[tests.failed ? 'red' : 'gray']('tests') },
                { hAlign: 'right', content: tests.total },
                { hAlign: 'right', content: c[tests.failed ? 'red' : 'gray'](tests.failed) }
            ],
            [{ colSpan: 3, content: `total run duration: ${prettyMs(timings.runDuration)}` }],
            [{ colSpan: 3, content: `total data received: ${prettyBytes(transfers.responseTotal)} (approx)` }],
            [{ colSpan: 3, content: `average response time: ${prettyMs(timings.responseAvg)} [min: ${prettyMs(timings.responseMin)}, max: ${prettyMs(timings.responseMax)}]` }],
        );
        this.log(table.toString());
    }

    log(...l: any[]) {
        console.log(...l)
    }

}
