import axios from "axios";
import { describe, expect, test, vi } from "vitest";

const BASE_URL = 'https://www.google.com'

const fetchUsers = async () => {
  return (await axios.get(`${BASE_URL}/users`)).data
}

vi.mock('axios', () => {
  return {
    default: {
      post: vi.fn(),
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

describe('Session Requests', () => {
  describe('fetchUsers', () => {
    test('makes a GET request', async () => {
      const users = await fetchUsers()

      expect(axios.get).toHaveBeenCalledWith('https://www.google.com/users')
      expect(users).toStrictEqual([{ id: 1 }, { id: 2 }])
    })
  })
})
