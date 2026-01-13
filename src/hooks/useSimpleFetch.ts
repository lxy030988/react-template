/**
 * fp-ts + fetch 请求 Hook - 简易学习版
 *
 * 这个文件用于学习 fp-ts 的核心概念
 * 每个概念都有详细的注释说明
 */

import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { useCallback, useState } from "react"

// ============================================================================
// 第一课：Either - 表示可能失败的值
// ============================================================================

/**
 * Either<E, A> 是一个联合类型，表示两种可能：
 * - Left(E): 失败情况，包含错误
 * - Right(A): 成功情况，包含值
 *
 * 类似于：type Either<E, A> = { _tag: 'Left', left: E } | { _tag: 'Right', right: A }
 *
 * 为什么用 Either 而不是 try-catch？
 * 1. 类型安全：错误类型在编译时可知
 * 2. 强制处理：必须处理错误情况
 * 3. 可组合：可以链式处理多个可能失败的操作
 */

// 定义我们的错误类型
type SimpleError = { message: string; code?: number }

// ============================================================================
// 第二课：TaskEither - 异步的 Either
// ============================================================================

/**
 * TaskEither<E, A> = () => Promise<Either<E, A>>
 *
 * 它是一个返回 Promise<Either> 的函数（惰性求值）
 * - Task: 表示异步计算
 * - Either: 表示可能失败
 *
 * 组合起来：TaskEither 表示 "一个可能失败的异步计算"
 */

// ============================================================================
// 第三课：pipe - 函数组合
// ============================================================================

/**
 * pipe 让我们从左到右组合函数
 *
 * pipe(a, f, g, h) 等价于 h(g(f(a)))
 *
 * 好处：
 * 1. 可读性：数据流向清晰
 * 2. 类型推断：TypeScript 可以自动推断类型
 *
 * @example
 * // 传统写法
 * const result = h(g(f(a)))
 *
 * // pipe 写法
 * const result = pipe(a, f, g, h)
 */

// ============================================================================
// 实现：简单的 fetch 封装
// ============================================================================

/**
 * 将 fetch 包装成 TaskEither
 *
 * TE.tryCatch 接受两个参数：
 * 1. 一个返回 Promise 的函数（正常操作）
 * 2. 一个错误处理函数（当 Promise reject 时调用）
 */
const safeFetch = (
	url: string,
	init?: RequestInit,
): TE.TaskEither<SimpleError, Response> =>
	TE.tryCatch(
		// 正常的 fetch 调用
		() => fetch(url, init),
		// 如果网络错误，转换为我们的错误类型
		(error): SimpleError => ({
			message: error instanceof Error ? error.message : "网络请求失败",
		}),
	)

/**
 * 检查 HTTP 状态码
 *
 * 使用 TE.chain 来串联操作：
 * - 如果前一步成功(Right)，执行下一步
 * - 如果前一步失败(Left)，直接返回错误，跳过后续
 */
const checkStatus = (
	response: Response,
): TE.TaskEither<SimpleError, Response> =>
	response.ok
		? TE.right(response) // 成功：包装成 Right
		: TE.left({
				// 失败：包装成 Left
				message: `HTTP ${response.status}: ${response.statusText}`,
				code: response.status,
			})

/**
 * 解析 JSON
 */
const parseJson = <T>(response: Response): TE.TaskEither<SimpleError, T> =>
	TE.tryCatch(
		() => response.json() as Promise<T>,
		(): SimpleError => ({ message: "JSON 解析失败" }),
	)

/**
 * 组合以上函数，创建完整的请求流程
 *
 * pipe + chain 让我们优雅地处理一系列可能失败的异步操作
 */
const fetchJson = <T>(
	url: string,
	init?: RequestInit,
): TE.TaskEither<SimpleError, T> =>
	pipe(
		safeFetch(url, init), // 步骤1: 发起请求
		TE.chain(checkStatus), // 步骤2: 检查状态 (如果步骤1失败，这步会跳过)
		TE.chain(parseJson<T>), // 步骤3: 解析JSON (如果步骤2失败，这步会跳过)
	)

// ============================================================================
// React Hook 实现
// ============================================================================

type SimpleState<T> =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "success"; data: T }
	| { status: "error"; error: SimpleError }

/**
 * 简易版 fetch hook
 *
 * @example
 * function UserProfile({ userId }: { userId: string }) {
 *   const { state, execute } = useSimpleFetch<User>()
 *
 *   useEffect(() => {
 *     execute(`/api/users/${userId}`)
 *   }, [userId, execute])
 *
 *   // 使用模式匹配处理不同状态
 *   switch (state.status) {
 *     case 'idle':
 *       return <div>点击加载</div>
 *     case 'loading':
 *       return <div>加载中...</div>
 *     case 'error':
 *       return <div>错误: {state.error.message}</div>
 *     case 'success':
 *       return <div>用户名: {state.data.name}</div>
 *   }
 * }
 */
export function useSimpleFetch<T>() {
	const [state, setState] = useState<SimpleState<T>>({ status: "idle" })

	const execute = useCallback(async (url: string, init?: RequestInit) => {
		setState({ status: "loading" })

		// 创建 TaskEither
		const task = fetchJson<T>(url, init)

		// 执行 TaskEither，得到 Either
		const result = await task()

		// 使用 E.fold 处理结果
		// fold 接受两个函数：处理 Left 和处理 Right
		pipe(
			result,
			E.fold(
				// Left 处理器：错误情况
				(error) => setState({ status: "error", error }),
				// Right 处理器：成功情况
				(data) => setState({ status: "success", data }),
			),
		)

		return result
	}, [])

	return { state, execute }
}

// ============================================================================
// 进阶示例：组合多个请求
// ============================================================================

/**
 * 串行请求示例
 *
 * 使用场景：第二个请求依赖第一个请求的结果
 */
export const fetchUserWithPosts = (
	userId: string,
): TE.TaskEither<SimpleError, { user: unknown; posts: unknown[] }> =>
	pipe(
		// 先获取用户
		fetchJson<{ id: string; name: string }>(`/api/users/${userId}`),
		// 然后获取该用户的文章
		TE.chain((user) =>
			pipe(
				fetchJson<unknown[]>(`/api/users/${userId}/posts`),
				// 将两个结果组合
				TE.map((posts) => ({ user, posts })),
			),
		),
	)

/**
 * 并行请求示例
 *
 * 使用 TE.sequenceArray 同时执行多个请求
 */
export const fetchMultipleUsers = (
	userIds: string[],
): TE.TaskEither<SimpleError, unknown[]> => {
	// 创建多个 TaskEither
	const tasks = userIds.map((id) => fetchJson(`/api/users/${id}`))

	// 并行执行所有任务
	// 如果任何一个失败，整体返回 Left
	return TE.sequenceArray(tasks)
}

// ============================================================================
// 学习总结
// ============================================================================

/**
 * fp-ts 核心概念回顾：
 *
 * 1. Either<E, A>
 *    - 表示可能失败的值
 *    - Left = 错误, Right = 成功
 *
 * 2. TaskEither<E, A>
 *    - 异步版本的 Either
 *    - 惰性求值：只有调用 task() 才会执行
 *
 * 3. pipe(a, f, g)
 *    - 函数组合工具
 *    - 从左到右传递数据
 *
 * 4. TE.chain
 *    - 链接多个 TaskEither
 *    - 自动处理错误传播
 *
 * 5. TE.map
 *    - 转换成功值，不影响错误
 *
 * 6. E.fold / TE.fold
 *    - 处理最终结果
 *    - 必须同时处理成功和失败
 *
 * 为什么使用 fp-ts？
 * 1. 类型安全的错误处理
 * 2. 代码更可预测、可测试
 * 3. 强制处理边界情况
 * 4. 函数组合让复杂逻辑更清晰
 */
