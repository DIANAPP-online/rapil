import axios, { AxiosError } from "axios";
import { isNativeError } from "util/types";
import { ResourceSession } from "../resouceSession";


class SessionTest extends ResourceSession {
    constructor() {
        super(axios.create())
    }

    public async test(): Promise<void> {
        console.log('dolbaeb')
        let promise = new Promise<string>(() => 'hello')
        const promiseSuccess = await this.run_with_alive_session_check(promise)
        console.log('promise successed')
        if (promiseSuccess !== 'hello') {
            console.log('Test 1 failed')
        } else {
            console.log('Test 1 success')
        }
        try {
            promise = new Promise(() => {
                throw new AxiosError('')
            })
        } catch (e: unknown) {
            if (!isNativeError(e) || e.message !== "Current session died") {
                console.log('Test 2 failed')
            } else {
                console.log('Test 2 success')
            }
        }
        try {
            promise = new Promise(() => {
                return 'hello'
            })
        } catch (e: unknown) {
            if (!isNativeError(e) || e.message !== "Current session died") {
                console.log('Test 3 failed')
            } else {
                console.log('Test 3 success')
            }
        }
    }
}

// process.on('beforeExit',  async(code) => {
//     console.log('Process beforeExit event with code: ', code);
//     await new SessionTest().test()
//     console.log('here');
//   });

// process.on('exit', async (code) => {
// console.log('2: Process exit event with code: ', code);
// await new Promise(r => setTimeout(r, 5000));
// console.log('Gere');
// });

export default async function test() {
    console.log()
    await new SessionTest().test()
}