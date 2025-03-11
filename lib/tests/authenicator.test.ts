import { OAuth2 } from "../authenticator";
import { vi, describe, test, expect, afterEach } from 'vitest' 
import { IncorrectDataForAuth } from "../types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

let counter = 0

vi.mock('axios', async(importActual) => {
  const actual = await importActual<typeof import ('axios')>();

  const mockAxios = {
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        ...actual.default.create(),
        get: mocks.get,
        post: mocks.post,
      })),
    },
  };

  return mockAxios;
});

class AuthTest extends OAuth2 {
  protected counter: number = 0

  public async test_login_successed() {
    await this.login('username', 'password')
    return this.session.api.defaults.headers["Authorization"] === "b 1"
  }

  public async test_login_incorrectable_data() {
    await this.login('s', 'p')
  }

  public async test_login_counts(a: string, b: string) {
    await this.login(a, b)
    this.counter++
  }
}

const authTest = new AuthTest('/', 'https://')

describe('Authenticator tests', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  test('test login successed', async () => {
    mocks.post.mockResolvedValue({
      data: { access_token: '1', refresh_token: '2', token_type: 'b' }
    })
    await expect(authTest.test_login_successed()).resolves.toBeTruthy()
  })

  test('test login unsuccessed', async () => {
    mocks.post.mockResolvedValue({ status: 401, detail: IncorrectDataForAuth.message })
    await expect(authTest.test_login_incorrectable_data()).rejects.toThrowError(IncorrectDataForAuth.message)
  })

  test('test parallel login', async () => {
    mocks.post.mockImplementation(() => {
      counter++
      return { status: 201, data: { access_token: 'a', refresh_token: 'b', type_token: 'c' } }
    })
    await Promise.all([authTest.login('a', 'a'), authTest.login('b', 'b')])
    expect(counter).toBe(1)
  })
})
