/**
 * 战地游戏中文ID生成算法 - TypeScript版本
 */

const MASK32 = 0xffffffff;
const GAP = 4294967296; // 2^32
const WEIGHTS = [33 ** 6, 33 ** 5, 33 ** 4, 33 ** 3, 33 ** 2, 33 ** 1, 33 ** 0]; // [33^6, 33^5, ..., 33^0]

/**
 * 编码前缀字符串
 */
function encodePrefix(s: string): number {
  s = s + '0000000';
  let res = 0;
  for (const ch of s) {
    res = ((res * 33) & MASK32) + (ch.charCodeAt(0) - 32);
  }
  return (res - 1) & MASK32;
}

/**
 * 编码目标哈希值
 */
function encodeTarget(s: string): number {
  return parseInt(s, 16) & MASK32;
}

/**
 * 验证生成的ID是否正确
 */
function validateResult(fullId: string, target: number): boolean {
  let h = 0;
  for (const ch of fullId) {
    h = ((h * 33) & MASK32) + (ch.charCodeAt(0) - 32);
  }
  h = (h - 1) & MASK32;
  return h === target;
}

/**
 * 错误代码枚举
 */
export enum BattlefieldIdErrorCode {
  INVALID_INIT = 'INVALID_INIT',
  INVALID_TARGET = 'INVALID_TARGET',
  INVALID_HEX_TARGET = 'INVALID_HEX_TARGET',
  INVALID_MAX_ITERATIONS = 'INVALID_MAX_ITERATIONS',
  INVALID_MAX_SOLUTIONS = 'INVALID_MAX_SOLUTIONS',
  ENCODING_ERROR = 'ENCODING_ERROR',
  MAX_ITERATIONS_EXCEEDED = 'MAX_ITERATIONS_EXCEEDED',
  ITERATION_ERROR = 'ITERATION_ERROR',
}

/**
 * 错误详情接口
 */
export interface ErrorDetails {
  init?: string;
  target?: string;
  maxIterations?: number;
  maxSolutions?: number;
  iterations?: number;
  error?: string;
  iteration?: number;
}

/**
 * 战地ID计算错误类
 */
export class BattlefieldIdError extends Error {
  public readonly code: BattlefieldIdErrorCode;
  public readonly details: ErrorDetails | undefined;

  constructor(code: BattlefieldIdErrorCode, message: string, details?: ErrorDetails) {
    super(message);
    this.name = 'BattlefieldIdError';
    this.code = code;
    this.details = details;

    // 确保正确的原型链
    Object.setPrototypeOf(this, BattlefieldIdError.prototype);
  }
}

/**
 * 计算结果接口
 */
export interface CalculationResult {
  id: string;
  init: string;
  target: string;
  clan: string | undefined;
  iterations: number;
}

export interface CalculateBattlefieldIdOptions {
  maxIterations?: number;
  maxSolutions?: number;
}

/**
 * 主要计算函数 - 生成符合要求的战地游戏ID (异步版本)
 * @param init 初始字符串（前缀）
 * @param target 目标哈希值（16进制字符串）
 * @param clan 可选的战队标签
 * @param options 配置项，包括最大迭代次数与最大解数量
 * @returns Promise<CalculationResult[]> 包含计算结果数组的Promise
 */
export function calculateBattlefieldId(
  init: string,
  target: string,
  clan?: string,
  options?: CalculateBattlefieldIdOptions,
): Promise<CalculationResult[]> {
  return new Promise((resolve, reject) => {
    // 参数验证
    if (!init && init !== '') {
      reject(
        new BattlefieldIdError(BattlefieldIdErrorCode.INVALID_INIT, '初始字符串参数无效', { init }),
      );
      return;
    }

    if (!target) {
      reject(
        new BattlefieldIdError(BattlefieldIdErrorCode.INVALID_TARGET, '目标哈希值参数无效', {
          target,
        }),
      );
      return;
    }

    // 验证target是否为有效的16进制字符串
    if (!/^[0-9A-Fa-f]+$/.test(target)) {
      reject(
        new BattlefieldIdError(
          BattlefieldIdErrorCode.INVALID_HEX_TARGET,
          '目标哈希值必须是有效的16进制字符串',
          { target },
        ),
      );
      return;
    }

    const maxIterations = options?.maxIterations ?? 20;
    const maxSolutions = options?.maxSolutions ?? 1;

    // 验证maxIterations参数
    if (maxIterations <= 0 || !Number.isInteger(maxIterations)) {
      reject(
        new BattlefieldIdError(
          BattlefieldIdErrorCode.INVALID_MAX_ITERATIONS,
          '最大迭代次数必须是正整数',
          { maxIterations },
        ),
      );
      return;
    }

    if (maxSolutions <= 0 || !Number.isInteger(maxSolutions)) {
      reject(
        new BattlefieldIdError(
          BattlefieldIdErrorCode.INVALID_MAX_SOLUTIONS,
          '最大解数量必须是正整数',
          { maxSolutions },
        ),
      );
      return;
    }

    const forbidden = new Set([12, 13, 45, 46]);
    const originalInit = init;

    if (clan) {
      init = `[${clan}]` + init;
    }

    console.log(`前缀: ${init} \n目标Hash: ${target} \nclan: ${clan}`);

    let initVal: number;
    let targetVal: number;

    try {
      initVal = encodePrefix(init);
      targetVal = encodeTarget(target);
    } catch (error) {
      reject(
        new BattlefieldIdError(BattlefieldIdErrorCode.ENCODING_ERROR, '编码过程中发生错误', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return;
    }

    let difference = targetVal - initVal;
    if (difference < 0) {
      difference = difference + GAP; // 确保difference非负
    }

    // 使用setTimeout实现异步处理，避免阻塞UI
    const solutions: CalculationResult[] = [];

    const processIteration = (iter: number) => {
      setTimeout(() => {
        if (iter >= maxIterations) {
          if (solutions.length > 0) {
            resolve(solutions);
          } else {
            reject(
              new BattlefieldIdError(
                BattlefieldIdErrorCode.MAX_ITERATIONS_EXCEEDED,
                '未能在合理次数内找到合法解，请换个前缀/目标中文id',
                { iterations: iter, maxIterations },
              ),
            );
          }
          return;
        }

        try {
          let remainingValue = difference;
          const coefficients: number[] = [];

          for (const weight of WEIGHTS) {
            const coefficient = Math.floor(remainingValue / weight);
            coefficients.push(coefficient);
            remainingValue = remainingValue % weight;
          }

          if (coefficients.some((c) => forbidden.has(c))) {
            difference = difference + GAP; // 加一个GAP再重算
            processIteration(iter + 1);
            return;
          }

          // 合并纠错逻辑
          try {
            let isZero = false;

            function carryBackward(pos: number): boolean {
              if (pos === 6 || pos >= coefficients.length - 1) {
                return true;
              }
              const currentCoeff = coefficients[pos];
              if (currentCoeff === undefined) {
                return true;
              }
              if (currentCoeff === 10 || currentCoeff === 11) {
                coefficients[pos + 1] = (coefficients[pos + 1] ?? 0) + 33 * (currentCoeff - 9);
                coefficients[pos] = 9;
              } else if (currentCoeff === 43 || currentCoeff === 44) {
                coefficients[pos + 1] = (coefficients[pos + 1] ?? 0) + 33 * (currentCoeff - 42);
                coefficients[pos] = 42;
              } else if (currentCoeff === 48) {
                coefficients[pos + 1] = (coefficients[pos + 1] ?? 0) + 33;
                coefficients[pos] = 47;
              } else {
                coefficients[pos + 1] = (coefficients[pos + 1] ?? 0) + 33 * (currentCoeff - 74);
                coefficients[pos] = 74;
              }
              return false;
            }

            function carryForward(pos: number): boolean {
              if (pos === 0 || pos >= coefficients.length) {
                return true;
              }
              const prevCoeff = coefficients[pos - 1];
              const currentCoeff = coefficients[pos];
              if (prevCoeff === undefined || currentCoeff === undefined) {
                return true;
              }
              coefficients[pos - 1] = prevCoeff - 1;
              coefficients[pos] = currentCoeff + 33;
              if (coefficients[pos - 1] === -1) {
                isZero = true;
              }
              return false;
            }

            function carryForwardWithBackward(pos: number): boolean {
              if (pos === 0 || pos === 6 || pos >= coefficients.length - 1) {
                return true;
              }
              const nextCoeff = coefficients[pos + 1];
              const prevCoeff = coefficients[pos - 1];
              if (nextCoeff === undefined || prevCoeff === undefined || nextCoeff >= 44) {
                return true;
              }
              coefficients[pos + 1] = nextCoeff + 33;
              coefficients[pos - 1] = prevCoeff - 1;
              coefficients[pos] = 47;
              if (coefficients[pos - 1] === -1) {
                isZero = true;
              }
              return false;
            }

            while (true) {
              let adjustmentFailed = false;
              for (let i = 0; i < 7 && i < coefficients.length; i++) {
                const coefficient = coefficients[i];
                if (coefficient === undefined) {
                  // 系数未定义，跳到下一次迭代
                  difference = difference + GAP;
                  processIteration(iter + 1);
                  return;
                }
                if (forbidden.has(coefficient) || coefficient >= 77) {
                  // 不应出现gap调整分支，直接跳到下一次迭代
                  difference = difference + GAP;
                  processIteration(iter + 1);
                  return;
                }
                if (coefficient >= 75 || [10, 11, 43, 44, 48].includes(coefficient)) {
                  adjustmentFailed = carryBackward(i);
                } else if ([14, 16].includes(coefficient)) {
                  adjustmentFailed = carryForward(i);
                } else if (coefficient === 15) {
                  adjustmentFailed = carryForwardWithBackward(i);
                }
                if (adjustmentFailed) {
                  // 纠错失败，尝试下一次迭代
                  difference = difference + GAP;
                  processIteration(iter + 1);
                  return;
                }
              }
              if (!isZero) {
                break;
              }
              isZero = false;
              for (let i = 0; i < 7 && i < coefficients.length; i++) {
                const coefficient = coefficients[i];
                if (coefficient === -1) {
                  if (i === 0) {
                    // 纠错失败，首位为-1，尝试下一次迭代
                    difference = difference + GAP;
                    processIteration(iter + 1);
                    return;
                  } else {
                    carryForward(i);
                  }
                }
              }
            }

            // 最终检查
            for (let i = 0; i < 7 && i < coefficients.length; i++) {
              const coefficient = coefficients[i];
              if (coefficient === undefined) {
                // 系数未定义，跳到下一次迭代
                difference = difference + GAP;
                processIteration(iter + 1);
                return;
              }
              if (
                (10 <= coefficient && coefficient <= 16) ||
                (43 <= coefficient && coefficient <= 46) ||
                coefficient === 48 ||
                coefficient >= 75
              ) {
                // 纠错失败，仍有非法字符，尝试下一次迭代
                difference = difference + GAP;
                processIteration(iter + 1);
                return;
              }
            }

            const correctedChars = coefficients.map((c) => {
              if (c === undefined) {
                return String.fromCharCode(48); // 默认为'0'
              }
              return String.fromCharCode(48 + c);
            });
            const correctedString = correctedChars.join('');

            const isValid = validateResult(init + correctedString, targetVal);
            if (isValid) {
              const generatedId = init + correctedString;
              console.log(`找到合法解: ${generatedId}`);
              const alreadyExists = solutions.some((solution) => solution.id === generatedId);
              if (!alreadyExists) {
                solutions.push({
                  id: generatedId,
                  init: originalInit,
                  target,
                  clan,
                  iterations: iter + 1,
                });
              }
              if (solutions.length >= maxSolutions) {
                resolve(solutions);
                return;
              }
            } else {
              console.log('纠错后结果校验失败，尝试加gap重算');
            }
            difference = difference + GAP;
            processIteration(iter + 1);
            return;
          } catch (correctionError: unknown) {
            const errorMessage =
              correctionError instanceof Error ? correctionError.message : String(correctionError);
            console.log(`纠错失败: ${errorMessage}, 尝试加gap重算`);
            difference = difference + GAP;
            processIteration(iter + 1);
            return;
          }
        } catch (iterationError) {
          reject(
            new BattlefieldIdError(
              BattlefieldIdErrorCode.ITERATION_ERROR,
              '计算迭代过程中发生错误',
              {
                error:
                  iterationError instanceof Error ? iterationError.message : String(iterationError),
                iteration: iter,
              },
            ),
          );
          return;
        }
      }, 0); // 使用setTimeout(fn, 0)实现异步
    };

    // 开始第一次迭代
    processIteration(0);
  });
}

// 使用示例：
// calculateBattlefieldId("", "00B91163")
//   .then((result) => {
//     console.log("计算成功:", result);
//   })
//   .catch((error: BattlefieldIdError) => {
//     console.error("计算失败:", error.code, error.message);
//   });
//
// 或者使用 async/await:
// try {
//   const result = await calculateBattlefieldId("玩家名", "00B91163", "战队");
//   console.log("生成的ID:", result.id);
// } catch (error) {
//   console.error("错误:", (error as BattlefieldIdError).message);
// }
//
// 自定义最大迭代次数:
// try {
//   const result = await calculateBattlefieldId("玩家名", "00B91163", "战队", 50);
//   console.log("生成的ID:", result.id);
//   console.log("实际迭代次数:", result.iterations);
// } catch (error) {
//   console.error("错误:", (error as BattlefieldIdError).message);
// }
//
// 使用枚举进行错误处理:
// try {
//   const result = await calculateBattlefieldId("玩家名", "00B91163", "战队", 50);
//   console.log("生成的ID:", result.id);
// } catch (error) {
//   const err = error as BattlefieldIdError;
//   switch (err.code) {
//     case BattlefieldIdErrorCode.INVALID_INIT:
//       console.error("初始字符串无效");
//       break;
//     case BattlefieldIdErrorCode.INVALID_HEX_TARGET:
//       console.error("目标哈希值格式错误");
//       break;
//     case BattlefieldIdErrorCode.MAX_ITERATIONS_EXCEEDED:
//       console.error(`超过最大迭代次数 ${err.details.maxIterations}`);
//       break;
//     default:
//       console.error("未知错误:", err.message);
//   }
// }
