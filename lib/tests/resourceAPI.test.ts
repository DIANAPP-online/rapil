import axios, { AxiosError } from 'axios'
import { describe, expect, vi } from 'vitest'
import { OAuth2 } from '../authenticator'
import { RequestBuilder } from '../requestBuilder'
import { ResourceAPI } from '../resourceAPI'
import { ResourceSession } from '../session'

class APITest extends ResourceAPI {
  public async test_try_load_data() {
    return await this.try_load_data('load_json', 'some id', true)
  }

  public async create_request_builder(): Promise<RequestBuilder> {
    return await new RequestBuilder('/e', new ResourceSession(axios.create()))
  }
}

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('axios', async (importActual) => {
  const actual = await importActual<typeof import ('axios')>()

  const mockAxios = {
    AxiosError: actual.AxiosError,
    isAxiosError: actual.isAxiosError,
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

const auth = new OAuth2('/e', 'https://')
const api_test = new APITest(auth, '/endpoint')

describe('test resource api', () => {
  it('test try load data successed', async () => {
    mocks.get.mockResolvedValue({
      status: 201,
      data: {
        name: 'strings',
      },
    })
    await expect(api_test.test_try_load_data()).resolves.toStrictEqual({ name: 'strings' })
  })

  it('test try load data two calls then first call unsuccessed', async () => {
    mocks.get.mockRejectedValueOnce(function () {
      const error = new AxiosError()
      error.status = 401
      return error
    }())

    await expect(api_test.test_try_load_data()).resolves.toStrictEqual({ name: 'strings' })
  })

  it('test try load data two calls then all calls unsuccessed', async () => {
    mocks.get.mockRejectedValue(function () {
      const error = new AxiosError()
      error.status = 401
      return error
    }())

    await expect(api_test.test_try_load_data()).rejects.toThrowError(AxiosError)
  })
})
