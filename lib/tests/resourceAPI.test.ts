import { OAuth2 } from '../authenticator';
import { RequestBuilder } from '../requestBuilder';
import { ResourceSession } from '../session';
import { ResourceAPI } from '../resourceAPI';
import { vi, describe, test, expect } from 'vitest'
import axios from 'axios';

class APITest extends ResourceAPI {
  public async test_try_load_data() {
    return await this.try_load_data("load_json", 'some id', true)
  }

  public async create_request_builder(): Promise<RequestBuilder> {
    return await new RequestBuilder('/e', new ResourceSession(axios.create()))
  }
}

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

const auth = new OAuth2('/e', 'https://')
const api_test = new APITest(auth, '/endpoint')

describe('test resource api', () => {
  test('test try load data successed', async () => {
    mocks.get.mockResolvedValue({
      status: 201,
      data: {
        name: "string"
      }
    })
    await expect(api_test.test_try_load_data()).resolves.toStrictEqual({ name: "string" })
  })
})
