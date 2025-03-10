import { OAuth2 } from "../authenticator";
import { vi, describe, test, expect } from 'vitest' 

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function send_hello() {
  await sleep(100)
  return { access_token: '1', refresh_token: '2', token_type: 'b' }
}

vi.mock('axios', () => {
  return {
    default: {
      post: vi.fn().mockImplementation(() => send_hello()),
      get: vi.fn().mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }],
      }),
      delete: vi.fn(),
      put: vi.fn(),
      create: vi.fn().mockReturnThis(),
      interceptors: {
        request: {
          use: vi.fn(),
          eject: vi.fn(),
        },
        response: {
          use: vi.fn(),
          eject: vi.fn(),
        },
      },
    },
  };
});

class AuthTest extends OAuth2 {
  public async test_login_successed() {
    await this.login('username', 'password')
    return Boolean(this.api.defaults.headers.common["Authorization"]) 
  }
}

const authTest = new AuthTest('/', 'https://')

describe('Authenticator tests', () => {
  test('test login successed', async () => {
    await expect(authTest.test_login_successed()).toBeTruthy()
  })
})
