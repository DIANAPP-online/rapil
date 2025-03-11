import { OAuth2 } from "../authenticator";
import { vi, describe, test, expect, afterEach } from 'vitest' 
import { IncorrectDataForAuth } from "../types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

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
  public async test_login_successed() {
    await this.login('username', 'password')
    return this.session.api.defaults.headers["Authorization"] === "b 1"
  }

  public async test_login_incorrectable_data() {
    await this.login('s', 'p')
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
    const error = new IncorrectDataForAuth()
    mocks.post.mockImplementation(() => {
      throw error
    })
    await expect(authTest.test_login_incorrectable_data()).rejects.toThrowError(IncorrectDataForAuth.message)
  })
})
