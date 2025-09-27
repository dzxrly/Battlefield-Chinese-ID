import React, { useEffect, useMemo, useState } from "react";

// --- Helpers ---------------------------------------------------------------
const GAMES = [
  { key: "bf1", name: "战地1 (BF1)", file: "/data/bf1.txt", note: "（简体输入→繁体检索）" },
  { key: "bf5", name: "战地5 (BFV)", file: "/data/bf5.txt", note: "" },
  { key: "bf2042", name: "战地2042", file: "/data/bf2042.txt", note: "" },
];
const API_BASE = "";

function classNames(...xs) { return xs.filter(Boolean).join(" "); }

function parseTable(text) {
  // 行格式：HEX\t中文文本
  const rows = [];
  text.split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t) return;
    const [hex, ...rest] = t.split(/\t+/);
    if (!hex || rest.length === 0) return;
    const value = rest.join(" ").trim();
    rows.push({ hex: hex.trim(), text: value });
  });
  return rows;
}

function useOpenCCForBF1() {
  const [convert, setConvert] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const mod = await import(
         /* webpackIgnore: true */
          "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/esm/cn2t.js"
        );
       // opencc-js 的 API：创建转换器，然后直接同步转换字符串
        const converter = mod.Converter({ from: "cn", to: "t" });
       // 统一成 Promise 接口，便于你现有的 await 调用
        setConvert(() => (s) => Promise.resolve(converter(String(s || ""))));
        setReady(true);
      } catch (e) {
        console.warn("OpenCC 加载失败，BF1 简繁检索将降级为普通搜索", e);
        setConvert(null);
        setReady(false);
      }
    })();
    return () => { aborted = true; };
  }, []);
  return { convert, ready };
}


// --- Main Component --------------------------------------------------------
export default function App() {
  const [activeGame, setActiveGame] = useState(GAMES[0].key);
  const [tables, setTables] = useState({}); // { bf1: [{hex,text}], ... }
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});

  const [init, setInit] = useState("");     // prefix up to 7 chars
  const [target, setTarget] = useState(""); // uppercase hex
  const [clan, setClan] = useState("");     // optional
  const [calcRes, setCalcRes] = useState(null);
  const [calcBusy, setCalcBusy] = useState(false);

  const [search, setSearch] = useState("");
  const { convert: s2t, ready: openccReady } = useOpenCCForBF1();

  // Load tables when switching tabs
  useEffect(() => {
    const game = GAMES.find((g) => g.key === activeGame);
    if (!game) return;
    if (tables[game.key] || loading[game.key]) return;

    setLoading((m) => ({ ...m, [game.key]: true }));
    fetch(game.file)
      .then((r) => {
        if (!r.ok) throw new Error(`${game.file} 加载失败：${r.status}`);
        return r.text();
      })
      .then((text) => {
        const rows = parseTable(text);
        setTables((m) => ({ ...m, [game.key]: rows }));
        setError((m) => ({ ...m, [game.key]: null }));
      })
      .catch((e) => setError((m) => ({ ...m, [game.key]: String(e) })))
      .finally(() => setLoading((m) => ({ ...m, [game.key]: false })));
  }, [activeGame]);

  // Filter logic (BF1: 简体输入 -> 繁体匹配)
  const [bf1ConvertedQuery, setBf1ConvertedQuery] = useState("");
  useEffect(() => {
    (async () => {
      if (activeGame === "bf1" && s2t && search) {
        try {
          const t = await s2t(search);
          setBf1ConvertedQuery(t);
        } catch {
          setBf1ConvertedQuery("");
        }
      } else {
        setBf1ConvertedQuery("");
      }
    })();
  }, [search, activeGame, s2t]);

  const filteredRows = useMemo(() => {
    const rows = tables[activeGame] || [];
    if (!search) return rows;
    const q = search.trim().toLowerCase();
    const qHant = activeGame === "bf1" && bf1ConvertedQuery ? bf1ConvertedQuery.trim() : null;
    return rows.filter(({ hex, text }) => {
      const hexHit = hex.toLowerCase().includes(q);
      if (activeGame === "bf1") {
        const textLC = text.toLowerCase();
        return (
          hexHit ||
          textLC.includes(q) ||
          (qHant ? textLC.includes(qHant.toLowerCase()) : false)
        );
      }
      return hexHit || text.toLowerCase().includes(q);
    });
  }, [tables, activeGame, search, bf1ConvertedQuery]);

  // Pagination (client-side)
  const [page, setPage] = useState(1);
  const pageSize = 100; // 每页显示 100 条
  useEffect(() => { setPage(1); }, [activeGame, search]);
  const pageCount = Math.max(1, Math.ceil((filteredRows?.length || 0) / pageSize));
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  // Handlers
  const onTargetChange = (v) => {
    const cleaned = v.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
    setTarget(cleaned);
  };

  const applyHex = (hex) => {
    const cleaned = (hex || "").toString().replace(/[^0-9a-fA-F]/g, "").toUpperCase();
    setTarget(cleaned);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) {}
  };

  // === Debug-capable doCalc ===
  const DEBUG = true; // 需要时改为 false 可关闭调试打印

  const doCalc = async () => {
    setCalcRes(null);

    if (!target) {
      alert("请输入 target（十六进制哈希值）");
      return;
    }
    if (!/^[0-9A-F]+$/.test(target)) {
      alert("target 需为纯十六进制且大写，例如 00B91163");
      return;
    }
    if (init.length > 7 || !/^[A-Za-z0-9_-]*$/.test(init)) {
      alert("init 仅允许字母/数字/下划线/中横线，且最长 7 位");
      return;
    }

    try {
      setCalcBusy(true);
      const url = new URL(API_BASE);
      url.searchParams.set("init", init || "");
      url.searchParams.set("target", target);
      url.searchParams.set("clan", clan || ""); // 避免传 null

      if (DEBUG) {
        console.group("[CALID] 请求");
        console.time("[CALID] 耗时");
        console.log("GET", url.toString());
      }

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const contentType = (res.headers.get("content-type") || "").toLowerCase();

      if (DEBUG) {
        console.log("收到响应:", {
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          contentType,
        });
      }

      // 读取原始文本，方便观察 server 实际返回
      const text = await res.text();
      if (DEBUG) console.log("原始文本 body:", text.slice(0, 1000));

      let body;
      try {
        // 尝试 JSON.parse（即使是 text/plain 也能 parse 成对象）
        body = JSON.parse(text);
        if (DEBUG) console.log("JSON 解析成功:", body);
      } catch (e) {
        body = { raw: text };
        if (DEBUG) console.warn("JSON 解析失败，保留原始文本。错误：", e);
      }

      if (!res.ok) {
        setCalcRes({
          ok: false,
          data: {
            status: res.status,
            statusText: res.statusText,
            contentType,
            body,
          },
        });
      } else {
        setCalcRes({ ok: true, data: body });
      }

      if (DEBUG) {
        console.timeEnd("[CALID] 耗时");
        console.groupEnd();
      }
    } catch (e) {
      if (DEBUG) console.error("请求异常:", e);
      setCalcRes({
        ok: false,
        data: {
          error: String(e),
          hint: "若是 Failed to fetch，多半为 CORS/网络问题；可用 Vite 代理或服务端开启 CORS。",
        },
      });
    } finally {
      setCalcBusy(false);
    }
  };

  const activeMeta = GAMES.find((g) => g.key === activeGame);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Battlefield 中文 ID 计算器</h1>
          <p className="text-sm text-slate-600">支持战地1 / 战地5 / 战地2042。每个游戏有独立哈希表；BF1 支持“简体输入→繁体检索”。</p>

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium mb-1">init（自定义前缀，可为空，最多 7 位）</label>
              <input
                value={init}
                onChange={(e) => {
                  const raw = e.target.value;
                  // 只保留 A-Z a-z 0-9 _ -
                  const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 7);
                  setInit(cleaned);
                }}
                placeholder="例如：BilITV-"
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[220px] w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">target（目标哈希值，十六进制）</label>
              <input
                value={target}
                onChange={(e) => onTargetChange(e.target.value)}
                placeholder="例如：00B91163"
                className="border rounded-xl px-3 py-2 tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[300px] w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                clan（战排，可为空）
                {activeGame === "bf2042" && (
                  <span className="ml-2 text-amber-600">（战地2042不支持战排）</span>
                )}
              </label>
              <input
                value={clan}
                onChange={(e) => {
                  if (activeGame === "bf2042") return;           // 2042 不可编辑
                  setClan(e.target.value.slice(0, 4));           // BF1/BFV 最多 4 位
                }}
                placeholder={
                  activeGame === "bf2042" ? "战地2042不支持战排" : "输入你要代表的战排"
                }
                maxLength={activeGame === "bf2042" ? undefined : 4}
                disabled={activeGame === "bf2042"}
                className="border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[220px] w-full disabled:opacity-50 disabled:cursor-not-allowed"
                aria-disabled={activeGame === "bf2042"}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={doCalc}
                disabled={calcBusy}
                className={classNames(
                  "h-10 rounded-xl px-4 font-medium",
                  calcBusy ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-700 text-white"
                )}
              >
                计算
              </button>

              <select
                value={activeGame}
                onChange={(e) => setActiveGame(e.target.value)}
                className="h-10 rounded-xl border px-2"
              >
                {GAMES.map((g) => (
                  <option key={g.key} value={g.key}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {calcRes && (
            <div className={classNames(
              "rounded-2xl border p-3",
              calcRes.ok ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"
            )}>
              <div className="text-sm font-medium mb-2">计算结果</div>

              {calcRes.ok ? (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-slate-600">最终中文ID：</div>
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border font-mono text-lg">
                    {String((calcRes.data && calcRes.data.result) || "")}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-rose-700">
                  请求失败：
                  {String(
                    (calcRes.data && (calcRes.data.error || calcRes.data.statusText)) ||
                    "未知错误"
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-24 pt-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          {GAMES.map((g) => (
            <button
              key={g.key}
              onClick={() => setActiveGame(g.key)}
              className={classNames(
                "rounded-2xl px-4 py-2 border text-sm",
                activeGame === g.key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white hover:bg-slate-100"
              )}
            >
              {g.name} <span className="opacity-70">{g.note}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索 HEX 或中文…（BF1 支持简体→繁体匹配）"
            className="flex-1 border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {activeGame === "bf1" && (
            <div className="text-xs text-slate-600">
              简繁转换：{openccReady ? <span className="text-emerald-600">已启用</span> : <span className="text-amber-600">未启用（降级为普通搜索）</span>}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl border overflow-hidden bg-white">
          <div className="grid grid-cols-12 px-3 py-2 text-xs font-semibold bg-slate-50 border-b">
            <div className="col-span-3">HEX</div>
            <div className="col-span-8">中文文本</div>
            <div className="col-span-1 text-right">操作</div>
          </div>

          {loading[activeGame] && (
            <div className="p-6 text-sm text-slate-600">正在加载 {activeMeta?.name} 哈希表…</div>
          )}

          {error[activeGame] && (
            <div className="p-6 text-sm text-rose-600">加载失败：{error[activeGame]}</div>
          )}

          {!loading[activeGame] && !error[activeGame] && (
            <div className="max-h-[60vh] overflow-auto divide-y">
              {pageRows.map((r, i) => (
                <div key={`${r.hex}-${i}`} className="grid grid-cols-12 px-3 py-2 text-sm items-center">
                  <div className="col-span-3 font-mono text-slate-700">{r.hex}</div>
                  <div className="col-span-8 whitespace-pre-wrap break-words">{r.text}</div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => applyHex(r.hex)}
                      className="px-2 py-1 text-xs rounded-lg border bg-white hover:bg-slate-50"
                    >
                      应用
                    </button>
                  </div>
                </div>
              ))}
              {filteredRows.length === 0 && (
                <div className="p-6 text-sm text-slate-500">没有匹配的结果。</div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div>共 <b>{filteredRows.length}</b> 条；第 <b>{page}</b>/<b>{pageCount}</b> 页</div>
          <div className="flex gap-2">
            <button onClick={() => setPage(1)} disabled={page === 1}
                    className="px-3 py-1 rounded-lg border bg-white disabled:opacity-40">« 首页</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1 rounded-lg border bg-white disabled:opacity-40">‹ 上一页</button>
            <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}
                    className="px-3 py-1 rounded-lg border bg-white disabled:opacity-40">下一页 ›</button>
            <button onClick={() => setPage(pageCount)} disabled={page === pageCount}
                    className="px-3 py-1 rounded-lg border bg-white disabled:opacity-40">末页 »</button>
          </div>
        </div>
      </main>
    </div>
  );
}
