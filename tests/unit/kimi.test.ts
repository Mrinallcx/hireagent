import { beforeEach, describe, expect, it, vi } from "vitest"

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }))

vi.mock("undici", () => ({
  Agent: class {},
  fetch: fetchMock,
}))

import { kimiWebSearch } from "../../agent/lib/kimi-client"

function kimiStop(content: string) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ finish_reason: "stop", message: { role: "assistant", content } }],
    }),
  }
}

describe("kimiWebSearch", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    process.env.KIMI_API_KEY = "test-key"
  })

  it("parses findings and keeps only https sources (dedupe)", async () => {
    const payload = JSON.stringify({
      findings: "BTC is up 2%",
      sources: [
        { title: "Good", url: "https://good.com", type: "news" },
        { title: "Dupe", url: "https://good.com", type: "news" },
        { title: "Insecure", url: "http://bad.com", type: "news" },
      ],
    })
    fetchMock.mockResolvedValueOnce(kimiStop(payload))

    const result = await kimiWebSearch("BTC price")
    expect(result.findings).toBe("BTC is up 2%")
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0].url).toBe("https://good.com")
  })

  it("runs the search loop then returns the final payload", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              finish_reason: "tool_calls",
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "c1",
                    type: "function",
                    function: { name: "$web_search", arguments: '{"q":"btc"}' },
                  },
                ],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce(
        kimiStop(JSON.stringify({ findings: "done", sources: [
          { title: "a", url: "https://a.com", type: "data" },
        ] }))
      )

    const result = await kimiWebSearch("BTC price")
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.findings).toBe("done")
  })

  it("throws on a non-ok response", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => "boom" })
    await expect(kimiWebSearch("BTC")).rejects.toThrow(/Kimi API 500/)
  })
})
