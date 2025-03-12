import axios, { AxiosError } from 'axios'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { isNativeError } from 'util/types'
import { ResourceSession } from '../session'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function send_hello() {
  await sleep(100)
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
      if (!isNativeError(e) || (e as Error).message !== 'Need reauth') {
        return false
      } else {
        return true
      }
    }
  }

  public test_alive_dead(): boolean {
    return !this.is_alive
  }

  public async test_die_session(): Promise<boolean> {
    try {
      await this.run_with_alive_session_check(send_hello())
    } catch (e: unknown) {
      if (!isNativeError(e) || e.message !== 'Need reauth') {
        return false
      } else {
        return true
      }
    }

    return false
  }
}
const sessionTest = new SessionTest()

describe('test resource session', () => {
  test('test successed promise', async () => {
    await expect(sessionTest.test_successed_promise()).resolves.toBeTruthy()
  })

  test('test axios error', async () => {
    await expect(sessionTest.test_error_response_session()).resolves.toBeTruthy()
  })

  test('test session is not alive after error', () => {
    expect(sessionTest.test_alive_dead()).toBeTruthy()
  })

  test('test died session throws error', async () => {
    await expect(sessionTest.test_die_session()).resolves.toBeTruthy()
  })
})
