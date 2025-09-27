# -*- coding: utf-8 -*-
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

MASK32 = 0xFFFFFFFF
FFFF = 2**32
GAP = 4294967296  # 2^32
WEIGHTS = [33**i for i in range(6, -1, -1)]  # [33^6, 33^5, ..., 33^0]

def encode_prefix(s: str) -> int:
    s = s + "0000000"
    res = 0
    for ch in s:
        res = ((res * 33) & MASK32) + (ord(ch) - 32)
    return (res - 1) & MASK32

def encode_target(s: str) -> int:
    return int(s, 16) & MASK32

def validate_result(full_id: str, target: int) -> bool:
    h = 0
    for ch in full_id:
        h = ((h * 33) & MASK32) + (ord(ch) - 32)
    h = (h - 1) & MASK32
    return h == target

def cal(init: str, target: str, weights=WEIGHTS, clan=None) -> str:
    forbidden = {12, 13, 45, 46}

    if clan:
        init = f"[{clan}]" + init
    print(f"前缀: {init} \n目标Hash: {target} \nclan: {clan}")
    init_val = encode_prefix(init)
    tgt_val = encode_target(target)
    dif = tgt_val - init_val
    if dif < 0:
        dif = dif + GAP  # 确保dif非负

    max_iter = 20  # 防止死循环，最多尝试20次

    for _ in range(max_iter):
        remain = dif
        coeffs = []
        for w in weights:
            c = remain // w
            coeffs.append(c)
            remain = remain % w

        if any(c in forbidden for c in coeffs):
            dif = dif + GAP  # 加一个GAP再重算
            continue

        # 合并纠错逻辑
        try:
            n = len(coeffs)
            is_zero = False

            def tuiwei(pos):
                if pos == 6:
                    return True
                if coeffs[pos] == 10 or coeffs[pos] == 11:
                    coeffs[pos+1] += 33 * (coeffs[pos] - 9)
                    coeffs[pos] = 9
                elif coeffs[pos] == 43 or coeffs[pos] == 44:
                    coeffs[pos+1] += 33 * (coeffs[pos] - 42)
                    coeffs[pos] = 42
                elif coeffs[pos] == 48:
                    coeffs[pos+1] += 33
                    coeffs[pos] = 47
                else:
                    coeffs[pos+1] += 33 * (coeffs[pos] - 74)
                    coeffs[pos] = 74
                return False

            def jinwei(pos):
                nonlocal is_zero
                if pos == 0:
                    return True
                coeffs[pos-1] -= 1
                coeffs[pos] += 33
                if coeffs[pos-1] == -1:
                    is_zero = True
                return False

            def jin33tui1(pos):
                nonlocal is_zero
                if pos == 0 or pos == 6 or coeffs[pos+1] >= 44:
                    return True
                coeffs[pos+1] += 33
                coeffs[pos-1] -= 1
                coeffs[pos] = 47
                if coeffs[pos-1] == -1:
                    is_zero = True
                return False

            while True:
                adj_fail = False
                for i in range(7):
                    c = coeffs[i]
                    if c in {12, 13, 45, 46} or c >= 77:
                        raise RuntimeError("不应出现gap调整分支")
                    if c >= 75 or c in {10, 11, 43, 44, 48}:
                        adj_fail = tuiwei(i)
                    elif c in {14, 16}:
                        adj_fail = jinwei(i)
                    elif c == 15:
                        adj_fail = jin33tui1(i)
                    if adj_fail:
                        raise RuntimeError("纠错失败，无法调整为合法字符")
                if not is_zero:
                    break
                is_zero = False
                for i in range(7):
                    if coeffs[i] == -1:
                        if i == 0:
                            raise RuntimeError("纠错失败，首位为-1")
                        else:
                            jinwei(i)
            # 最终检查
            for i in range(7):
                c = coeffs[i]
                if (10 <= c <= 16) or (43 <= c <= 46) or c == 48 or c >= 75:
                    raise RuntimeError("纠错失败，仍有非法字符")
            chars_corr = [chr(48 + c) for c in coeffs]
            chars_corr_str = ''.join(chars_corr)
        except Exception as e:
            print(f"纠错失败: {e}, 尝试加gap重算")
            dif = dif + GAP
            continue

        if validate_result(init + chars_corr_str, tgt_val):
            id_ = init + chars_corr_str
            print(f"找到合法解: {id_}")
            return id_
        else:
            print("纠错后结果校验失败，尝试加gap重算")
            dif = dif + GAP

    raise RuntimeError("未能在合理次数内找到合法解，请换个前缀/目标中文id。")

# cal("", "00B91163")  # 测试用例


app = FastAPI()
# 允许所有来源的跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://battlefield-cnid.jh12.top"],
    allow_credentials=False,         # 一般不需要带 Cookie 就设 False
    allow_methods=["GET", "OPTIONS"],# 你只用 GET 的话就写 GET/OPTIONS 即可
    allow_headers=["*"],
    expose_headers=[],
    max_age=86400,                   # 预检缓存一天
)

@app.get("/api/v1/calid/")
async def cal_api_v1(
    init: str = Query("", description="init string"),
    target: str = Query("", description="target string"),
    clan: str = Query(None, description="clan string")
):
    try:
        result = cal(init, target, clan=clan)
        return JSONResponse({
            'init': init,
            'target': target,
            'clan': clan,
            'result': result
        })
    except Exception as e:
        return JSONResponse({'error': str(e)}, status_code=400)


# def main():
#    import uvicorn
#    uvicorn.run("bfid_api:app", host="127.0.0.1", port=8001, reload=True)

# if __name__ == "__main__":
#    main()
