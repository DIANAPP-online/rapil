import axios, { AxiosError } from 'axios'
import { isNativeError } from 'util/types'
import { ResourceSession } from '../session'
import { expect, test } from 'vitest'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function send_hello() {
  await sleep(0)
  return 'hello'
}

class SessionTest extends ResourceSession {
  constructor() {
    super(axios.create())
  }

  public async test_successed_promise(): Promise<string> {
    return await this.run_with_alive_session_check(send_hello())
  }

  public async test_error_response_session(): Promise<boolean> {
    const promise = new Promise(() => {
      const error = new AxiosError()
      error.status = 401
      throw error
    })
    
    try {
      await this.run_with_alive_session_check(promise)
      return false
    } catch (e: unknown) {
      if (!isNativeError(e) || e.message !== 'Current session died') {
        return false
      } else {
        return true
      }
    }
  }

  public async test_die_session(): Promise<boolean> {
    const promise = new Promise<string>(() => 'hello')

    try {
      await this.run_with_alive_session_check(promise)
    } catch (e: unknown) {
      if (!isNativeError(e) || e.message !== 'Current session died') {
        return false
      } else {
        return true
      }
    }

    return false
  }
}
const sessionTest = new SessionTest()

test('test successed promise', async () => {
  await expect(sessionTest.test_successed_promise()).resolves.toBeTruthy()
})

test('test axios error', async () => {
  await expect(sessionTest.test_error_response_session()).resolves.toBeTruthy()
})

test('test session die', async () => {
  await expect(sessionTest.test_die_session()).resolves.toBeTruthy()
})
