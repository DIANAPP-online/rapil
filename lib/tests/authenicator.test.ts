import type { AxiosHeaderValue } from 'axios'
import { afterEach, describe, expect, vi } from 'vitest'
import { OAuth2 } from '../authenticator'
import { IncorrectDataForAuth } from '../types'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

let counter_logins = 0
let counter_relogins = 0

vi.mock('axios', async (importActual) => {
  const actual = await importActual<typeof import ('axios')>()

  const mockAxios = {
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        ...actual.default.create(),
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return mockAxios
})

class AuthTest extends OAuth2 {
  protected counter: number = 0

  public async test_login_successed() {
    await this.login('username', 'password')
    return this.session.api.defaults.headers.Authorization
  }

  public async test_login_incorrectable_data() {
    await this.login('s', 'p')
  }

  public async test_login_counts(a: string, b: string): Promise<void> {
    await this.login(a, b)
    this.counter++
  }

  public get_refresh_token(): AxiosHeaderValue {
    return this.refresh_token
  }

  public get_authorization_header(): AxiosHeaderValue {
    return this.api.defaults.headers.Authorization
  }

  public async test_relogin_create_session(): Promise<boolean> {
    await this.relogin()
    const have_session = this.session
    const is_alive_session = this.session?.is_alive

    return have_session && is_alive_session
  }

  public async test_relogin_parallel(): Promise<void> {
    return this.relogin()
  }

  public async test_relogin_unsuccessed(): Promise<void> {
    await this.relogin()
  }
}

const authTest = new AuthTest('/e', 'https://')

describe('authenticator tests', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })
  it('test login successed', async () => {
    mocks.post.mockResolvedValue({
      data: { access_token: '1', refresh_token: '2', token_type: 'b' },
    })
    await expect(authTest.test_login_successed()).resolves.toBe('b 1')
  })

  it('test login unsuccessed', async () => {
    mocks.post.mockResolvedValue({ status: 401, detail: 'some text' })
    await expect(authTest.test_login_incorrectable_data()).rejects.toThrowError(IncorrectDataForAuth)
  })

  it('test parallel login', async () => {
    mocks.post.mockImplementation(() => {
      counter_logins++
      return { status: 201, data: { access_token: 'a', refresh_token: 'b', type_token: 'c' } }
    })
    Promise.all([authTest.login('a', 'a'), authTest.login('b', 'b')])
    expect(counter_logins).toBe(1)
  })

  it('test one of parallels login is incorrect', async () => {
    mocks.post.mockResolvedValue({ status: 401, detail: IncorrectDataForAuth.message })
    await expect(
      Promise.all([authTest.login('a', 'a'), authTest.login('b', 'b')]),
    ).rejects.toThrowError(IncorrectDataForAuth)
  })

  it('test relogin successed', async () => {
    const current_refresh_token = authTest.get_refresh_token()
    const current_authoriztion_header = authTest.get_authorization_header()
    const SOME_ACCESS_TOKEN = 'some_access_token'
    const OTHER_REFRESH_TOKEN = 'other_refresh_token'
    const TOKEN_TYPE = 'token_type'

    mocks.post.mockResolvedValue({
      status: 201,
      data: {
        access_token: SOME_ACCESS_TOKEN,
        refresh_token: OTHER_REFRESH_TOKEN,
        token_type: TOKEN_TYPE,
      },
    })

    await expect(authTest.test_relogin_create_session()).resolves.toBeTruthy()
    expect(current_authoriztion_header).not.toBe(authTest.get_authorization_header())
    expect(current_refresh_token).not.toBe(authTest.get_refresh_token())
    expect(authTest.get_authorization_header()).toBe(`${TOKEN_TYPE} ${SOME_ACCESS_TOKEN}`)
    expect(authTest.get_refresh_token()).toBe(OTHER_REFRESH_TOKEN)
  })

  it('test relogin unsuccessed', async () => {
    mocks.post.mockResolvedValue({
      status: 401,
      detail: 'some text',
    })
    await expect(authTest.test_relogin_unsuccessed()).rejects.toThrowError(IncorrectDataForAuth)
  })

  it('test parallel relogin', async () => {
    mocks.post.mockImplementation(() => {
      counter_relogins++
      return { status: 201, data: { access_token: 'a', refresh_token: 'b', type_token: 'c' } }
    })
    Promise.all([authTest.test_relogin_parallel(), authTest.test_relogin_parallel()])
    expect(counter_relogins).toBe(1)
  })

  it('test one of parallel relogin is incorrect', async () => {
    mocks.post.mockResolvedValue({
      status: 401,
      detail: 'some text',
    })
    await expect(Promise.all([authTest.test_relogin_parallel(), authTest.test_relogin_parallel()]))
      .rejects
      .toThrowError(IncorrectDataForAuth)
  })
})
